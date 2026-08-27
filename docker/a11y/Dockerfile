# Imagem do laco de acessibilidade (ADR-007 + ADR-008).
#
# Parte da imagem OFICIAL do Playwright, que ja' traz o Chromium e as
# bibliotecas de sistema de que ele precisa. A alternativa — instalar navegador
# na imagem do front — engordaria o ambiente de desenvolvimento inteiro por uma
# verificacao que roda sob demanda.
#
# A etiqueta da imagem acompanha a versao de `@playwright/test` em
# `a11y/package.json`. As duas precisam casar: o Playwright recusa um navegador
# de versao diferente da que ele espera.
#
# Contexto de build: a RAIZ do repositorio.

FROM mcr.microsoft.com/playwright:v1.62.1-noble

ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false

WORKDIR /trabalho

COPY a11y/package.json a11y/package-lock.json ./
RUN npm ci

# O codigo dos testes chega por volume montado (ver o Compose).
CMD ["npx", "playwright", "test"]
