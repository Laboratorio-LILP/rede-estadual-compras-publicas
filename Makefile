# Makefile da RECPSP — comandos padronizados do LILP (compose `lilp-recpsp`).
# Requisitos: Docker + Docker Compose v2. Para `make test`, Node 18+ no host.

COMPOSE = docker compose

.PHONY: help setup check-env build up down restart logs ps shell test clean

help: ## Lista os comandos disponíveis
	@grep -E '^[a-z-]+:.*##' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  %-12s %s\n", $$1, $$2}'

setup: check-env build up ## 1ª vez: valida .env, constrói a imagem e sobe
	@echo ""
	@echo "RECPSP no ar: http://localhost:$${RECPSP_PORT:-8003}"
	@echo "O seed criou o admin inicial — troque a senha (ver README, 'Primeiro acesso')."

check-env:
	@test -f .env || { \
	  echo "ERRO: .env não existe. Copie o modelo e defina JWT_SECRET:"; \
	  echo "  cp .env.example .env"; \
	  echo "  openssl rand -hex 32   # use o resultado como JWT_SECRET"; \
	  exit 1; }

build: ## Constrói a imagem
	$(COMPOSE) build

up: ## Sobe o container
	$(COMPOSE) up -d

down: ## Derruba o container (o banco fica no volume)
	$(COMPOSE) down

restart: ## Reinicia o container
	$(COMPOSE) restart

logs: ## Acompanha os logs
	$(COMPOSE) logs -f web

ps: ## Estado do stack
	$(COMPOSE) ps

shell: ## Shell dentro do container
	$(COMPOSE) exec web bash

test: ## Roda os testes do front (no host; requer Node 18+)
	CI=true npm test

clean: ## Derruba e APAGA o volume — o banco do fórum é perdido
	$(COMPOSE) down -v
