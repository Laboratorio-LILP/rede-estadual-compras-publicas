"""Configuracao da aplicacao `forum`."""

from django.apps import AppConfig


class ForumConfig(AppConfig):
    """Topicos, respostas, reacoes, enquetes, tags, moderacao, visualizacoes."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.forum"
    label = "forum"
    verbose_name = "Forum"
