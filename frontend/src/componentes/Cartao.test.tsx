/**
 * O cartao — superficie, nao controle.
 *
 * O legado tinha ~36 superficies em ~27 formas. Aqui sao duas: `plano` e
 * `elevado`. O cartao NAO e' clicavel: card inteiro clicavel esconde um alvo
 * gigante sem nome acessivel e costuma engolir os links de dentro.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Cartao } from "./Cartao";

describe("Cartao", () => {
  it("mostra o conteudo e aplica a variante", () => {
    render(<Cartao variante="elevado">Conteudo</Cartao>);

    const cartao = screen.getByText("Conteudo");
    expect(cartao).toHaveClass("cartao", "cartao--elevado");
  });

  it("nasce plano quando ninguem escolhe", () => {
    render(<Cartao>Conteudo</Cartao>);

    expect(screen.getByText("Conteudo")).toHaveClass("cartao--plano");
  });

  it("o titulo entra no nivel que a pagina mandar, para a hierarquia nao quebrar", () => {
    // Nivel fixo dentro do componente produziria salto de h1 para h3 assim que
    // um cartao mudasse de lugar na pagina — falha de WCAG 1.3.1.
    render(
      <Cartao titulo="Cursos abertos" nivelDoTitulo={3}>
        Conteudo
      </Cartao>,
    );

    expect(screen.getByRole("heading", { level: 3, name: "Cursos abertos" })).toBeInTheDocument();
  });

  it("sem titulo, nao inventa cabecalho vazio", () => {
    render(<Cartao>Conteudo</Cartao>);

    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("nao e' um controle: nada de botao escondido em volta do conteudo", () => {
    render(
      <Cartao>
        <a href="/curso">Ver curso</a>
      </Cartao>,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver curso" })).toBeInTheDocument();
  });
});
