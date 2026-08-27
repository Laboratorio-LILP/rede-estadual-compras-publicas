"""O endpoint de saude — criterio de pronto da etapa 0 e sonda do Compose."""

from __future__ import annotations

import pytest
from django.test import Client


@pytest.mark.django_db
def test_saude_responde_com_o_banco_de_pe(client: Client) -> None:
    resposta = client.get("/api/v1/saude")

    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["status"] == "ok"
    assert corpo["banco"] == "ok"
    assert corpo["versao"]


@pytest.mark.django_db
def test_saude_devolve_json(client: Client) -> None:
    resposta = client.get("/api/v1/saude")

    assert resposta["Content-Type"].startswith("application/json")


def test_contrato_openapi_e_publicado() -> None:
    """O contrato existe e e o que o front usa para gerar os proprios tipos."""
    resposta = Client().get("/api/v1/openapi.json")

    assert resposta.status_code == 200
    contrato = resposta.json()
    assert "/api/v1/saude" in contrato["paths"]
