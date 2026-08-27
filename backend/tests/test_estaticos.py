"""Os estaticos que o Django serve sobrevivem ao empacotamento de producao.

Este arquivo nasce de um defeito real, achado na verificacao final da etapa 1 e
NAO pego por `make lint`, `make test` nem `make a11y-check`: a etapa acrescentou
`index.css` ao diretorio que o Django publica, e esse arquivo comeca com
`@import "tailwindcss"` — um especificador que so o Vite entende. O
`collectstatic` de producao usa armazenamento com manifesto, que reescreve toda
referencia dentro de CSS, nao achou `tailwindcss`, e a construcao da imagem de
producao passou a falhar.

O laco de verificacao nao viu porque `make build-app` roda `check --deploy`, que
nao coleta estaticos, e `make imagem` — que coleta — so roda na esteira e
manualmente. Um passo que so a esteira exercita e' um passo que se descobre
quebrado depois de empurrar.

A licao esta na fronteira que o teste protege: **nem todo CSS do design system
e' servivel como esta**. `tokens.css` e `fontes.css` sao CSS puro, e qualquer
servidor os entrega; `index.css`, `tema.css`, `base.css` e `componentes.css`
precisam do Vite e do Tailwind. So os primeiros moram no diretorio que o Django
publica (`frontend/src/estilos/estatico/`).
"""

from __future__ import annotations

from pathlib import Path

import pytest
from django.conf import settings
from django.core.management import call_command
from django.test import Client, override_settings

# O mesmo armazenamento de `config/settings/prod.py`: e' o pos-processamento
# dele que resolve as referencias e, portanto, o que reprova quando uma delas
# nao existe.
STORAGES_DE_PRODUCAO = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}


def test_collectstatic_de_producao_resolve_todas_as_referencias(tmp_path: Path) -> None:
    """O passo que constroi a imagem de producao, exercitado aqui.

    Sem este teste, so a esteira descobre — e depois do push.
    """
    with override_settings(STORAGES=STORAGES_DE_PRODUCAO, STATIC_ROOT=str(tmp_path)):
        # Levanta `MissingFileError` se algum `@import` ou `url()` apontar para
        # o que o Django nao consegue achar.
        call_command("collectstatic", "--noinput", "--clear", verbosity=0)

    assert (tmp_path / "staticfiles.json").exists(), "o manifesto nao foi gerado"


def test_o_diretorio_publicado_so_tem_css_que_nao_precisa_de_build() -> None:
    """A fronteira, afirmada como regra e nao so como arrumacao de pastas.

    Um `.css` novo com `@import` de pacote, ou um `.ts` de teste, entrando aqui
    quebra a imagem de producao ou vira ativo publico sem querer.
    """
    publicados = [Path(diretorio) for diretorio in settings.STATICFILES_DIRS]
    assert publicados, "o Django precisa publicar o diretorio dos tokens"

    for diretorio in publicados:
        for arquivo in diretorio.rglob("*"):
            if not arquivo.is_file():
                continue

            assert arquivo.suffix != ".ts", (
                f"{arquivo.name} e' codigo, nao ativo estatico — sairia servido publicamente"
            )

            if arquivo.suffix == ".css":
                texto = arquivo.read_text(encoding="utf-8")
                assert '@import "tailwindcss"' not in texto, (
                    f"{arquivo.name} depende do Vite; o Django nao resolve esse import"
                )


@pytest.mark.django_db
def test_a_pagina_raiz_carrega_as_fontes_do_proprio_servidor() -> None:
    """Sem isto, a Montserrat nao chega a' pagina do Django.

    A falha e' silenciosa: os titulos caem na reserva Verdana e ninguem ve' erro
    nenhum. So a comparacao com o mockup denunciaria — depois de pronto.
    """
    resposta = Client().get("/")

    assert resposta.status_code == 200
    corpo = resposta.content.decode()
    assert "tokens.css" in corpo
    assert "fontes.css" in corpo
