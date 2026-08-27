/**
 * A pagina de amostra do design system.
 *
 * E' a pagina que `make a11y-check` mede com o axe, e a referencia visual da
 * equipe. Estes testes garantem o que o axe nao mede sozinho: que a amostra de
 * fato mostra o inventario inteiro, e que a hierarquia de cabecalhos e' um
 * caminho continuo.
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import App from "./App";

describe("pagina de amostra", () => {
  it("tem um unico h1", () => {
    render(<App />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("tem os landmarks e o skip link do piso de acessibilidade", async () => {
    render(<App />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();

    await userEvent.tab();
    expect(screen.getByRole("link", { name: /pular para o conteudo/i })).toHaveFocus();
  });

  it("a hierarquia de cabecalhos nao pula nivel", () => {
    // WCAG 1.3.1: h1 seguido de h3 quebra o indice que o leitor de tela monta.
    // E' o defeito que aparece quando cada componente fixa o proprio nivel —
    // por isso `Cartao`, `Alerta` e `EstadoVazio` recebem o nivel da pagina.
    render(<App />);

    const niveis = screen
      .getAllByRole("heading")
      .map((titulo) => Number(titulo.tagName.slice(1)));

    expect(niveis[0]).toBe(1);
    for (let i = 1; i < niveis.length; i += 1) {
      expect(niveis[i]! - niveis[i - 1]!).toBeLessThanOrEqual(1);
    }
  });

  it("mostra o inventario inteiro da etapa 1", () => {
    render(<App />);

    for (const secao of [
      "Botao",
      "Campo",
      "Cartao",
      "Selo",
      "Alerta",
      "Sobreposicoes",
      "Espera e vazio",
      "Tokens",
    ]) {
      expect(screen.getByRole("heading", { name: new RegExp(secao, "i") })).toBeInTheDocument();
    }
  });

  it("mostra os seis estados obrigatorios do interativo, inclusive carregando", () => {
    render(<App />);

    const botoes = within(screen.getByRole("region", { name: /botao/i })).getAllByRole("button");

    expect(botoes.some((botao) => botao.hasAttribute("disabled"))).toBe(true);
    expect(botoes.some((botao) => botao.getAttribute("aria-busy") === "true")).toBe(true);
  });

  it("nenhum valor de cor chega a' marcacao: tudo vem de tokens.css", () => {
    const { container } = render(<App />);

    expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(container.innerHTML).not.toMatch(/style="[^"]*(color|background)/i);
  });

  it("os campos da amostra tem rotulo de verdade, nao so texto ao lado", () => {
    render(<App />);

    expect(screen.getByLabelText(/nome civil/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/orgao/i)).toBeInTheDocument();
  });
});
