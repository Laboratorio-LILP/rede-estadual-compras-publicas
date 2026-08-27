"""Configuracao da aplicacao `taxonomia`."""

from django.apps import AppConfig


class TaxonomiaConfig(AppConfig):
    """
    Os tres eixos herdados da BDLP (categoria processual, assunto, natureza)
    e o seed.
    """

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.taxonomia"
    label = "taxonomia"
    verbose_name = "Taxonomia"
