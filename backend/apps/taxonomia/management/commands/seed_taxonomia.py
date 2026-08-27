"""Semeia os tres eixos da taxonomia com o vocabulario canonico da BDLP v9.

Idempotente: pode rodar em qualquer implantacao, quantas vezes for. Reaplicar
devolve o vocabulario ao canone sem recriar linha nenhuma — o que importa
porque as chaves estrangeiras que vao aponta-lo (ADR 0001) sao PROTECT.

## Proveniencia

Transcrito em 27/08/2026 do clone canonico da Biblioteca Digital,
`~/Developer/Governo/biblioteca-digital-logistica-publica/docker/postgres/init/`:

| Eixo | Fonte |
|---|---|
| Categoria processual | `07-categories.sql` (taxonomia v9, 28/07/2026) |
| Assunto | `06-taxonomia.sql`, secao 2.5 |
| Natureza | `07-natureza.sql` |

A lista canonica esta escrita uma SEGUNDA vez, a' mao, em
`backend/tests/test_taxonomia.py`. E' de proposito: o criterio de pronto da
etapa 1 pede um teste que compare com a lista canonica, e nao com esta
implementacao. Editar o vocabulario aqui e nao la' reprova a suite.

## Duas diferencas conscientes em relacao ao fonte, e por que

1. **Capitalizacao do eixo processual.** Na BDLP os termos vem em caixa alta,
   heranca da interface do Nou-Rau. Aqui seguem a grafia do ADR 0003, que e' a
   que vai para a tela. A identidade e' preservada e provada por teste:
   `nome.upper() == termo_da_bdlp.upper()`. Assunto e natureza vao verbatim —
   inclusive "Catálogo eletrônico" e "Compras Centralizadas/compartilhadas",
   que sao assim na Biblioteca.
2. **Slug unico no produto inteiro.** A BDLP escopa o slug por pai
   (`UNIQUE (slug, category_id)`) porque la ele nao e' rota. Aqui e' chave de
   URL, entao precisa ser global. Os 30 termos nao colidem — ha teste.

O ADR 0003 traz uma tabela resumida do eixo processual que OMITE as cinco
microcategorias de PROCEDIMENTOS AUXILIARES. O fonte da BDLP as tem, e o
criterio de pronto diz "identicos aos da BDLP" — entao elas entram, e o ADR foi
corrigido na mesma sessao.
"""

from __future__ import annotations

from typing import Any

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.taxonomia.models import Assunto, CategoriaProcessual, Natureza, Nivel

# --- Eixo 1: categoria processual -------------------------------------------
#
# Seis macroetapas na ordem da Lei 14.133/2021. `(nome, slug, ordem)`.

MACROETAPAS: list[tuple[str, str, int]] = [
    ("Plano de Contratações Anual (PCA)", "plano-de-contratacoes-anual-pca", 1),
    ("Ciclo Completo da Contratação", "ciclo-completo-da-contratacao", 2),
    ("Planejamento/Fase Preparatória", "planejamento-fase-preparatoria", 3),
    ("Seleção do Fornecedor", "selecao-do-fornecedor", 4),
    ("Gestão Contratual", "gestao-contratual", 5),
    ("Conteúdos Transversais", "conteudos-transversais", 6),
]

# `(nome, slug, slug_do_pai, ordem)`. PCA, Ciclo Completo e Conteudos
# Transversais sao nos folha — Conteudos Transversais desde a v9 (28/07/2026),
# quando as cinco subcategorias derivadas do Assunto sairam.
SUBCATEGORIAS: list[tuple[str, str, str, int]] = [
    ("Fase Preparatória - ETP", "fase-preparatoria-etp", "planejamento-fase-preparatoria", 1),
    ("Fase Preparatória - TR", "fase-preparatoria-tr", "planejamento-fase-preparatoria", 2),
    (
        "Fase Preparatória - Gestão de Riscos",
        "fase-preparatoria-gestao-de-riscos",
        "planejamento-fase-preparatoria",
        3,
    ),
    (
        "Fase Preparatória - Pesquisa de Preços",
        "fase-preparatoria-pesquisa-de-precos",
        "planejamento-fase-preparatoria",
        4,
    ),
    ("Licitação", "licitacao", "selecao-do-fornecedor", 1),
    ("Contratação Direta", "contratacao-direta", "selecao-do-fornecedor", 2),
    ("Procedimentos Auxiliares", "procedimentos-auxiliares", "selecao-do-fornecedor", 3),
    ("Gestão de Contratos", "gestao-de-contratos", "gestao-contratual", 1),
    ("Fiscalização de Contratos", "fiscalizacao-de-contratos", "gestao-contratual", 2),
]

MICROCATEGORIAS: list[tuple[str, str, str, int]] = [
    ("Mapa de Riscos", "mapa-de-riscos", "fase-preparatoria-gestao-de-riscos", 1),
    (
        "Matriz de Alocação de Riscos",
        "matriz-de-alocacao-de-riscos",
        "fase-preparatoria-gestao-de-riscos",
        2,
    ),
    ("Concorrência", "concorrencia", "licitacao", 1),
    ("Pregão", "pregao", "licitacao", 2),
    ("Leilão", "leilao", "licitacao", 3),
    ("Diálogo Competitivo", "dialogo-competitivo", "licitacao", 4),
    ("Inexigibilidade", "inexigibilidade", "contratacao-direta", 1),
    ("Emergência - Inciso VIII", "emergencia-inciso-viii", "contratacao-direta", 2),
    (
        "Dispensa por Valor (Art 75 - incisos I e II)",
        "dispensa-por-valor-art-75",
        "contratacao-direta",
        3,
    ),
    (
        "Contratação Direta outros incisos",
        "contratacao-direta-outros-incisos",
        "contratacao-direta",
        4,
    ),
    ("Credenciamento", "credenciamento", "procedimentos-auxiliares", 1),
    ("Registro de Preços (RP)", "registro-de-precos-rp", "procedimentos-auxiliares", 2),
    ("Pré-qualificação", "pre-qualificacao", "procedimentos-auxiliares", 3),
    ("PMI", "pmi", "procedimentos-auxiliares", 4),
    ("Registro Cadastral", "registro-cadastral", "procedimentos-auxiliares", 5),
]

# --- Eixo 2: assunto --------------------------------------------------------
#
# Verbatim da BDLP, nome e slug. `(nome, slug, ordem)`.

ASSUNTOS_BDLP: list[tuple[str, str, int]] = [
    ("Aspectos Jurídicos e Regulatórios", "aspectos-juridicos-e-regulatorios", 1),
    ("Catálogo eletrônico de Padronização", "catalogo-eletronico-de-padronizacao", 2),
    ("Compras Centralizadas/compartilhadas", "compras-centralizadas-compartilhadas", 3),
    ("Controle, Auditoria e Combate à Corrupção", "controle-auditoria-e-combate-a-corrupcao", 4),
    ("Gestão de Competências", "gestao-de-competencias", 5),
    ("Governança", "governanca", 6),
    ("Inovação e Tecnologia", "inovacao-e-tecnologia", 7),
    ("Integridade", "integridade", 8),
    ("Logística e Gestão de Suprimentos", "logistica-e-gestao-de-suprimentos", 9),
    ("Micro e Pequenas Empresas", "micro-e-pequenas-empresas", 10),
    ("Sanções Administrativas", "sancoes-administrativas", 11),
    ("Sustentabilidade e ODS", "sustentabilidade-e-ods", 12),
    ("Transparência", "transparencia", 13),
    ("Uso de Sistemas", "uso-de-sistemas", 14),
]

# Os cinco termos pedidos pela Lina na DESCRICAO RECPSP (31/03/2026), sem
# equivalente na BDLP. Marcados com origem propria porque a pergunta 18 do
# `docs/QUESTIONS.md` segue aberta: eles descrevem tipo de material
# (Documentacao, Modelos) ou a propria navegacao (Metaprocesso, Fluxo,
# Mapeamento de Processos), e nao tema. Enquanto nao ha conteudo real, move-los
# custa uma consulta.
ASSUNTOS_LINA: list[tuple[str, str, int]] = [
    ("Metaprocesso", "metaprocesso", 15),
    ("Fluxo", "fluxo", 16),
    ("Mapeamento de Processos", "mapeamento-de-processos", 17),
    ("Documentação", "documentacao", 18),
    ("Modelos", "modelos", 19),
]

# --- Eixo 3: natureza -------------------------------------------------------
#
# Cinco valores fechados. A BDLP nao guarda slug para natureza; os daqui sao
# derivados do nome no mesmo estilo dos demais slugs da Biblioteca.

NATUREZAS: list[tuple[str, str, int]] = [
    ("Contratação de Materiais", "contratacao-de-materiais", 1),
    (
        "Contratação de Obras e Serviços de Engenharia",
        "contratacao-de-obras-e-servicos-de-engenharia",
        2,
    ),
    ("Contratação de Serviços", "contratacao-de-servicos", 3),
    ("Contratação de TIC", "contratacao-de-tic", 4),
    ("Não se aplica", "nao-se-aplica", 5),
]


class Command(BaseCommand):
    """Comando `seed_taxonomia`."""

    help = "Semeia os tres eixos da taxonomia com o vocabulario canonico da BDLP v9."

    @transaction.atomic
    def handle(self, *args: Any, **opcoes: Any) -> None:
        categorias = self._semear_categorias()
        assuntos = self._semear_assuntos()
        naturezas = self._semear_naturezas()

        if opcoes.get("verbosity", 1):
            self.stdout.write(
                self.style.SUCCESS(
                    f"Taxonomia BDLP v9 semeada: {categorias} categorias processuais, "
                    f"{assuntos} assuntos, {naturezas} naturezas."
                )
            )

    def _semear_categorias(self) -> int:
        """Semeia o eixo processual de cima para baixo, para o pai sempre existir."""
        for nome, slug, ordem in MACROETAPAS:
            CategoriaProcessual.objects.update_or_create(
                slug=slug,
                defaults={"nome": nome, "nivel": Nivel.MACROETAPA, "ordem": ordem, "pai": None},
            )

        for nivel, linhas in (
            (Nivel.SUBCATEGORIA, SUBCATEGORIAS),
            (Nivel.MICROCATEGORIA, MICROCATEGORIAS),
        ):
            for nome, slug, slug_do_pai, ordem in linhas:
                CategoriaProcessual.objects.update_or_create(
                    slug=slug,
                    defaults={
                        "nome": nome,
                        "nivel": nivel,
                        "ordem": ordem,
                        "pai": CategoriaProcessual.objects.get(slug=slug_do_pai),
                    },
                )

        return len(MACROETAPAS) + len(SUBCATEGORIAS) + len(MICROCATEGORIAS)

    def _semear_assuntos(self) -> int:
        for origem, linhas in (
            (Assunto.Origem.BDLP, ASSUNTOS_BDLP),
            (Assunto.Origem.LINA, ASSUNTOS_LINA),
        ):
            for nome, slug, ordem in linhas:
                Assunto.objects.update_or_create(
                    slug=slug, defaults={"nome": nome, "origem": origem, "ordem": ordem}
                )
        return len(ASSUNTOS_BDLP) + len(ASSUNTOS_LINA)

    def _semear_naturezas(self) -> int:
        for nome, slug, ordem in NATUREZAS:
            Natureza.objects.update_or_create(slug=slug, defaults={"nome": nome, "ordem": ordem})
        return len(NATUREZAS)
