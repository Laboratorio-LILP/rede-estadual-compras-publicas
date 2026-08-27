"""Configuracao da aplicacao `portal`."""

from django.apps import AppConfig


class PortalConfig(AppConfig):
    """
    Home agregadora com cards geridos, paginas de regulamentacao, termos de
    participacao.
    """

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.portal"
    label = "portal"
    verbose_name = "Portal"
