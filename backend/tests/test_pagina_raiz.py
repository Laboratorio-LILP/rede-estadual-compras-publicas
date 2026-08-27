"""A pagina raiz e a politica de seguranca de conteudo.

Criterio de pronto da etapa 0: "a pagina raiz responde com CSP estrita".
O teste existe para que a afirmacao seja verificada, nao declarada.
"""

from __future__ import annotations

import pytest
from django.test import Client

CABECALHO = "Content-Security-Policy"


@pytest.fixture
def politica(client: Client) -> str:
    resposta = client.get("/")
    assert resposta.status_code == 200
    assert CABECALHO in resposta.headers
    return resposta.headers[CABECALHO]


def test_pagina_raiz_responde(client: Client) -> None:
    resposta = client.get("/")

    assert resposta.status_code == 200
    conteudo = resposta.content.decode("utf-8")
    # Um `<h1>` por pagina e o piso do ADR-007 — a rota `/` do legado nao tinha
    # nenhum.
    assert conteudo.count("<h1") == 1
    assert 'href="#conteudo"' in conteudo  # skip link
    assert "<main" in conteudo


@pytest.mark.parametrize("proibido", ["unsafe-inline", "unsafe-eval"])
def test_politica_nao_afrouxa_scripts(politica: str, proibido: str) -> None:
    assert proibido not in politica


def test_politica_prende_tudo_na_propria_origem(politica: str) -> None:
    assert "default-src 'none'" in politica
    assert "script-src 'self'" in politica
    assert "frame-ancestors 'none'" in politica
    assert "object-src 'none'" in politica


def test_pagina_raiz_nao_tem_script_nem_estilo_embutido(client: Client) -> None:
    """A CSP so protege se a pagina nao depender do que ela proibe."""
    conteudo = client.get("/").content.decode("utf-8")

    assert "<script" not in conteudo
    assert "style=" not in conteudo


def test_demais_cabecalhos_de_seguranca(client: Client) -> None:
    cabecalhos = client.get("/").headers

    assert cabecalhos["X-Frame-Options"] == "DENY"
    assert cabecalhos["X-Content-Type-Options"] == "nosniff"
    assert cabecalhos["Referrer-Policy"] == "same-origin"
