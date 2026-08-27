// Os tipos de `test` vem do proprio `defineConfig` de `vitest/config`.
import tailwindcss from "@tailwindcss/postcss";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * Configuracao do Vite.
 *
 * Subcaminho limpo (ADR-005 transversal; arquitetura-alvo, secao 6): a base do
 * build e o prefixo da API vem do ambiente. Trocar o prefixo e reconstruir nao
 * exige tocar em codigo.
 */

function normalizarBase(bruto: string): string {
  let base = bruto.trim() || "/";
  if (!base.startsWith("/")) base = `/${base}`;
  if (!base.endsWith("/")) base = `${base}/`;
  return base;
}

const base = normalizarBase(process.env.RECPSP_BASE_PATH ?? "/");

/**
 * ATENCAO — nao trocar isto por `envPrefix: ["RECPSP_"]`.
 *
 * O prefixo largo exporia para o pacote do navegador TODA variavel comecada em
 * `RECPSP_` presente no ambiente de build — inclusive `RECPSP_DB_PASSWORD`.
 * Cada valor que o front pode ver entra aqui, um a um, de proposito.
 */
const definicoes = {
  __RECPSP_API_URL__: JSON.stringify(process.env.RECPSP_API_URL ?? ""),
};

export default defineConfig({
  base,
  plugins: [react()],
  define: definicoes,
  css: {
    // Declarado no lugar, e nao por arquivo: sem isto o Vite sobe a arvore
    // procurando configuracao de PostCSS e acha a da demonstracao herdada, que
    // carrega um binario compilado para o macOS do host dentro de um conteiner
    // Linux. E o modo de falha que motivou o ADR-008.
    //
    // O Tailwind da base nova entra AQUI, e nao por `postcss.config.js` na
    // raiz do front: um arquivo la' faria o Vite voltar a subir a arvore.
    // Nao existe `tailwind.config.js` — na versao 4 a configuracao e' CSS, e
    // mora em `src/estilos/tema.css`, que mapeia os tokens do ADR-007.
    postcss: { plugins: [tailwindcss()] },
  },
  server: {
    // Padrao loopback (ADR-004). Dentro do conteiner o Compose troca por
    // `0.0.0.0` — e a unica forma de o encaminhamento de porta do Docker
    // alcancar o processo. A garantia de loopback e a publicacao
    // `127.0.0.1:5173:5173` no host. Ver `docs/adr/0004-loopback-em-conteiner.md`.
    host: process.env.RECPSP_WEB_HOST ?? "127.0.0.1",
    port: Number(process.env.RECPSP_WEB_PORT ?? 5173),
    strictPort: true,
    // O Vite recusa requisicao cujo cabecalho `Host` ele nao conheca — e' a
    // protecao contra rebind de DNS, e o padrao (so `localhost` e literais de
    // IP) esta certo. De dentro da rede do Compose, porem, o navegador do
    // `make a11y-check` chega por `http://frontend:5173`, e a protecao barra.
    //
    // A lista vem do ambiente e nasce VAZIA: quem precisa, declara. Nunca
    // `true`, que desligaria a protecao inteira. O Compose acrescenta so
    // `frontend`, que e' nome de servico e so resolve dentro da rede privada
    // do projeto. Este servidor nao existe em producao — la' o front e' um
    // build estatico servido pelo Django.
    allowedHosts: (process.env.RECPSP_WEB_ALLOWED_HOSTS ?? "")
      .split(",")
      .map((nome) => nome.trim())
      .filter(Boolean),
    // Volume montado no macOS nao entrega evento de arquivo de forma confiavel.
    watch: process.env.RECPSP_WEB_POLLING === "1" ? { usePolling: true } : undefined,
    proxy: {
      "/api": {
        target: process.env.RECPSP_API_PROXY ?? "http://127.0.0.1:8004",
        changeOrigin: false,
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
