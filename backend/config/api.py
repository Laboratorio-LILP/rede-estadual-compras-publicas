"""Superficie HTTP da API, montada em `/api/v1` (arquitetura-alvo, secao 2).

Django Ninja gera o contrato OpenAPI a partir dos tipos — e desse contrato o
front deriva os seus (`openapi-typescript`), de modo que a fronteira front-back
e verificada no build, nao em producao.
"""

from __future__ import annotations

from django.conf import settings
from django.db import connection
from django.http import HttpRequest
from ninja import NinjaAPI, Schema

api = NinjaAPI(
    title="API da RECPSP",
    version=settings.VERSAO_DA_API,
    description=(
        "Rede Estadual de Compras Publicas de Sao Paulo. "
        "Contrato gerado a partir dos tipos do servidor."
    ),
    # A interface interativa do Ninja carrega o Swagger de uma CDN, o que a CSP
    # estrita bloqueia de proposito. O contrato consumivel e o JSON em
    # `/api/v1/openapi.json`, que nao depende de script externo.
    docs_url=None,
)


class Saude(Schema):
    """Resposta do endpoint de saude."""

    status: str
    versao: str
    banco: str


@api.get("/saude", response=Saude, tags=["infraestrutura"], summary="Estado do servico")
def saude(request: HttpRequest) -> Saude:
    """Diz se a aplicacao esta de pe e se o banco responde.

    Serve ao `healthcheck` do Compose e ao criterio de pronto da etapa 0.
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except Exception:  # o endpoint reporta o estado; nao e o lugar de tratar
        banco = "indisponivel"
    else:
        banco = "ok"

    return Saude(
        status="ok" if banco == "ok" else "degradado",
        versao=settings.VERSAO_DA_API,
        banco=banco,
    )
