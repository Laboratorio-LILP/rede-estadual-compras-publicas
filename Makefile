# Makefile da RECPSP — porta de entrada canonica das duas geracoes.
#
# BASE NOVA (Django + PostgreSQL + Vite): verbos sem prefixo — `make up`,
# `make test`, `make lint`... Toda ferramenta roda DENTRO do conteiner
# (ADR-008 transversal). Nada exige Python, Node ou banco na maquina.
#
# DEMONSTRACAO HERDADA (Express + SQLite + CRA): verbos sob o prefixo `demo-`.
# Congelada (ADR 0002): nenhuma funcionalidade nova, so correcao de seguranca
# critica. Some da arvore no corte unico (etapa 6 do plano).
#
# Regra do ADR-008: nenhum comando existe so no `.devcontainer/`. O que ele
# faz, este arquivo faz.

PROJETO_NOVA = lilp-recpsp-nova
COMPOSE_NOVA_ARQUIVO = docker/docker-compose.dev.yml
ENV_ARG = $(shell test -f .env && echo --env-file .env)
COMPOSE_NOVA = docker compose $(ENV_ARG) -f $(COMPOSE_NOVA_ARQUIVO)
COMPOSE_DEMO = docker compose

# `run --rm` sobe as dependencias declaradas; `--no-deps` evita subir o banco
# quando ele nao e necessario.
BACK = $(COMPOSE_NOVA) run --rm backend
BACK_SEM_BANCO = $(COMPOSE_NOVA) run --rm --no-deps backend
FRONT = $(COMPOSE_NOVA) run --rm --no-deps frontend

PORTA_APP = $(shell grep -E '^RECPSP_APP_PORT=' .env 2>/dev/null | cut -d= -f2 | tr -d '[:space:]')
PORTA_APP := $(if $(PORTA_APP),$(PORTA_APP),8004)
PORTA_WEB = $(shell grep -E '^RECPSP_WEB_PORT=' .env 2>/dev/null | cut -d= -f2 | tr -d '[:space:]')
PORTA_WEB := $(if $(PORTA_WEB),$(PORTA_WEB),5173)

.PHONY: help setup check-env build up down restart ps logs shell shell-front \
        migrate makemigrations superusuario test test-back test-front \
        lint lint-back lint-front lint-tipos lint-tokens format \
        a11y-check saude auditoria imagem build-app ci clean \
        demo-setup demo-build demo-up demo-down demo-restart demo-logs \
        demo-ps demo-shell demo-test demo-clean

# --- Ajuda ------------------------------------------------------------------

help: ## Lista os comandos disponiveis
	@echo "Base nova (Django + PostgreSQL + Vite):"
	@grep -E '^[a-z][a-z0-9-]*:.*##' $(MAKEFILE_LIST) | grep -v '^demo-' \
	  | awk -F':.*## ' '{printf "  %-16s %s\n", $$1, $$2}'
	@echo ""
	@echo "Demonstracao herdada (congelada — so correcao de seguranca critica):"
	@grep -E '^demo-[a-z-]*:.*##' $(MAKEFILE_LIST) \
	  | awk -F':.*## ' '{printf "  %-16s %s\n", $$1, $$2}'

# --- Ciclo de vida da base nova ---------------------------------------------

setup: check-env build up ## 1a vez: valida o .env, constroi as imagens e sobe
	@echo ""
	@echo "Aplicacao Django:   http://127.0.0.1:$(PORTA_APP)"
	@echo "Front (Vite):       http://127.0.0.1:$(PORTA_WEB)"
	@echo "Saude da API:       http://127.0.0.1:$(PORTA_APP)/api/v1/saude"
	@echo ""
	@echo "Confira com: make saude"

check-env:
	@test -f .env || { \
	  echo "ERRO: .env nao existe. Copie o modelo e defina o segredo do banco:"; \
	  echo "  cp .env.example .env"; \
	  echo "  openssl rand -hex 32   # use o resultado como RECPSP_DB_PASSWORD"; \
	  exit 1; }
	@grep -qE '^RECPSP_DB_PASSWORD=.+' .env || { \
	  echo "ERRO: RECPSP_DB_PASSWORD esta vazia no .env (sem fallback, de proposito)."; \
	  echo "  openssl rand -hex 32"; \
	  exit 1; }

build: ## Constroi as imagens e renova as dependencias do front
	$(COMPOSE_NOVA) build
	@# O `node_modules` vive num volume para nao ser encoberto pelo monte do
	@# host. Sem renova-lo aqui, uma dependencia nova entra na imagem e o
	@# conteiner segue rodando a instalacao antiga — falha silenciosa e cara.
	@$(COMPOSE_NOVA) rm --stop --force frontend >/dev/null 2>&1 || true
	@docker volume rm $(PROJETO_NOVA)_node_modules >/dev/null 2>&1 || true
	@echo "Imagens construidas; dependencias do front renovadas."

up: check-env ## Sobe os tres servicos (app 8004, Postgres 5434, Vite 5173 — loopback)
	$(COMPOSE_NOVA) up -d

down: ## Derruba os servicos (o banco fica no volume)
	$(COMPOSE_NOVA) down

restart: ## Reinicia os servicos
	$(COMPOSE_NOVA) restart

ps: ## Estado dos servicos
	$(COMPOSE_NOVA) ps

logs: ## Acompanha os logs
	$(COMPOSE_NOVA) logs -f

shell: ## Shell no conteiner do back
	$(COMPOSE_NOVA) exec backend bash

shell-front: ## Shell no conteiner do front
	$(COMPOSE_NOVA) exec frontend bash

saude: ## Confere a aplicacao e o repasse /api do servidor de front
	@echo "-> Django em 127.0.0.1:$(PORTA_APP)"
	@curl --fail --silent --show-error http://127.0.0.1:$(PORTA_APP)/api/v1/saude && echo ""
	@echo "-> CSP da pagina raiz"
	@curl --silent --head http://127.0.0.1:$(PORTA_APP)/ | grep -i '^content-security-policy'
	@echo "-> Vite em 127.0.0.1:$(PORTA_WEB), repassando /api"
	@curl --fail --silent --show-error http://127.0.0.1:$(PORTA_WEB)/api/v1/saude && echo ""

# --- Banco ------------------------------------------------------------------

migrate: ## Aplica as migracoes
	$(BACK) python manage.py migrate

makemigrations: ## Gera migracoes a partir dos modelos
	$(BACK) python manage.py makemigrations

superusuario: ## Cria uma conta de administracao
	$(COMPOSE_NOVA) run --rm backend python manage.py createsuperuser

# --- Verificacao ------------------------------------------------------------

test: test-back test-front ## Roda toda a suite, de dentro do conteiner

test-back: ## Testes do back (pytest)
	$(BACK) python -m pytest

test-front: ## Testes do front (Vitest)
	$(FRONT) npm run test

lint: lint-back lint-tipos lint-front lint-tokens ## Roda todas as verificacoes estaticas

lint-back: ## ruff (regras e formatacao)
	$(BACK_SEM_BANCO) sh -c "ruff check . && ruff format --check ."

lint-tipos: ## mypy no back e tsc no front
	$(BACK_SEM_BANCO) mypy .
	$(FRONT) npm run lint:tipos

lint-front: ## ESLint
	$(FRONT) npm run lint

lint-tokens: ## Proibe hexadecimal de cor fora do arquivo de tokens
	$(FRONT) npm run lint:tokens

format: ## Formata o back (ruff)
	@# Formata ANTES de corrigir regras. Na ordem inversa, um erro que o ruff
	@# nao sabe consertar sozinho (E501, por exemplo) derruba o `check --fix` e
	@# o `format` nunca roda — justo no caso em que formatar resolveria.
	$(BACK_SEM_BANCO) sh -c "ruff format . && ruff check --fix ."

a11y-check: ## Piso de acessibilidade do ADR-007 (axe-core + HTML_CodeSniffer + teclado)
	@# Mede as PAGINAS NO AR, entao o stack precisa estar de pe. O `up` aqui e'
	@# idempotente e barato; sem ele, a esteira mediria uma porta fechada e
	@# passaria por engano.
	$(MAKE) up
	$(COMPOSE_NOVA) run --rm --build a11y

build-app: ## Constroi o front e confere o back para implantacao
	$(FRONT) npm run build
	@# Valores descartaveis, sorteados dentro do conteiner: existem so durante a
	@# checagem e nao alcancam arquivo nenhum. A chave precisa ser longa, senao a
	@# propria checagem reprova (security.W009) — o que e o comportamento certo.
	$(BACK_SEM_BANCO) sh -c 'export DJANGO_SETTINGS_MODULE=config.settings.prod \
	  DJANGO_SECRET_KEY=$$(python -c "import secrets; print(secrets.token_urlsafe(64))") \
	  RECPSP_ALLOWED_HOSTS=recpsp.exemplo.gov.br \
	  RECPSP_DB_PASSWORD=$$(python -c "import secrets; print(secrets.token_urlsafe(32))") \
	  && python manage.py check --deploy --fail-level WARNING'

auditoria: ## Auditoria de dependencias (back, front e acessibilidade)
	$(BACK_SEM_BANCO) pip-audit --requirement requirements.txt --requirement requirements-dev.txt
	$(FRONT) npm audit --audit-level=high
	@# A cadeia do laco de acessibilidade tambem e' cadeia. Roda no conteiner do
	@# front, contra o lock de `a11y/`, para nao ter que construir a imagem do
	@# Playwright (mais de um giga) so para auditar.
	$(FRONT) npm audit --audit-level=high --prefix ../a11y

imagem: ## Constroi a imagem de producao do back
	docker build --file docker/backend/Dockerfile --target prod --tag lilp-recpsp-nova:prod .

ci: lint test build-app a11y-check ## O mesmo laco que a esteira roda
	@# O `a11y-check` entra aqui de propria: se `make ci` nao rodar o que a
	@# esteira roda, o alvo mente. O custo e' a imagem do Playwright na
	@# primeira execucao — depois fica em cache.

clean: ## Derruba os servicos e APAGA os volumes (banco e node_modules)
	$(COMPOSE_NOVA) down -v

# --- Demonstracao herdada (congelada) ---------------------------------------

demo-setup: ## 1a vez da demonstracao: valida o .env, constroi e sobe
	@test -f .env || { \
	  echo "ERRO: .env nao existe. Copie o modelo e defina JWT_SECRET:"; \
	  echo "  cp .env.example .env"; \
	  echo "  openssl rand -hex 32   # use o resultado como JWT_SECRET"; \
	  exit 1; }
	$(MAKE) demo-build
	$(MAKE) demo-up
	@echo ""
	@echo "Demonstracao no ar: http://127.0.0.1:$${RECPSP_PORT:-8003}"

demo-build: ## Constroi a imagem da demonstracao
	$(COMPOSE_DEMO) build

demo-up: ## Sobe a demonstracao (loopback 8003)
	$(COMPOSE_DEMO) up -d

demo-down: ## Derruba a demonstracao (o banco fica no volume)
	$(COMPOSE_DEMO) down

demo-restart: ## Reinicia a demonstracao
	$(COMPOSE_DEMO) restart

demo-logs: ## Acompanha os logs da demonstracao
	$(COMPOSE_DEMO) logs -f web

demo-ps: ## Estado da demonstracao
	$(COMPOSE_DEMO) ps

demo-shell: ## Shell no conteiner da demonstracao
	$(COMPOSE_DEMO) exec web bash

demo-test: ## Testes da demonstracao (no host; requer Node 18+)
	CI=true npm test
	npm run test:api

demo-clean: ## Derruba a demonstracao e APAGA o volume — o banco demo e perdido
	$(COMPOSE_DEMO) down -v
