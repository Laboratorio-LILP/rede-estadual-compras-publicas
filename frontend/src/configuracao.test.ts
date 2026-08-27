import { describe, expect, it } from "vitest";

import { montarUrlDaApi } from "./configuracao";

describe("montarUrlDaApi", () => {
  it("deriva o prefixo da base quando nada e configurado", () => {
    expect(montarUrlDaApi("/", "")).toBe("/api/v1");
  });

  it("respeita a base quando a aplicacao mora sob subcaminho", () => {
    expect(montarUrlDaApi("/rede/", "")).toBe("/rede/api/v1");
  });

  it("aceita um prefixo explicito, inclusive absoluto", () => {
    expect(montarUrlDaApi("/rede/", "https://exemplo.gov.br/api/v1")).toBe(
      "https://exemplo.gov.br/api/v1",
    );
  });

  it("nao deixa barra sobrando no fim", () => {
    expect(montarUrlDaApi("/", "/api/v1/")).toBe("/api/v1");
  });
});
