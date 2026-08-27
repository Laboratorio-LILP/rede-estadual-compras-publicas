"""Configuracao de producao e homologacao — segredos sem fallback.

Regra da frente (arquitetura-alvo, secao 7): a ausencia de segredo **derruba o
boot**. Falhar alto na subida e preferivel a subir com uma chave previsivel, que
e o modo silencioso de perder um ambiente inteiro.
"""

from __future__ import annotations

from django.core.exceptions import ImproperlyConfigured

from .base import *
from .base import booleana, lista, variavel


def exigir(nome: str) -> str:
    """Devolve a variavel de ambiente ou derruba o boot dizendo qual falta."""
    valor = variavel(nome)
    if not valor:
        raise ImproperlyConfigured(
            f"A variavel de ambiente {nome} e obrigatoria em producao. "
            "Nao ha valor padrao de proposito (arquitetura-alvo, secao 7)."
        )
    return valor


DEBUG = False

SECRET_KEY = exigir("DJANGO_SECRET_KEY")

ALLOWED_HOSTS = lista("RECPSP_ALLOWED_HOSTS")
if not ALLOWED_HOSTS:
    raise ImproperlyConfigured(
        "RECPSP_ALLOWED_HOSTS e obrigatoria em producao (lista separada por virgula)."
    )

CSRF_TRUSTED_ORIGINS = lista("RECPSP_CSRF_TRUSTED_ORIGINS")

# Dicionario novo, nunca alteracao no lugar: `from .base import *` traz a
# referencia do objeto, e mexer nele alcanca todo mundo que o segura.
DATABASES = {
    **DATABASES,
    "default": {**DATABASES["default"], "PASSWORD": exigir("RECPSP_DB_PASSWORD")},
}

# A aplicacao roda atras da borda da SGGD (Apache + `index.php` hoje, nginx em
# producao). O esquema e o host publicos chegam pelos cabecalhos do proxy —
# o mesmo contrato que destravou a BDLP em 09/06 (Mapa, secao 4).
USE_X_FORWARDED_HOST = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# Homologacao ainda serve HTTP puro atras da borda; producao serve HTTPS.
# `RECPSP_HTTPS` separa as duas sem tocar em codigo.
HTTPS = booleana("RECPSP_HTTPS", padrao=True)

SESSION_COOKIE_SECURE = HTTPS
CSRF_COOKIE_SECURE = HTTPS
SECURE_SSL_REDIRECT = HTTPS
SECURE_HSTS_SECONDS = 31536000 if HTTPS else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = HTTPS
SECURE_HSTS_PRELOAD = HTTPS

# Estaticos com hash no nome e pre-compressao (WhiteNoise). Exige que
# `collectstatic` tenha rodado na construcao da imagem.
STORAGES = {
    **STORAGES,
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}
