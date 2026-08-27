/**
 * Cliente HTTP unico da aplicacao.
 *
 * Existe um so ponto de saida para a API — e dele que sai o cabecalho CSRF e
 * o envio de cookie de sessao (arquitetura-alvo, secao 3: sessao por cookie
 * `HttpOnly`, nunca token em `localStorage`).
 *
 * Na etapa 1 este modulo passa a ser consumido pelo TanStack Query, e os tipos
 * de resposta passam a vir do contrato OpenAPI (`npm run tipos:api`).
 */

import { URL_DA_API } from "../configuracao";

export class ErroDaApi extends Error {
  constructor(
    readonly status: number,
    mensagem: string,
  ) {
    super(mensagem);
    this.name = "ErroDaApi";
  }
}

export async function pedir<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  const resposta = await fetch(`${URL_DA_API}${caminho}`, {
    // O cookie de sessao viaja sozinho; nao ha token a anexar a mao.
    credentials: "same-origin",
    headers: { Accept: "application/json", ...opcoes.headers },
    ...opcoes,
  });

  if (!resposta.ok) {
    throw new ErroDaApi(resposta.status, `A API respondeu ${resposta.status}.`);
  }

  return (await resposta.json()) as T;
}
