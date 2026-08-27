/**
 * Configuracao de ambiente do front.
 *
 * Os dois pontos do contrato de subcaminho limpo que vivem aqui (ADR-005
 * transversal; arquitetura-alvo, secao 6): a base do build e o prefixo da API.
 * Nenhum dos dois e chumbado.
 */

/** Monta o prefixo da API a partir da base e do valor configurado. */
export function montarUrlDaApi(base: string, configurado: string): string {
  if (configurado.trim()) {
    return configurado.trim().replace(/\/+$/, "");
  }
  return `${base.replace(/\/+$/, "")}/api/v1`;
}

/** Base publica da aplicacao. O Vite preenche a partir de `RECPSP_BASE_PATH`. */
export const CAMINHO_BASE: string = import.meta.env.BASE_URL;

/** Prefixo de toda chamada de API. */
export const URL_DA_API: string = montarUrlDaApi(CAMINHO_BASE, __RECPSP_API_URL__);
