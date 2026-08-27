"""Roteamento raiz da base nova.

Ordem: a API primeiro, o admin sob caminho proprio (ADR-005) e a pagina raiz
por ultimo — a mesma disciplina de "curinga no fim" que o legado exigia.
"""

from __future__ import annotations

from django.conf import settings
from django.contrib import admin
from django.urls import path

from apps.portal.views import raiz
from config.api import api

urlpatterns = [
    path("api/v1/", api.urls),
    path(settings.ADMIN_URL, admin.site.urls),
    path("", raiz, name="raiz"),
]
