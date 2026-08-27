/**
 * O campo, pelo rotulo e pelo teclado.
 *
 * A auditoria do legado achou 50 controles em 24 formas, 6 aneis de foco
 * diferentes e 28 ROTULOS ORFAOS — texto que parecia rotulo mas nao estava
 * ligado a controle nenhum, e que por isso o leitor de tela nao anuncia.
 *
 * A regra 2 do ADR-007 diz que a ligacao `id`/`htmlFor` e' resolvida DENTRO do
 * componente. E' o unico jeito de a falha nao poder acontecer: quem usa
 * `<Campo>` nao tem como esquecer o que nao precisa escrever.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Campo } from "./Campo";

describe("Campo", () => {
  it("liga o rotulo ao controle sem que quem usa precise dar um id", async () => {
    render(<Campo rotulo="Nome civil" />);

    const controle = screen.getByLabelText("Nome civil");
    await userEvent.type(controle, "Ana");
    expect(controle).toHaveValue("Ana");
  });

  it("gera um id distinto por instancia, para dois campos nao colidirem", () => {
    render(
      <>
        <Campo rotulo="Primeiro" />
        <Campo rotulo="Segundo" />
      </>,
    );

    const primeiro = screen.getByLabelText("Primeiro");
    const segundo = screen.getByLabelText("Segundo");
    expect(primeiro.id).not.toBe(segundo.id);
    expect(primeiro.id).toBeTruthy();
  });

  it("e' alcancavel pela tabulacao, na ordem do documento", async () => {
    render(
      <>
        <Campo rotulo="Primeiro" />
        <Campo rotulo="Segundo" />
      </>,
    );

    await userEvent.tab();
    expect(screen.getByLabelText("Primeiro")).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByLabelText("Segundo")).toHaveFocus();
  });

  it("obrigatorio nao depende so do asterisco, que e' decoracao", () => {
    render(<Campo rotulo="CPF" obrigatorio />);

    const controle = screen.getByLabelText(/CPF/);
    expect(controle).toBeRequired();
    // O asterisco existe para quem enxerga; para quem ouve, quem informa e' o
    // atributo. Marcar o asterisco como conteudo faria o leitor dizer
    // "CPF asterisco".
    expect(screen.getByText("*")).toHaveAttribute("aria-hidden", "true");
  });

  it("o texto de ajuda e' anunciado junto com o campo", () => {
    render(<Campo rotulo="Sigla" ajuda="Ate seis letras, sem espaco." />);

    expect(screen.getByLabelText("Sigla")).toHaveAccessibleDescription(
      "Ate seis letras, sem espaco.",
    );
  });

  it("o erro marca o campo como invalido e e' anunciado na hora", () => {
    render(<Campo rotulo="E-mail" erro="Informe um e-mail valido." />);

    const controle = screen.getByLabelText("E-mail");
    expect(controle).toHaveAttribute("aria-invalid", "true");
    expect(controle).toHaveAccessibleDescription("Informe um e-mail valido.");
    // `role="alert"` faz o leitor de tela interromper e ler assim que o erro
    // aparece. No legado as 9 caixas de erro nao eram anunciadas por nenhuma.
    expect(screen.getByRole("alert")).toHaveTextContent("Informe um e-mail valido.");
  });

  it("com ajuda E erro, os dois textos sao anunciados", () => {
    render(<Campo rotulo="Sigla" ajuda="Ate seis letras." erro="Ja existe." />);

    expect(screen.getByLabelText("Sigla")).toHaveAccessibleDescription("Ate seis letras. Ja existe.");
  });

  it("sem erro, nao existe `aria-invalid` mentindo que esta tudo errado", () => {
    render(<Campo rotulo="Sigla" />);

    expect(screen.getByLabelText("Sigla")).not.toHaveAttribute("aria-invalid");
  });

  it("serve tambem para select, mantendo a ligacao do rotulo", async () => {
    render(
      <Campo
        rotulo="Orgao"
        como="select"
        opcoes={[
          { valor: "seges", texto: "SEGES" },
          { valor: "sggd", texto: "SGGD" },
        ]}
      />,
    );

    const controle = screen.getByLabelText("Orgao");
    expect(controle.tagName).toBe("SELECT");
    await userEvent.selectOptions(controle, "sggd");
    expect(controle).toHaveValue("sggd");
  });

  it("serve tambem para textarea, mantendo a ligacao do rotulo", async () => {
    render(<Campo rotulo="Conteudo" como="textarea" />);

    const controle = screen.getByLabelText("Conteudo");
    expect(controle.tagName).toBe("TEXTAREA");
    await userEvent.type(controle, "Duvida sobre pregao");
    expect(controle).toHaveValue("Duvida sobre pregao");
  });

  it("desabilitado sai da ordem de tabulacao", async () => {
    render(
      <>
        <Campo rotulo="Travado" desabilitado />
        <Campo rotulo="Livre" />
      </>,
    );

    expect(screen.getByLabelText("Travado")).toBeDisabled();
    await userEvent.tab();
    expect(screen.getByLabelText("Livre")).toHaveFocus();
  });
});
