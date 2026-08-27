"""Configuracao da aplicacao `indicadores`."""

from django.apps import AppConfig


class IndicadoresConfig(AppConfig):
    """Eventos de uso e as consultas do painel gerencial."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.indicadores"
    label = "indicadores"
    verbose_name = "Indicadores"
