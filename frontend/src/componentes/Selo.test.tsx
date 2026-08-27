/**
 * O selo — rotulo curto de classificacao.
 *
 * O legado tinha 37 pilulas em 24 formas, com `ROLE_STYLES` divergente (a
 * mesma funcao aparecia azul numa tela e verde noutra) e 5 das 8 cores
 * reprovando AA. As cinco variantes daqui tem par de cor medido em
 * `estilos/tokens.test.ts`.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Selo } from "./Selo";

describe("Selo", () => {
  it("diz o que e' por texto, nao so por cor", () => {
    // WCAG 1.4.1: cor nao pode ser o unico meio de transmitir informacao.
    render(<Selo variante="papel">Moderador</Selo>);

    expect(screen.getByText("Moderador")).toBeInTheDocument();
  });

  it.each(["papel", "especialidade", "formato", "nivel", "situacao"] as const)(
    "aceita a variante %s do inventario",
    (variante) => {
      render(<Selo variante={variante}>Rotulo</Selo>);

      expect(screen.getByText("Rotulo")).toHaveClass("selo", `selo--${variante}`);
    },
  );

  it("nao e' interativo: nao entra na ordem de tabulacao", () => {
    render(<Selo variante="papel">Moderador</Selo>);

    const selo = screen.getByText("Moderador");
    expect(selo.tagName).toBe("SPAN");
    expect(selo).not.toHaveAttribute("tabindex");
  });

  it("aceita um prefixo lido junto, para o selo fazer sentido fora de contexto", () => {
    // "Especialista em Selecao do Fornecedor" e' o termo especifico que o
    // ADR 0003 exige — nunca o rotulo generico do grupo.
    render(
      <Selo variante="especialidade" prefixoAcessivel="Especialidade:">
        Selecao do Fornecedor
      </Selo>,
    );

    expect(screen.getByText("Especialidade:")).toHaveClass("so-leitor-de-tela");
  });
});
