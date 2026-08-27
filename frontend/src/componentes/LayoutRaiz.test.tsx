/**
 * O layout raiz — a estrutura que toda pagina herda.
 *
 * A rota `/` do legado nao tinha NENHUM `h1`, e a navegacao primaria sumia
 * abaixo de 768px sem substituto. Aqui as tres garantias do ADR-007 sao
 * estruturais: landmarks, skip link e um unico `h1` por pagina.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { LayoutRaiz } from "./LayoutRaiz";

describe("LayoutRaiz", () => {
  it("tem os quatro landmarks que um leitor de tela usa para saltar", () => {
    render(
      <LayoutRaiz titulo="Centro de capacitacao" navegacao={<a href="/forum">Forum</a>}>
        Conteudo
      </LayoutRaiz>,
    );

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("tem exatamente um h1, e e' o titulo da pagina", () => {
    render(<LayoutRaiz titulo="Centro de capacitacao">Conteudo</LayoutRaiz>);

    const titulos = screen.getAllByRole("heading", { level: 1 });
    expect(titulos).toHaveLength(1);
    expect(titulos[0]).toHaveTextContent("Centro de capacitacao");
  });

  it("o skip link e' o PRIMEIRO alvo da tabulacao e leva ao conteudo", async () => {
    // Se nao for o primeiro, quem navega por teclado atravessa a navegacao
    // inteira em toda pagina antes de chegar ao texto.
    render(
      <LayoutRaiz titulo="Pagina" navegacao={<a href="/forum">Forum</a>}>
        Conteudo
      </LayoutRaiz>,
    );

    await userEvent.tab();

    const pular = screen.getByRole("link", { name: /pular para o conteudo/i });
    expect(pular).toHaveFocus();
    expect(pular).toHaveAttribute("href", "#conteudo");
    expect(screen.getByRole("main")).toHaveAttribute("id", "conteudo");
  });

  it("o `main` recebe foco por programa, para o salto de fato mover o cursor", () => {
    // Sem `tabindex="-1"` no alvo, varios navegadores movem so a rolagem e
    // deixam o foco onde estava — o skip link vira decoracao.
    render(<LayoutRaiz titulo="Pagina">Conteudo</LayoutRaiz>);

    expect(screen.getByRole("main")).toHaveAttribute("tabindex", "-1");
  });

  it("sem navegacao, nao inventa um landmark de navegacao vazio", () => {
    render(<LayoutRaiz titulo="Pagina">Conteudo</LayoutRaiz>);

    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("a marca do cabecalho nao repete o h1 como cabecalho", () => {
    // Dois cabecalhos concorrentes confundem a navegacao por titulos.
    render(<LayoutRaiz titulo="Forum">Conteudo</LayoutRaiz>);

    expect(screen.getAllByRole("heading")).toHaveLength(1);
  });
});
