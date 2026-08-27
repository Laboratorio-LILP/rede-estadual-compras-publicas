/**
 * Configuracao do Playwright para o piso de acessibilidade (ADR-007).
 *
 * Roda DENTRO de um conteiner proprio (ADR-008), com a imagem oficial do
 * Playwright — que ja' traz o Chromium e as bibliotecas de sistema. Nao se
 * instala navegador na maquina de ninguem.
 *
 * As URLs sao NOMES DE SERVICO da rede do Compose (`frontend`, `backend`), e
 * nao `127.0.0.1`: de dentro de um conteiner, o loopback e' o do proprio
 * conteiner. A publicacao em `127.0.0.1` no host, que garante o ADR-004, nao
 * tem nada a ver com este caminho — ver `docs/adr/0004-loopback-em-conteiner.md`.
 */

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./testes",
  // Sem tentativa nova: teste de acessibilidade que passa na segunda vez esta
  // escondendo uma condicao de corrida, nao provando conformidade.
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.RECPSP_URL_FRONT ?? "http://frontend:5173",
    // Colhe o rastro so quando falha: um relatorio de axe e' mais util com a
    // captura da tela em que o defeito apareceu.
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
