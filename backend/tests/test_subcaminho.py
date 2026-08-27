"""Subcaminho limpo (ADR-005 transversal; arquitetura-alvo, secao 6).

Criterio de aceite do contrato: trocar o prefixo e reconstruir **sem tocar em
codigo**. Aqui se prova o lado do Django; o lado do front esta em
`frontend/src/configuracao.test.ts`.
"""

from __future__ import annotations

import importlib
import os
from collections.abc import Iterator
from types import ModuleType
from unittest import mock

import pytest

MODULO = "config.settings.base"


def _recarrega_com(ambiente: dict[str, str]) -> ModuleType:
    with mock.patch.dict(os.environ, ambiente, clear=True):
        return importlib.reload(importlib.import_module(MODULO))


@pytest.fixture(autouse=True)
def _restaura_o_modulo() -> Iterator[None]:
    yield
    importlib.reload(importlib.import_module(MODULO))


def test_na_raiz_nao_ha_prefixo() -> None:
    modulo = _recarrega_com({})

    assert modulo.BASE_PATH == "/"
    assert modulo.STATIC_URL == "/static/"
    assert not hasattr(modulo, "FORCE_SCRIPT_NAME")


@pytest.mark.parametrize("informado", ["/rede/", "rede", "/rede"])
def test_prefixo_vem_do_ambiente_em_qualquer_grafia(informado: str) -> None:
    modulo = _recarrega_com({"RECPSP_BASE_PATH": informado})

    assert modulo.BASE_PATH == "/rede/"
    assert modulo.FORCE_SCRIPT_NAME == "/rede"
    assert modulo.STATIC_URL == "/rede/static/"


def test_admin_fica_sob_caminho_proprio() -> None:
    """ADR-005: o admin e candidato ao subdominio administrativo."""
    modulo = _recarrega_com({})

    assert modulo.ADMIN_URL
    assert modulo.ADMIN_URL != "admin/"
