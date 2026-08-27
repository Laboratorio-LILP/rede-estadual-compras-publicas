"""Configuracao da aplicacao `mensagens`."""

from django.apps import AppConfig


class MensagensConfig(AppConfig):
    """Mensagens diretas e notificacoes."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.mensagens"
    label = "mensagens"
    verbose_name = "Mensagens"
