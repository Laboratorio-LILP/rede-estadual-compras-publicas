"""Configuracao comum a todos os ambientes da base nova da RECPSP.

Base: `docs/specs/arquitetura-alvo.md` (secoes 3, 6 e 7) e ADR 0001 da frente.

Regra de segredos (ADR 0002 / arquitetura-alvo, secao 7): valor sensivel so
chega por variavel de ambiente. A ausencia derruba o boot em producao
(`prod.py`); em desenvolvimento (`dev.py`) vira segredo efemero por processo,
para que nenhum segredo fixo fique versionado.
"""

from __future__ import annotations

import os
from pathlib import Path

# backend/config/settings/base.py -> backend/
BASE_DIR = Path(__file__).resolve().parents[2]
# Raiz do repositorio (o `frontend/` e irmao do `backend/`).
REPO_DIR = BASE_DIR.parent


def variavel(nome: str, padrao: str = "") -> str:
    """Le uma variavel de ambiente ja sem espaco nas pontas."""
    return os.environ.get(nome, padrao).strip()


def lista(nome: str, padrao: str = "") -> list[str]:
    """Le uma variavel de ambiente separada por virgula."""
    return [item.strip() for item in variavel(nome, padrao).split(",") if item.strip()]


def booleana(nome: str, padrao: bool = False) -> bool:
    """Le uma variavel de ambiente como booleana."""
    bruto = variavel(nome)
    if not bruto:
        return padrao
    return bruto.lower() in {"1", "true", "on", "sim", "yes"}


# --- Aplicacoes -------------------------------------------------------------

# Uma aplicacao por dominio (arquitetura-alvo, secao 4). Todas nascem vazias na
# etapa 0 e ganham modelos nas etapas 1 a 5 do plano de implementacao.
APPS_DO_PROJETO = [
    "apps.contas",
    "apps.taxonomia",
    "apps.forum",
    "apps.capacitacao",
    "apps.mensagens",
    "apps.portal",
    "apps.indicadores",
]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    *APPS_DO_PROJETO,
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "csp.middleware.CSPMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# --- Banco (ADR 0001 da frente: PostgreSQL, porta 5434 em loopback) ---------

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": variavel("RECPSP_DB_NAME", "recpsp"),
        "USER": variavel("RECPSP_DB_USER", "recpsp"),
        "PASSWORD": variavel("RECPSP_DB_PASSWORD"),
        "HOST": variavel("RECPSP_DB_HOST", "127.0.0.1"),
        "PORT": variavel("RECPSP_DB_PORT", "5432"),
        "CONN_MAX_AGE": 60,
    }
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# --- Localizacao ------------------------------------------------------------

LANGUAGE_CODE = "pt-br"
TIME_ZONE = "America/Sao_Paulo"
USE_I18N = True
USE_TZ = True

# --- Subcaminho limpo (ADR-005 transversal; arquitetura-alvo, secao 6) ------
#
# Os quatro pontos do contrato sao por variavel de ambiente, nenhum chumbado.
# Criterio de aceite: trocar o prefixo e reconstruir sem tocar em codigo.
BASE_PATH = variavel("RECPSP_BASE_PATH", "/")
if not BASE_PATH.startswith("/"):
    BASE_PATH = "/" + BASE_PATH
if not BASE_PATH.endswith("/"):
    BASE_PATH = BASE_PATH + "/"

if BASE_PATH != "/":
    # Faz `reverse()` e `{% url %}` gerarem o caminho publico correto quando a
    # aplicacao esta montada sob subcaminho atras da borda da SGGD.
    FORCE_SCRIPT_NAME = BASE_PATH.rstrip("/")

# Caminho proprio do admin (ADR-005: candidato ao subdominio administrativo).
ADMIN_URL = variavel("RECPSP_ADMIN_PATH", "gestao/").lstrip("/")

# --- Estaticos --------------------------------------------------------------

STATIC_URL = f"{BASE_PATH}static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# Fonte unica dos tokens e das fontes do design system (ADR-007 transversal).
# O front e' o dono dos arquivos; a pagina servida pelo Django le os MESMOS,
# para que nao exista um segundo lugar com valor de cor.
#
# Aponta para `estatico/`, e NAO para `estilos/` inteiro: so o que esta la'
# dentro e' CSS puro, servivel como esta. O resto (`index.css`, `tema.css`,
# `base.css`, `componentes.css`) depende do Vite e do Tailwind, e um
# `@import "tailwindcss"` num diretorio publicado derruba o `collectstatic` de
# producao — que reescreve toda referencia dentro de CSS. Sob teste em
# `backend/tests/test_estaticos.py`.
DIRETORIO_ESTATICO_DO_FRONT = REPO_DIR / "frontend" / "src" / "estilos" / "estatico"
STATICFILES_DIRS = [DIRETORIO_ESTATICO_DO_FRONT] if DIRETORIO_ESTATICO_DO_FRONT.is_dir() else []

# O armazenamento com manifesto (hash no nome do arquivo) exige `collectstatic`
# e so entra em producao — ver `prod.py`. Em desenvolvimento e nos testes, o
# armazenamento simples evita depender de um passo de build para servir um CSS.
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}

# --- Sessao (arquitetura-alvo, secao 3: cookie HttpOnly, nunca localStorage) -

SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_HTTPONLY = False  # o front precisa ler o token para enviar no cabecalho
CSRF_COOKIE_SAMESITE = "Lax"

# --- Politica de seguranca de conteudo (arquitetura-alvo, secao 7) ----------
#
# Estrita desde o primeiro commit: sem `unsafe-inline`, sem `unsafe-eval`,
# nenhuma origem externa. Fontes e estilos sao servidos pela propria aplicacao
# (ADR-007: nada de requisicao ao Google por visitante).
CONTENT_SECURITY_POLICY = {
    "DIRECTIVES": {
        "default-src": ["'none'"],
        "script-src": ["'self'"],
        "style-src": ["'self'"],
        "img-src": ["'self'", "data:"],
        "font-src": ["'self'"],
        "connect-src": ["'self'"],
        "manifest-src": ["'self'"],
        "base-uri": ["'self'"],
        "form-action": ["'self'"],
        "frame-ancestors": ["'none'"],
        "object-src": ["'none'"],
    }
}

X_FRAME_OPTIONS = "DENY"
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
SECURE_CROSS_ORIGIN_OPENER_POLICY = "same-origin"

# --- Registro ---------------------------------------------------------------

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {"simples": {"format": "[{levelname}] {name}: {message}", "style": "{"}},
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "simples"},
    },
    "root": {"handlers": ["console"], "level": variavel("DJANGO_LOG_LEVEL", "INFO")},
}

# Versao da API exposta pelo endpoint de saude.
VERSAO_DA_API = "1.0.0"
