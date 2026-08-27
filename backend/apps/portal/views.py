"""Paginas servidas pelo Django.

Na etapa 0 existe uma so: a raiz da aplicacao, que prova que o servico esta de
pe e que a CSP estrita chega ao navegador. A home agregadora de verdade
(RF-HOM-01/02) e da etapa 5; a interface do produto e do front (Vite, 5173).
"""

from __future__ import annotations

from django.conf import settings
from django.http import HttpRequest, HttpResponse
from django.shortcuts import render


def raiz(request: HttpRequest) -> HttpResponse:
    """Pagina raiz da aplicacao."""
    return render(
        request,
        "portal/index.html",
        {
            "versao": settings.VERSAO_DA_API,
            "caminho_base": settings.BASE_PATH,
        },
    )
