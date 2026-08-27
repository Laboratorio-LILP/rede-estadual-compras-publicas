"""Configuracao de desenvolvimento — roda dentro do conteiner (ADR-008).

Nao ha segredo fixo versionado: sem `DJANGO_SECRET_KEY` no ambiente, a chave e
sorteada por processo. O efeito colateral e conhecido e desejado — reiniciar o
servidor derruba as sessoes abertas. Em producao o comportamento e outro: o boot
falha (ver `prod.py`).
"""

from __future__ import annotations

from django.core.management.utils import get_random_secret_key

from .base import *
from .base import lista, variavel

DEBUG = True

SECRET_KEY = variavel("DJANGO_SECRET_KEY") or get_random_secret_key()

ALLOWED_HOSTS = lista(
    "RECPSP_ALLOWED_HOSTS",
    "localhost,127.0.0.1,[::1],backend,testserver",
)

# O navegador fala com o servidor do Vite (5173), que repassa `/api` para o
# Django. Sao origens distintas do ponto de vista do CSRF.
CSRF_TRUSTED_ORIGINS = lista(
    "RECPSP_CSRF_TRUSTED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8004,http://127.0.0.1:8004",
)

# Fora de HTTPS em desenvolvimento: marcar o cookie como `Secure` o tornaria
# invisivel para o navegador em `http://127.0.0.1`.
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

# Sem `collectstatic` em desenvolvimento: o WhiteNoise usa os mesmos finders do
# Django e recarrega a cada requisicao. Vale tambem nos testes, onde o Django
# desliga o DEBUG.
WHITENOISE_USE_FINDERS = True
WHITENOISE_AUTOREFRESH = True
