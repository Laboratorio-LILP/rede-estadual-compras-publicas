"""Segredo ausente derruba o boot em producao (arquitetura-alvo, secao 7).

A regra so vale se for verificavel. Estes testes importam o modulo de settings
de producao com o ambiente controlado e exigem a falha alta — o oposto de subir
com uma chave previsivel, que e o modo silencioso de perder um ambiente.
"""

from __future__ import annotations

import importlib
import os
import sys
from collections.abc import Iterator
from unittest import mock

import pytest
from django.core.exceptions import ImproperlyConfigured

MODULO = "config.settings.prod"

AMBIENTE_COMPLETO = {
    "DJANGO_SECRET_KEY": "chave-de-teste-nao-usada-em-lugar-nenhum",
    "RECPSP_ALLOWED_HOSTS": "recpsp.exemplo.gov.br",
    "RECPSP_DB_PASSWORD": "senha-de-teste",
}


@pytest.fixture(autouse=True)
def _descarrega_o_modulo() -> Iterator[None]:
    """Evita que o cache de import mascare o efeito do ambiente.

    Descarrega em vez de reimportar: com o ambiente real de desenvolvimento a
    reimportacao de `prod` falharia — que e exatamente o comportamento que
    estes testes exigem.
    """
    yield
    sys.modules.pop(MODULO, None)
    sys.modules.pop("config.settings.dev", None)


def _importa_com(ambiente: dict[str, str]) -> None:
    with mock.patch.dict(os.environ, ambiente, clear=True):
        importlib.reload(importlib.import_module(MODULO))


@pytest.mark.parametrize(
    "faltando",
    ["DJANGO_SECRET_KEY", "RECPSP_ALLOWED_HOSTS", "RECPSP_DB_PASSWORD"],
)
def test_producao_recusa_subir_sem_o_segredo(faltando: str) -> None:
    ambiente = {chave: valor for chave, valor in AMBIENTE_COMPLETO.items() if chave != faltando}

    with pytest.raises(ImproperlyConfigured) as erro:
        _importa_com(ambiente)

    assert faltando in str(erro.value)


def test_producao_sobe_com_o_ambiente_completo() -> None:
    _importa_com(AMBIENTE_COMPLETO)

    modulo = importlib.import_module(MODULO)
    assert modulo.DEBUG is False
    assert modulo.SESSION_COOKIE_SECURE is True
    assert modulo.SECURE_HSTS_SECONDS > 0


def test_homologacao_em_http_desliga_o_redirecionamento_para_https() -> None:
    """Homologacao serve HTTP atras da borda; producao serve HTTPS."""
    _importa_com({**AMBIENTE_COMPLETO, "RECPSP_HTTPS": "0"})

    modulo = importlib.import_module(MODULO)
    assert modulo.SECURE_SSL_REDIRECT is False
    assert modulo.SESSION_COOKIE_SECURE is False
    assert modulo.DEBUG is False


def test_desenvolvimento_nao_versiona_segredo_fixo() -> None:
    """Sem variavel, a chave de desenvolvimento e sorteada por processo."""
    with mock.patch.dict(os.environ, {}, clear=True):
        modulo = importlib.reload(importlib.import_module("config.settings.dev"))
        primeira = modulo.SECRET_KEY
        modulo = importlib.reload(importlib.import_module("config.settings.dev"))
        segunda = modulo.SECRET_KEY

    assert primeira != segunda
    assert primeira
