/**
 * O modal, pelo teclado.
 *
 * O legado tinha 2 modais ad hoc SEM tratamento de teclado — um deles
 * bloqueante e sem saida, o que prende quem nao usa ponteiro. A regra 3 do
 * ADR-007 exige tres coisas de toda sobreposicao: fecha com Esc, prende o foco
 * enquanto esta aberta e DEVOLVE o foco a quem a abriu.
 *
 * Nada disso e' reimplementado a' mao (regra 4): quem entrega e' o Radix
 * Dialog. O que estes testes conferem e' que a fiacao esta certa.
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Botao } from "./Botao";
import { Modal } from "./Modal";

function Exemplo() {
  return (
    <Modal titulo="Confirmar exclusao" gatilho={<Botao>Excluir</Botao>}>
      <p>Esta acao nao pode ser desfeita.</p>
    </Modal>
  );
}

describe("Modal", () => {
  it("abre pelo teclado, a partir do gatilho", async () => {
    render(<Exemplo />);

    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Excluir" })).toHaveFocus();
    await userEvent.keyboard("{Enter}");

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("tem nome acessivel — o titulo, e nao `dialogo`", async () => {
    render(<Exemplo />);

    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));

    expect(await screen.findByRole("dialog", { name: "Confirmar exclusao" })).toBeInTheDocument();
  });

  it("leva o foco para dentro assim que abre", async () => {
    render(<Exemplo />);

    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));
    const dialogo = await screen.findByRole("dialog");

    await waitFor(() =>
      expect(dialogo).toContainElement(document.activeElement as HTMLElement | null),
    );
  });

  it("fecha com Esc e DEVOLVE o foco a quem abriu", async () => {
    // Sem a devolucao, quem navega por teclado volta para o inicio do
    // documento e precisa refazer todo o caminho.
    render(<Exemplo />);

    const gatilho = screen.getByRole("button", { name: "Excluir" });
    await userEvent.click(gatilho);
    await screen.findByRole("dialog");

    await userEvent.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(gatilho).toHaveFocus());
  });

  it("o botao de fechar tem nome, e nao so um X", async () => {
    render(<Exemplo />);

    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));
    await screen.findByRole("dialog");

    expect(screen.getByRole("button", { name: /fechar/i })).toBeInTheDocument();
  });

  it("a descricao opcional e' ligada ao dialogo, nao solta dentro dele", async () => {
    render(
      <Modal
        titulo="Confirmar exclusao"
        descricao="O topico sai do ar imediatamente."
        gatilho={<Botao>Excluir</Botao>}
      >
        <p>Corpo</p>
      </Modal>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));

    expect(await screen.findByRole("dialog")).toHaveAccessibleDescription(
      "O topico sai do ar imediatamente.",
    );
  });
});
