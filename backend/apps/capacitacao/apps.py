"""Configuracao da aplicacao `capacitacao`."""

from django.apps import AppConfig


class CapacitacaoConfig(AppConfig):
    """
    Catalogo de cursos, agrupamentos, eventos, pilulas, FAQ, registro de
    interesse.
    """

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.capacitacao"
    label = "capacitacao"
    verbose_name = "Capacitacao"
