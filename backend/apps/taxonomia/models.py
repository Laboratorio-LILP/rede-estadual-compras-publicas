"""Modelos de `taxonomia` — os tres eixos herdados da Biblioteca Digital.

Contrato: `docs/specs/modelo-de-dados.md`, secao 3, e ADR 0003 da frente.
Os tres eixos sao INDEPENDENTES: um topico pode ser classificado nos tres, e
nenhum deles conhece os outros.

Esta aplicacao nao conhece nenhuma outra (arquitetura-alvo, secao 4) — e' a
folha da arvore de dependencias, e por isso a primeira a nascer.
"""

from __future__ import annotations

from django.db import models


class Nivel(models.TextChoices):
    """Os tres niveis do eixo processual (ADR 0003).

    A profundidade e' fixa de proposito: sem teto, um vocabulario controlado
    vira sessenta categorias em um ano e ninguem acha nada.
    """

    MACROETAPA = "macroetapa", "Macroetapa"
    SUBCATEGORIA = "subcategoria", "Subcategoria"
    MICROCATEGORIA = "microcategoria", "Microcategoria"


class CategoriaProcessual(models.Model):
    """Eixo 1 — onde o assunto esta no processo de contratacao.

    Seis macroetapas na ordem da Lei 14.133/2021: o PCA abre o ciclo anual
    (art. 12, VII), depois a fase preparatoria (art. 18), a selecao (arts. 17,
    28 e 72 a 78) e a gestao contratual (art. 117 e seguintes).
    """

    nome = models.CharField("nome", max_length=200)
    # Chave de URL e chave de leitura cruzada com a BDLP. Unica no produto
    # inteiro — a BDLP escopa o slug por pai porque la ele nao e' rota.
    slug = models.SlugField("slug", max_length=200, unique=True)
    pai = models.ForeignKey(
        "self",
        verbose_name="categoria pai",
        related_name="filhas",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        # PROTECT, e nao CASCADE: um termo de vocabulario controlado nao e'
        # composicao do termo acima. Apagar "Licitacao" com "Pregao" pendurado
        # e' engano, e o banco recusa.
    )
    nivel = models.CharField("nivel", max_length=20, choices=Nivel.choices)
    ordem = models.PositiveSmallIntegerField("ordem", default=0)

    criado_em = models.DateTimeField("criado em", auto_now_add=True)
    atualizado_em = models.DateTimeField("atualizado em", auto_now=True)

    class Meta:
        verbose_name = "categoria processual"
        verbose_name_plural = "categorias processuais"
        ordering = ["ordem", "nome"]
        constraints = [
            # A raiz da arvore e' exatamente o conjunto das macroetapas. Regra
            # no BANCO, e nao so no comando de seed: o admin, o shell e uma
            # futura importacao escrevem por caminhos proprios.
            models.CheckConstraint(
                condition=models.Q(nivel=Nivel.MACROETAPA, pai__isnull=True)
                | (~models.Q(nivel=Nivel.MACROETAPA) & models.Q(pai__isnull=False)),
                name="taxonomia_raiz_so_para_macroetapa",
            ),
            # `nulls_distinct=False` e' o que faz a regra alcancar as
            # macroetapas: no PostgreSQL NULL nao colide com NULL, e o pai
            # delas e' nulo — sem isto as seis raizes escapariam da unicidade.
            models.UniqueConstraint(
                fields=["pai", "ordem"],
                name="taxonomia_ordem_unica_entre_irmas",
                nulls_distinct=False,
            ),
        ]
        # Indices desde a migracao inicial (ADR 0001): a arvore e' lida em toda
        # tela de classificacao e em todo filtro de listagem.
        indexes = [
            models.Index(fields=["nivel", "ordem"], name="taxonomia_cat_nivel_ordem"),
            models.Index(fields=["pai", "ordem"], name="taxonomia_cat_pai_ordem"),
        ]

    def __str__(self) -> str:
        return self.nome

    @property
    def caminho(self) -> str:
        """Trilha do termo, da macroetapa ate ele: "Selecao > Licitacao > Pregao"."""
        termos = [self.nome]
        no = self.pai
        while no is not None:
            termos.append(no.nome)
            no = no.pai
        return " > ".join(reversed(termos))


class Assunto(models.Model):
    """Eixo 2 — o tema, independente de onde esteja no processo.

    Os 14 da BDLP mais os cinco termos pedidos pela Lina. A `origem` os separa
    de proposito: cinco deles descrevem tipo de material ou a propria
    navegacao, e a pergunta 18 do `docs/QUESTIONS.md` pode move-los para tag ou
    secao. Com a origem marcada, a troca e' uma consulta, nao uma arqueologia.
    """

    class Origem(models.TextChoices):
        BDLP = "bdlp", "Biblioteca Digital (BDLP v9)"
        LINA = "lina", "DESCRICAO RECPSP (coordenacao)"

    nome = models.CharField("nome", max_length=200, unique=True)
    slug = models.SlugField("slug", max_length=200, unique=True)
    origem = models.CharField("origem", max_length=10, choices=Origem.choices, default=Origem.BDLP)
    ordem = models.PositiveSmallIntegerField("ordem", default=0)

    criado_em = models.DateTimeField("criado em", auto_now_add=True)
    atualizado_em = models.DateTimeField("atualizado em", auto_now=True)

    class Meta:
        verbose_name = "assunto"
        verbose_name_plural = "assuntos"
        ordering = ["ordem", "nome"]
        indexes = [models.Index(fields=["origem", "ordem"], name="taxonomia_assunto_origem")]

    def __str__(self) -> str:
        return self.nome


class Natureza(models.Model):
    """Eixo 3 — o que esta sendo contratado.

    Cinco valores fechados da BDLP. E' aqui que "Obras Publicas" — categoria do
    prototipo e item da lista da Lina — encontra lugar (ADR 0003): nao e'
    assunto, e' objeto da contratacao.
    """

    nome = models.CharField("nome", max_length=100, unique=True)
    slug = models.SlugField("slug", max_length=100, unique=True)
    ordem = models.PositiveSmallIntegerField("ordem", default=0)

    criado_em = models.DateTimeField("criado em", auto_now_add=True)
    atualizado_em = models.DateTimeField("atualizado em", auto_now=True)

    class Meta:
        verbose_name = "natureza"
        verbose_name_plural = "naturezas"
        ordering = ["ordem", "nome"]

    def __str__(self) -> str:
        return self.nome
