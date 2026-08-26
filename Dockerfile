# syntax=docker/dockerfile:1
# Imagem da RECPSP — monólito Node: API Express + build estático do React.
# Dois estágios: o primeiro compila o front; o segundo carrega só o runtime.

# ---------- estágio 1: build do front ----------
FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY postcss.config.js tailwind.config.js craco.config.js ./
COPY public ./public
COPY src ./src
# Sem o runtime chunk embutido no index.html, a CSP do servidor pode manter
# script-src 'self' — nenhum <script> inline precisa ser liberado.
ENV INLINE_RUNTIME_CHUNK=false
RUN npm run build

# ---------- estágio 2: runtime ----------
FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app

# Só as dependências de runtime do servidor (o front já está compilado).
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY server ./server
COPY --from=build /app/build ./build

# O SQLite vive em /data (volume nomeado no compose), fora da árvore da app.
RUN mkdir -p /data && chown node:node /data

USER node
EXPOSE 3001
CMD ["node", "server/index.js"]
