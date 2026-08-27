import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import App from "./App";

describe("pagina raiz", () => {
  it("tem um unico h1", () => {
    render(<App />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("tem os landmarks e o skip link do piso de acessibilidade", () => {
    render(<App />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /pular para o conteudo/i })).toHaveAttribute(
      "href",
      "#conteudo",
    );
  });

  it("mostra os tokens de cor pelo nome, nao pelo valor", () => {
    const { container } = render(<App />);

    expect(screen.getByText("--sp-red")).toBeInTheDocument();
    // Cor nunca chega ao componente como valor literal.
    expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });
});
