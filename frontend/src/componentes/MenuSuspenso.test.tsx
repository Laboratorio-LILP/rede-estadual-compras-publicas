/**
 * O menu suspenso, pelo teclado.
 *
 * No legado a busca e as notificacoes eram menus inacessiveis por teclado:
 * abriam em `onMouseEnter` e fechavam em `onMouseLeave`, o que simplesmente
 * nao existe para quem navega por tabulacao.
 *
 * O comportamento vem do Radix DropdownMenu (regra 4 do ADR-007: nada de
 * teclado reimplementado a' mao).
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Botao } from "./Botao";
import { MenuSuspenso } from "./MenuSuspenso";

describe("MenuSuspenso", () => {
  const itens = (aoEscolher = vi.fn()) => [
    { chave: "perfil", texto: "Meu perfil", aoEscolher },
    { chave: "sair", texto: "Sair", aoEscolher },
  ];

  it("abre pelo teclado e anuncia o estado no gatilho", async () => {
    render(<MenuSuspenso gatilho={<Botao>Conta</Botao>} itens={itens()} />);

    const gatilho = screen.getByRole("button", { name: "Conta" });
    expect(gatilho).toHaveAttribute("aria-expanded", "false");

    await userEvent.tab();
    await userEvent.keyboard("{Enter}");

    expect(await screen.findByRole("menu")).toBeInTheDocument();
    await waitFor(() => expect(gatilho).toHaveAttribute("aria-expanded", "true"));
  });

  it("os itens sao itens de menu, e navegaveis com as setas", async () => {
    render(<MenuSuspenso gatilho={<Botao>Conta</Botao>} itens={itens()} />);

    await userEvent.click(screen.getByRole("button", { name: "Conta" }));
    await screen.findByRole("menu");

    const opcoes = screen.getAllByRole("menuitem");
    expect(opcoes).toHaveLength(2);

    await userEvent.keyboard("{ArrowDown}");
    await waitFor(() => expect(opcoes[0]).toHaveFocus());
    await userEvent.keyboard("{ArrowDown}");
    await waitFor(() => expect(opcoes[1]).toHaveFocus());
  });

  it("escolher um item pelo teclado dispara a acao", async () => {
    const aoEscolher = vi.fn();
    render(<MenuSuspenso gatilho={<Botao>Conta</Botao>} itens={itens(aoEscolher)} />);

    await userEvent.click(screen.getByRole("button", { name: "Conta" }));
    await screen.findByRole("menu");

    await userEvent.keyboard("{ArrowDown}");
    await userEvent.keyboard("{Enter}");

    await waitFor(() => expect(aoEscolher).toHaveBeenCalledTimes(1));
  });

  it("fecha com Esc e devolve o foco ao gatilho", async () => {
    render(<MenuSuspenso gatilho={<Botao>Conta</Botao>} itens={itens()} />);

    const gatilho = screen.getByRole("button", { name: "Conta" });
    await userEvent.click(gatilho);
    await screen.findByRole("menu");

    await userEvent.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
    await waitFor(() => expect(gatilho).toHaveFocus());
  });
});
