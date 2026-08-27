# Imagem da aplicacao Django da base nova da RECPSP.
#
# Dois alvos: `dev` (ferramental completo, usado pelo Compose de
# desenvolvimento e pela integracao continua — ADR-008) e `prod` (so o
# necessario para servir, usado na homologacao e na producao).
#
# Contexto de build: a RAIZ do repositorio.

# --- Base comum -------------------------------------------------------------
FROM python:3.12-slim-bookworm AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# `curl` serve a sonda de saude do Compose e da esteira.
RUN apt-get update \
    && apt-get install --no-install-recommends -y curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

# --- Desenvolvimento e verificacao ------------------------------------------
FROM base AS dev

# O ferramental (pytest, ruff, mypy) mora na imagem, nunca na maquina: e o
# ponto inteiro do ADR-008 — o mesmo laco de verificacao na maquina, na sessao
# de agente e na integracao continua.
COPY backend/requirements.txt backend/requirements-dev.txt ./
RUN pip install --requirement requirements-dev.txt

# O codigo chega por volume montado (ver `docker/docker-compose.dev.yml`).
# Roda como root de proposito: a imagem de desenvolvimento so existe na maquina
# de quem programa e escreve num diretorio montado do host — o que evita a
# classe inteira de problemas de dono de arquivo entre macOS, Windows e Linux.
# A imagem publicada e a `prod`, e essa roda sem privilegio.
EXPOSE 8004
CMD ["python", "manage.py", "runserver", "0.0.0.0:8004"]

# --- Homologacao e producao -------------------------------------------------
FROM base AS prod

COPY backend/requirements.txt ./
RUN pip install --requirement requirements.txt

COPY backend/ /app/backend/
# Os tokens do design system sao servidos pela aplicacao (ADR-007: fonte e
# estilo do proprio servidor, sem requisicao ao Google por visitante).
COPY frontend/src/estilos/ /app/frontend/src/estilos/

# `collectstatic` precisa das settings de producao para gerar o manifesto com
# hash. Os valores abaixo existem so durante a construcao da imagem e nao sao
# segredos: nenhum deles alcanca o processo em execucao, que recebe os seus
# pelo ambiente.
RUN DJANGO_SETTINGS_MODULE=config.settings.prod \
    DJANGO_SECRET_KEY=apenas-para-collectstatic \
    RECPSP_ALLOWED_HOSTS=localhost \
    RECPSP_DB_PASSWORD=apenas-para-collectstatic \
    python manage.py collectstatic --noinput --clear

RUN useradd --create-home --uid 10001 recpsp \
    && chown -R recpsp:recpsp /app
USER recpsp

EXPOSE 8004
CMD ["gunicorn", "config.wsgi:application", \
     "--bind", "0.0.0.0:8004", \
     "--workers", "3", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
