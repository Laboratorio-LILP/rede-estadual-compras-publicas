# Imagem do servidor de desenvolvimento do front (Vite).
#
# So existe o alvo de desenvolvimento: em homologacao e producao o front e um
# build estatico servido pelo proprio Django (arquitetura-alvo, secao 1) — nao
# ha contentor de front no ar.
#
# Contexto de build: a RAIZ do repositorio.

FROM node:22-bookworm-slim AS dev

ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false

WORKDIR /app/frontend

# `npm ci` exige o lock e instala exatamente o que ele diz. O lock e gerado
# dentro de um conteiner, nunca pelo npm da maquina — foi a divergencia entre o
# npm 11 do Mac e o npm 10 da imagem que motivou o ADR-008.
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# O codigo chega por volume montado; `node_modules` fica num volume proprio
# para que o monte do host nao o encubra.
EXPOSE 5173
CMD ["npm", "run", "dev"]
