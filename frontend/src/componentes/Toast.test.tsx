/**
 * O toast — a confirmacao passageira.
 *
 * Substitui os 21 `alert()` do legado, que travam a aba inteira, nao se
 * estilizam e nao dizem nada util a um leitor de tela alem do texto cru.
 *
 * Comportamento do Radix Toast; aqui se confere a fiacao.
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Botao } from "./Botao";
import { ProvedorDeToast, useToast } from "./Toast";

function Exemplo() {
  const { mostrar } = useToast();
  return (
    <Botao aoClicar={() => mostrar({ variante: "sucesso", titulo: "Topico enviado a' curadoria" })}>
      Enviar
    </Botao>
  );
}

function Montado() {
  return (
    <ProvedorDeToast>
      <Exemplo />
    </ProvedorDeToast>
  );
}

describe("Toast", () => {
  it("aparece com o texto pedido depois de uma acao", async () => {
    render(<Montado />);

    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));

    expect(await screen.findByText("Topico enviado a' curadoria")).toBeInTheDocument();
  });

  it("e' anunciado por regiao viva, e nao so desenhado", async () => {
    render(<Montado />);

    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));

    const aviso = await screen.findByRole("status");
    expect(aviso).toHaveAttribute("aria-live");
  });

  it("o botao de fechar tem nome e responde ao teclado", async () => {
    render(<Montado />);

    await userEvent.click(screen.getByRole("button", { name: "Enviar" }));
    const fechar = await screen.findByRole("button", { name: /fechar/i });

    fechar.focus();
    await userEvent.keyboard("{Enter}");

    await waitFor(() =>
      expect(screen.queryByText("Topico enviado a' curadoria")).not.toBeInTheDocument(),
    );
  });

  it("usar `useToast` fora do provedor falha alto, e nao em silencio", () => {
    // Em silencio, a mensagem simplesmente nunca apareceria — e o defeito so
    // seria notado por quem esperava a confirmacao.
    expect(() => render(<Exemplo />)).toThrow(/ProvedorDeToast/);
  });
});
