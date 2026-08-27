"""A taxonomia semeada e' identica a' da Biblioteca Digital (BDLP v9).

Criterio de pronto da etapa 1 (`docs/specs/plano-de-implementacao.md`): "o seed
cria os tres eixos identicos aos da BDLP (teste compara com a lista canonica,
nao com a implementacao)".

Por isso as listas abaixo estao escritas A' MAO, nao importadas do comando de
seed. Sao a SEGUNDA entrada da escrituracao: se o seed mudar sozinho, este
arquivo reprova. Foram transcritas em 27/08/2026 de

    ~/Developer/Governo/biblioteca-digital-logistica-publica/
        docker/postgres/init/06-taxonomia.sql   (assunto)
        docker/postgres/init/07-categories.sql  (categoria processual)
        docker/postgres/init/07-natureza.sql    (natureza)

A coluna `bdlp` guarda a cadeia EXATA do fonte. O nome exibido na RECPSP e' o
mesmo termo com a capitalizacao do ADR 0003 — o eixo processual da BDLP vem em
caixa alta por heranca do Nou-Rau, o que nao serve a uma interface. A relacao e'
provada aqui: `nome.upper() == bdlp.upper()`, sempre.
"""

from __future__ import annotations

import pytest
from django.core.management import call_command
from django.db import IntegrityError, connection

from apps.taxonomia.models import Assunto, CategoriaProcessual, Natureza, Nivel

# --- Lista canonica: eixo 1, categoria processual ---------------------------
#
# (bdlp, nome, slug, nivel, slug_do_pai, ordem)

MACROETAPAS = [
    (
        "PLANO DE CONTRATAÇÕES ANUAL (PCA)",
        "Plano de Contratações Anual (PCA)",
        "plano-de-contratacoes-anual-pca",
        1,
    ),
    (
        "CICLO COMPLETO DA CONTRATAÇÃO",
        "Ciclo Completo da Contratação",
        "ciclo-completo-da-contratacao",
        2,
    ),
    (
        "PLANEJAMENTO/FASE PREPARATÓRIA",
        "Planejamento/Fase Preparatória",
        "planejamento-fase-preparatoria",
        3,
    ),
    ("SELEÇÃO DO FORNECEDOR", "Seleção do Fornecedor", "selecao-do-fornecedor", 4),
    ("GESTÃO CONTRATUAL", "Gestão Contratual", "gestao-contratual", 5),
    ("CONTEÚDOS TRANSVERSAIS", "Conteúdos Transversais", "conteudos-transversais", 6),
]

SUBCATEGORIAS = [
    (
        "FASE PREPARATÓRIA - ETP",
        "Fase Preparatória - ETP",
        "fase-preparatoria-etp",
        "planejamento-fase-preparatoria",
        1,
    ),
    (
        "FASE PREPARATÓRIA - TR",
        "Fase Preparatória - TR",
        "fase-preparatoria-tr",
        "planejamento-fase-preparatoria",
        2,
    ),
    (
        "FASE PREPARATÓRIA - GESTÃO DE RISCOS",
        "Fase Preparatória - Gestão de Riscos",
        "fase-preparatoria-gestao-de-riscos",
        "planejamento-fase-preparatoria",
        3,
    ),
    (
        "FASE PREPARATÓRIA - PESQUISA DE PREÇOS",
        "Fase Preparatória - Pesquisa de Preços",
        "fase-preparatoria-pesquisa-de-precos",
        "planejamento-fase-preparatoria",
        4,
    ),
    ("LICITAÇÃO", "Licitação", "licitacao", "selecao-do-fornecedor", 1),
    ("CONTRATAÇÃO DIRETA", "Contratação Direta", "contratacao-direta", "selecao-do-fornecedor", 2),
    (
        "PROCEDIMENTOS AUXILIARES",
        "Procedimentos Auxiliares",
        "procedimentos-auxiliares",
        "selecao-do-fornecedor",
        3,
    ),
    ("GESTÃO DE CONTRATOS", "Gestão de Contratos", "gestao-de-contratos", "gestao-contratual", 1),
    (
        "FISCALIZAÇÃO DE CONTRATOS",
        "Fiscalização de Contratos",
        "fiscalizacao-de-contratos",
        "gestao-contratual",
        2,
    ),
]

MICROCATEGORIAS = [
    ("MAPA DE RISCOS", "Mapa de Riscos", "mapa-de-riscos", "fase-preparatoria-gestao-de-riscos", 1),
    (
        "MATRIZ DE ALOCAÇÃO DE RISCOS",
        "Matriz de Alocação de Riscos",
        "matriz-de-alocacao-de-riscos",
        "fase-preparatoria-gestao-de-riscos",
        2,
    ),
    ("CONCORRÊNCIA", "Concorrência", "concorrencia", "licitacao", 1),
    ("PREGÃO", "Pregão", "pregao", "licitacao", 2),
    ("LEILÃO", "Leilão", "leilao", "licitacao", 3),
    ("DIÁLOGO COMPETITIVO", "Diálogo Competitivo", "dialogo-competitivo", "licitacao", 4),
    ("INEXIGIBILIDADE", "Inexigibilidade", "inexigibilidade", "contratacao-direta", 1),
    (
        "EMERGÊNCIA - Inciso VIII",
        "Emergência - Inciso VIII",
        "emergencia-inciso-viii",
        "contratacao-direta",
        2,
    ),
    (
        "DISPENSA POR VALOR (Art 75 - incisos I e II)",
        "Dispensa por Valor (Art 75 - incisos I e II)",
        "dispensa-por-valor-art-75",
        "contratacao-direta",
        3,
    ),
    (
        "Contratação Direta outros incisos",
        "Contratação Direta outros incisos",
        "contratacao-direta-outros-incisos",
        "contratacao-direta",
        4,
    ),
    ("CREDENCIAMENTO", "Credenciamento", "credenciamento", "procedimentos-auxiliares", 1),
    (
        "REGISTRO DE PREÇOS (RP)",
        "Registro de Preços (RP)",
        "registro-de-precos-rp",
        "procedimentos-auxiliares",
        2,
    ),
    ("PRÉ-QUALIFICAÇÃO", "Pré-qualificação", "pre-qualificacao", "procedimentos-auxiliares", 3),
    ("PMI", "PMI", "pmi", "procedimentos-auxiliares", 4),
    (
        "REGISTRO CADASTRAL",
        "Registro Cadastral",
        "registro-cadastral",
        "procedimentos-auxiliares",
        5,
    ),
]

# --- Lista canonica: eixo 2, assunto ----------------------------------------
#
# Os 14 da BDLP, com nome e slug EXATOS do fonte (06-taxonomia.sql). Nao
# corrigir a capitalizacao de "Catálogo eletrônico" nem de
# "Compras Centralizadas/compartilhadas": e' assim que estao na Biblioteca, e o
# criterio e' identidade, nao estetica.

ASSUNTOS_BDLP = [
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

# Os cinco termos pedidos pela Lina na DESCRICAO RECPSP, sem equivalente na
# BDLP (ADR 0003). Entram como Assunto de origem `lina`; a pergunta 18 do
# `docs/QUESTIONS.md` pode move-los para tag ou navegacao — a origem separada
# existe exatamente para que a troca seja barata.
ASSUNTOS_LINA = [
    ("Metaprocesso", "metaprocesso", 15),
    ("Fluxo", "fluxo", 16),
    ("Mapeamento de Processos", "mapeamento-de-processos", 17),
    ("Documentação", "documentacao", 18),
    ("Modelos", "modelos", 19),
]

# --- Lista canonica: eixo 3, natureza ---------------------------------------

NATUREZAS = [
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


@pytest.fixture
def semeado(db: None) -> None:
    """Roda o comando de seed uma vez para a funcao de teste."""
    call_command("seed_taxonomia", verbosity=0)


# --- Eixo 1: categoria processual -------------------------------------------


@pytest.mark.django_db
def test_seed_cria_as_seis_macroetapas_na_ordem_da_lei(semeado: None) -> None:
    macroetapas = CategoriaProcessual.objects.filter(nivel=Nivel.MACROETAPA).order_by("ordem")
    assert [(c.nome, c.slug, c.ordem) for c in macroetapas] == [
        (nome, slug, ordem) for _, nome, slug, ordem in MACROETAPAS
    ]


@pytest.mark.django_db
def test_seed_cria_as_nove_subcategorias_sob_a_macroetapa_certa(semeado: None) -> None:
    subcategorias = CategoriaProcessual.objects.filter(nivel=Nivel.SUBCATEGORIA).order_by(
        "pai__ordem", "ordem"
    )
    assert [(c.nome, c.slug, c.pai.slug, c.ordem) for c in subcategorias if c.pai] == [
        (nome, slug, pai, ordem) for _, nome, slug, pai, ordem in SUBCATEGORIAS
    ]


@pytest.mark.django_db
def test_seed_cria_as_quinze_microcategorias_sob_a_subcategoria_certa(semeado: None) -> None:
    micro = CategoriaProcessual.objects.filter(nivel=Nivel.MICROCATEGORIA).order_by(
        "pai__pai__ordem", "pai__ordem", "ordem"
    )
    assert [(c.nome, c.slug, c.pai.slug, c.ordem) for c in micro if c.pai] == [
        (nome, slug, pai, ordem) for _, nome, slug, pai, ordem in MICROCATEGORIAS
    ]


@pytest.mark.django_db
def test_o_eixo_processual_nao_tem_nenhum_no_alem_dos_trinta_canonicos(semeado: None) -> None:
    assert CategoriaProcessual.objects.count() == len(MACROETAPAS) + len(SUBCATEGORIAS) + len(
        MICROCATEGORIAS
    )


@pytest.mark.django_db
def test_cada_nome_do_eixo_processual_e_o_termo_da_bdlp_em_outra_caixa(semeado: None) -> None:
    """A unica diferenca permitida em relacao a' BDLP e' a capitalizacao.

    E' este teste que faz "identico a' BDLP" ser uma afirmacao verificavel, e
    nao uma declaracao: qualquer edicao de termo no seed reprova aqui.
    """
    canonicos: dict[str, str] = {slug: bdlp for bdlp, _, slug, _ in MACROETAPAS}
    for bdlp, _, slug, _, _ in (*SUBCATEGORIAS, *MICROCATEGORIAS):
        canonicos[slug] = bdlp

    for categoria in CategoriaProcessual.objects.all():
        assert categoria.nome.upper() == canonicos[categoria.slug].upper()


@pytest.mark.django_db
def test_macroetapa_nao_tem_pai_e_microcategoria_tem_avo(semeado: None) -> None:
    pca = CategoriaProcessual.objects.get(slug="plano-de-contratacoes-anual-pca")
    assert pca.pai is None

    pregao = CategoriaProcessual.objects.get(slug="pregao")
    assert pregao.pai is not None
    assert pregao.pai.slug == "licitacao"
    assert pregao.pai.pai is not None
    assert pregao.pai.pai.slug == "selecao-do-fornecedor"


# --- Eixo 2: assunto --------------------------------------------------------


@pytest.mark.django_db
def test_seed_cria_os_catorze_assuntos_da_bdlp_sem_alterar_uma_letra(semeado: None) -> None:
    assuntos = Assunto.objects.filter(origem=Assunto.Origem.BDLP).order_by("ordem")
    assert [(a.nome, a.slug, a.ordem) for a in assuntos] == ASSUNTOS_BDLP


@pytest.mark.django_db
def test_seed_cria_os_cinco_termos_da_lina_marcados_com_origem_propria(semeado: None) -> None:
    """A origem separada e' o que torna barata a resposta a' pergunta 18."""
    assuntos = Assunto.objects.filter(origem=Assunto.Origem.LINA).order_by("ordem")
    assert [(a.nome, a.slug, a.ordem) for a in assuntos] == ASSUNTOS_LINA


@pytest.mark.django_db
def test_o_eixo_de_assunto_nao_tem_nenhum_termo_alem_dos_dezenove(semeado: None) -> None:
    assert Assunto.objects.count() == len(ASSUNTOS_BDLP) + len(ASSUNTOS_LINA)


# --- Eixo 3: natureza -------------------------------------------------------


@pytest.mark.django_db
def test_seed_cria_as_cinco_naturezas_da_bdlp(semeado: None) -> None:
    naturezas = Natureza.objects.order_by("ordem")
    assert [(n.nome, n.slug, n.ordem) for n in naturezas] == NATUREZAS


@pytest.mark.django_db
def test_obras_publicas_do_prototipo_vive_no_eixo_de_natureza(semeado: None) -> None:
    """ADR 0003: "Obras Publicas" nao e' assunto — e' o que esta sendo contratado."""
    assert not Assunto.objects.filter(nome__icontains="obras").exists()
    assert Natureza.objects.filter(slug="contratacao-de-obras-e-servicos-de-engenharia").exists()


# --- Propriedades do seed ---------------------------------------------------


@pytest.mark.django_db
def test_rodar_o_seed_duas_vezes_nao_duplica_nem_muda_nada(semeado: None) -> None:
    """Idempotencia: o comando e' seguro em qualquer implantacao ja povoada."""
    antes = (
        list(CategoriaProcessual.objects.order_by("slug").values_list("id", "slug", "nome")),
        list(Assunto.objects.order_by("slug").values_list("id", "slug", "nome")),
        list(Natureza.objects.order_by("slug").values_list("id", "slug", "nome")),
    )

    call_command("seed_taxonomia", verbosity=0)

    depois = (
        list(CategoriaProcessual.objects.order_by("slug").values_list("id", "slug", "nome")),
        list(Assunto.objects.order_by("slug").values_list("id", "slug", "nome")),
        list(Natureza.objects.order_by("slug").values_list("id", "slug", "nome")),
    )
    assert antes == depois


@pytest.mark.django_db
def test_o_seed_corrige_um_termo_editado_a_mao(semeado: None) -> None:
    """Reaplicar o seed devolve o vocabulario ao canone, sem recriar a linha."""
    pregao = CategoriaProcessual.objects.get(slug="pregao")
    identificador = pregao.id
    CategoriaProcessual.objects.filter(pk=identificador).update(nome="Pregao eletronico")

    call_command("seed_taxonomia", verbosity=0)

    pregao.refresh_from_db()
    assert pregao.nome == "Pregão"
    assert pregao.id == identificador


@pytest.mark.django_db
def test_todo_slug_do_eixo_processual_e_unico_no_produto_inteiro(semeado: None) -> None:
    """A BDLP escopa o slug por pai; aqui ele e' chave de URL, entao e' global."""
    slugs = list(CategoriaProcessual.objects.values_list("slug", flat=True))
    assert len(slugs) == len(set(slugs))


# --- Invariantes que o BANCO precisa garantir -------------------------------
#
# Vocabulario controlado sem trava vira sessenta categorias em um ano (ADR
# 0003). Estas regras nao podem morar so na camada de aplicacao: o admin, o
# shell e uma futura importacao escrevem pelos proprios caminhos.


@pytest.mark.django_db(transaction=True)
def test_o_banco_recusa_macroetapa_com_pai() -> None:
    raiz = CategoriaProcessual.objects.create(
        nome="Raiz", slug="raiz", nivel=Nivel.MACROETAPA, ordem=1
    )
    with pytest.raises(IntegrityError):
        CategoriaProcessual.objects.create(
            nome="Impossivel", slug="impossivel", nivel=Nivel.MACROETAPA, ordem=2, pai=raiz
        )


@pytest.mark.django_db(transaction=True)
def test_o_banco_recusa_subcategoria_orfa() -> None:
    with pytest.raises(IntegrityError):
        CategoriaProcessual.objects.create(
            nome="Orfa", slug="orfa", nivel=Nivel.SUBCATEGORIA, ordem=1, pai=None
        )


@pytest.mark.django_db(transaction=True)
def test_o_banco_recusa_duas_irmas_na_mesma_ordem() -> None:
    mae = CategoriaProcessual.objects.create(
        nome="Mae", slug="mae", nivel=Nivel.MACROETAPA, ordem=1
    )
    CategoriaProcessual.objects.create(
        nome="Primeira", slug="primeira", nivel=Nivel.SUBCATEGORIA, ordem=1, pai=mae
    )
    with pytest.raises(IntegrityError):
        CategoriaProcessual.objects.create(
            nome="Segunda", slug="segunda", nivel=Nivel.SUBCATEGORIA, ordem=1, pai=mae
        )


@pytest.mark.django_db(transaction=True)
def test_o_banco_recusa_duas_macroetapas_na_mesma_ordem() -> None:
    """Sem `nulls_distinct=False`, a raiz escaparia da regra: no PostgreSQL
    NULL nao colide com NULL, e toda macroetapa tem pai nulo."""
    CategoriaProcessual.objects.create(
        nome="Primeira", slug="primeira", nivel=Nivel.MACROETAPA, ordem=1
    )
    with pytest.raises(IntegrityError):
        CategoriaProcessual.objects.create(
            nome="Segunda", slug="segunda", nivel=Nivel.MACROETAPA, ordem=1
        )


@pytest.mark.django_db
def test_a_migracao_inicial_cria_os_indices_que_o_adr_0001_exige() -> None:
    """ADR 0001: indices desde o comeco, nao depois que a tabela cresce."""
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT indexname FROM pg_indexes WHERE tablename LIKE 'taxonomia_%'",
        )
        indices = {linha[0] for linha in cursor.fetchall()}

    assert {
        "taxonomia_cat_nivel_ordem",
        "taxonomia_cat_pai_ordem",
        "taxonomia_assunto_origem",
    } <= indices
