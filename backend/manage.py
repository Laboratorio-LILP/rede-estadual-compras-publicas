#!/usr/bin/env python
"""Utilitario de linha de comando do Django.

Padrao de ambiente: desenvolvimento. Homologacao e producao definem
`DJANGO_SETTINGS_MODULE` explicitamente.
"""

from __future__ import annotations

import os
import sys


def main() -> None:
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as erro:  # pragma: no cover - so acontece fora do conteiner
        raise ImportError(
            "Django nao foi encontrado. Toda ferramenta desta frente roda dentro "
            "do conteiner (ADR-008) — use `make shell` ou `make test`."
        ) from erro
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
