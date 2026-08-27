/**
 * O alerta — mensagem que o leitor de tela precisa anunciar.
 *
 * O legado tinha 9 caixas em 6 formas e NENHUMA era anunciada, alem de 21
 * `alert()` do navegador. A distincao entre `alert` e `status` e' o ponto:
 * `alert` interrompe a leitura, e interromper por uma confirmacao de sucesso e'
 * abuso.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Alerta } from "./Alerta";

describe("Alerta", () => {
  it.each([
    ["erro", "alert"],
    ["aviso", "alert"],
  ] as const)("a variante %s interrompe a leitura (role=%s)", (variante, papel) => {
    render(<Alerta variante={variante}>Algo deu errado</Alerta>);

    expect(screen.getByRole(papel)).toHaveTextContent("Algo deu errado");
  });

  it.each([
    ["info", "status"],
    ["sucesso", "status"],
  ] as const)("a variante %s espera a pausa (role=%s)", (variante, papel) => {
    render(<Alerta variante={variante}>Tudo certo</Alerta>);

    expect(screen.getByRole(papel)).toHaveTextContent("Tudo certo");
  });

  it("o titulo entra no nivel que a pagina mandar", () => {
    render(
      <Alerta variante="erro" titulo="Nao foi possivel salvar" nivelDoTitulo={2}>
        Tente de novo.
      </Alerta>,
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "Nao foi possivel salvar" }),
    ).toBeInTheDocument();
  });

  it("o botao de dispensar tem nome, e nao so um X", async () => {
    const aoDispensar = vi.fn();
    render(
      <Alerta variante="info" aoDispensar={aoDispensar}>
        Aviso
      </Alerta>,
    );

    const fechar = screen.getByRole("button", { name: /dispensar/i });
    await userEvent.tab();
    expect(fechar).toHaveFocus();

    await userEvent.keyboard("{Enter}");
    expect(aoDispensar).toHaveBeenCalledTimes(1);
  });

  it("sem `aoDispensar`, nao aparece botao nenhum", () => {
    render(<Alerta variante="info">Aviso</Alerta>);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("o icone da variante e' decoracao, nao conteudo", () => {
    const { container } = render(<Alerta variante="erro">Falhou</Alerta>);

    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});
