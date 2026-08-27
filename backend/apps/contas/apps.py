"""Configuracao da aplicacao `contas`."""

from django.apps import AppConfig


class ContasConfig(AppConfig):
    """
    Identidade, orgaos e unidades, cadastro escalonado, especialidade,
    interesses, termos de uso.
    """

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.contas"
    label = "contas"
    verbose_name = "Contas"
