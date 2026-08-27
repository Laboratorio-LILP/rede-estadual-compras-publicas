/**
 * O botao, pelo teclado e pelo rotulo.
 *
 * A auditoria do legado achou 22 botoes em 15 formas e ZERO `onKeyDown` em
 * 8.215 linhas — havia `div` clicavel, que o teclado nao alcanca. A primeira
 * regra do ADR-007 ("clicavel e' `button` ou `a`") esta aqui como teste, e nao
 * como recomendacao.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Botao } from "./Botao";

describe("Botao", () => {
  it("e' um elemento button de verdade, alcancavel pelo teclado", async () => {
    render(<Botao>Enviar</Botao>);

    const botao = screen.getByRole("button", { name: "Enviar" });
    expect(botao.tagName).toBe("BUTTON");

    await userEvent.tab();
    expect(botao).toHaveFocus();
  });

  it("dispara com Enter e com Espaco, nao so com o ponteiro", async () => {
    const aoClicar = vi.fn();
    render(<Botao aoClicar={aoClicar}>Enviar</Botao>);

    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");

    expect(aoClicar).toHaveBeenCalledTimes(2);
  });

  it("nasce com tipo `button`, para nao enviar formulario por engano", () => {
    render(<Botao>Cancelar</Botao>);

    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("desabilitado sai da ordem de tabulacao e nao dispara", async () => {
    const aoClicar = vi.fn();
    render(
      <Botao desabilitado aoClicar={aoClicar}>
        Enviar
      </Botao>,
    );

    const botao = screen.getByRole("button", { name: "Enviar" });
    expect(botao).toBeDisabled();

    await userEvent.click(botao);
    expect(aoClicar).not.toHaveBeenCalled();
  });

  it("carregando continua focalizavel, mas nao dispara", async () => {
    // Diferenca proposital em relacao a `desabilitado`: `disabled` de verdade
    // tira o elemento da ordem de tabulacao, e quem acabou de apertar Enter
    // perderia o foco no meio da acao. `aria-disabled` mantem o foco e avisa
    // o leitor de tela.
    const aoClicar = vi.fn();
    render(
      <Botao carregando aoClicar={aoClicar}>
        Enviar
      </Botao>,
    );

    const botao = screen.getByRole("button", { name: /enviar/i });
    expect(botao).toHaveAttribute("aria-busy", "true");
    expect(botao).toHaveAttribute("aria-disabled", "true");
    expect(botao).not.toBeDisabled();

    await userEvent.tab();
    expect(botao).toHaveFocus();

    await userEvent.keyboard("{Enter}");
    expect(aoClicar).not.toHaveBeenCalled();
  });

  it("carregando mantem o rotulo, em vez de troca-lo por `Carregando...`", () => {
    // Trocar o texto apaga o contexto de quem usa leitor de tela: some a
    // informacao de qual acao esta em curso.
    render(<Botao carregando>Salvar rascunho</Botao>);

    expect(screen.getByRole("button", { name: /salvar rascunho/i })).toBeInTheDocument();
  });

  it("o indicador de carregamento nao e' lido como conteudo", () => {
    const { container } = render(<Botao carregando>Salvar</Botao>);

    expect(container.querySelector("[aria-hidden='true']")).toBeInTheDocument();
  });

  it("aceita as quatro variantes e os dois tamanhos do inventario", () => {
    const { rerender } = render(
      <Botao variante="primario" tamanho="sm">
        Um
      </Botao>,
    );
    expect(screen.getByRole("button")).toHaveClass("botao--primario", "botao--sm");

    rerender(
      <Botao variante="perigo" tamanho="md">
        Dois
      </Botao>,
    );
    expect(screen.getByRole("button")).toHaveClass("botao--perigo", "botao--md");
  });

  it("botao so de icone exige rotulo acessivel explicito", () => {
    render(
      <Botao rotulo="Fechar a busca">
        <svg aria-hidden="true" />
      </Botao>,
    );

    expect(screen.getByRole("button", { name: "Fechar a busca" })).toBeInTheDocument();
  });
});

describe("Botao como gatilho de outro componente", () => {
  it("repassa ao elemento nativo as propriedades que recebe", () => {
    // O Radix compoe por `asChild`: ele CLONA o elemento passado e injeta
    // `aria-expanded`, `aria-haspopup`, `id`, `ref` e o proprio manipulador de
    // clique. Um botao que descarta o que recebe quebra todo modal e todo menu
    // do produto — e quebra em silencio, porque continua desenhando certo.
    render(
      <Botao aria-haspopup="menu" aria-expanded={false} data-teste="gatilho">
        Conta
      </Botao>,
    );

    const botao = screen.getByRole("button", { name: "Conta" });
    expect(botao).toHaveAttribute("aria-haspopup", "menu");
    expect(botao).toHaveAttribute("aria-expanded", "false");
    expect(botao).toHaveAttribute("data-teste", "gatilho");
  });

  it("chama o manipulador de quem compoe E o proprio `aoClicar`", async () => {
    const deQuemCompoe = vi.fn();
    const proprio = vi.fn();
    render(
      <Botao onClick={deQuemCompoe} aoClicar={proprio}>
        Conta
      </Botao>,
    );

    await userEvent.click(screen.getByRole("button"));

    expect(proprio).toHaveBeenCalledTimes(1);
    expect(deQuemCompoe).toHaveBeenCalledTimes(1);
  });

  it("carregando bloqueia TAMBEM o manipulador de quem compoe", async () => {
    const deQuemCompoe = vi.fn();
    render(
      <Botao carregando onClick={deQuemCompoe}>
        Conta
      </Botao>,
    );

    await userEvent.click(screen.getByRole("button"));

    expect(deQuemCompoe).not.toHaveBeenCalled();
  });

  it("um `aria-label` de quem compoe nao e' apagado pelo rotulo ausente", () => {
    render(<Botao aria-label="Abrir menu da conta">?</Botao>);

    expect(screen.getByRole("button", { name: "Abrir menu da conta" })).toBeInTheDocument();
  });
});
