/**
 * O indicador de carregamento.
 *
 * O legado tinha 10 "Carregando..." em 6 marcacoes diferentes e nenhum
 * esqueleto. Pior: nenhum era anunciado, entao quem usa leitor de tela ficava
 * em silencio sem saber se a pagina tinha travado.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Carregando } from "./Carregando";

describe("Carregando", () => {
  it("anuncia sem interromper o que estava sendo lido", () => {
    render(<Carregando />);

    const estado = screen.getByRole("status");
    expect(estado).toHaveAttribute("aria-live", "polite");
  });

  it("diz o que esta carregando, e nao so que algo carrega", () => {
    render(<Carregando texto="Carregando os cursos" />);

    expect(screen.getByRole("status")).toHaveTextContent("Carregando os cursos");
  });

  it("o esqueleto e' invisivel ao leitor de tela — quem fala e' o status", () => {
    // Sem isto, o leitor anunciaria um punhado de caixas vazias.
    const { container } = render(<Carregando variante="esqueleto" linhas={3} />);

    const esqueleto = container.querySelector(".carregando__esqueleto");
    expect(esqueleto).toHaveAttribute("aria-hidden", "true");
    expect(esqueleto?.children).toHaveLength(3);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
