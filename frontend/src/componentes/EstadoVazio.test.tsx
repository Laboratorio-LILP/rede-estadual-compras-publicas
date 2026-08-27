/**
 * O estado vazio.
 *
 * O legado tinha 14 vazios sob medida, cada tela com o seu texto e a sua
 * marcacao. Um vazio bom diz o que faltou e oferece a saida.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EstadoVazio } from "./EstadoVazio";

describe("EstadoVazio", () => {
  it("tem titulo no nivel que a pagina mandar", () => {
    render(<EstadoVazio titulo="Nenhum topico ainda" nivelDoTitulo={2} />);

    expect(screen.getByRole("heading", { level: 2, name: "Nenhum topico ainda" })).toBeInTheDocument();
  });

  it("explica o vazio e oferece a saida", () => {
    render(
      <EstadoVazio
        titulo="Nenhum topico ainda"
        nivelDoTitulo={2}
        descricao="Assim que alguem publicar, aparece aqui."
        acao={<button type="button">Criar topico</button>}
      />,
    );

    expect(screen.getByText("Assim que alguem publicar, aparece aqui.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Criar topico" })).toBeInTheDocument();
  });

  it("o icone e' decoracao", () => {
    const { container } = render(<EstadoVazio titulo="Vazio" nivelDoTitulo={2} />);

    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
