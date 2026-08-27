/// <reference types="vite/client" />

/**
 * Prefixo da API, injetado no build a partir de `RECPSP_API_URL`
 * (`vite.config.ts`). Vazio quando nao configurado — nesse caso vale o padrao
 * derivado da base (ver `configuracao.ts`).
 */
declare const __RECPSP_API_URL__: string;
