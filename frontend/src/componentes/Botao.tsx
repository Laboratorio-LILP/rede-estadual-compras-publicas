/**
 * Botao — a acao primaria da interface.
 *
 * Substitui 22 ocorrencias em 15 formas do legado (design-system.md, secao 3).
 * Comportamento de elemento nativo: `button` ja' responde a Enter, a Espaco e
 * ao foco, e nao ha' nada de teclado reimplementado a' mao (regra 4 do
 * ADR-007).
 */

import type { ComponentPropsWithRef, MouseEvent, ReactNode } from "react";

export type VarianteDeBotao = "primario" | "secundario" | "fantasma" | "perigo";
export type TamanhoDeBotao = "sm" | "md";

type PropriedadesNativas = Omit<ComponentPropsWithRef<"button">, "type" | "disabled" | "children">;

export interface PropriedadesDoBotao extends PropriedadesNativas {
  children: ReactNode;
  /** Nome acessivel explicito. Obrigatorio quando o conteudo e' so icone. */
  rotulo?: string;
  variante?: VarianteDeBotao;
  tamanho?: TamanhoDeBotao;
  /** A acao nao esta disponivel. Sai da ordem de tabulacao. */
  desabilitado?: boolean;
  /** A acao esta em curso. CONTINUA focalizavel — ver o comentario abaixo. */
  carregando?: boolean;
  /** `submit` so quando o botao de fato envia um formulario. */
  tipo?: "button" | "submit" | "reset";
  aoClicar?: () => void;
}

export function Botao({
  children,
  rotulo,
  variante = "primario",
  tamanho = "md",
  desabilitado = false,
  carregando = false,
  tipo = "button",
  aoClicar,
  className = "",
  onClick,
  ...resto
}: PropriedadesDoBotao) {
  // `carregando` NAO usa o atributo `disabled`. Um botao que fica `disabled`
  // ao ser acionado perde o foco no mesmo instante — quem navega por teclado
  // e' jogado para o inicio do documento, e o leitor de tela cala. Com
  // `aria-disabled` o elemento continua focalizavel e anunciado; quem bloqueia
  // a acao e' o manipulador abaixo.
  const inerte = desabilitado || carregando;

  function aoAcionar(evento: MouseEvent<HTMLButtonElement>) {
    if (inerte) {
      evento.preventDefault();
      return;
    }
    aoClicar?.();
    // O `onClick` de quem compoe. O Radix injeta o dele por `asChild`: sem
    // chamar aqui, nenhum modal e nenhum menu do produto abre — e falha em
    // silencio, porque o botao continua desenhando certo.
    onClick?.(evento);
  }

  return (
    <button
      // O espalhamento vem PRIMEIRO: o que este componente decide (tipo,
      // estado, classe) nao pode ser sobrescrito por quem compoe.
      {...resto}
      type={tipo}
      className={`botao botao--${variante} botao--${tamanho} ${className}`.trim()}
      // Condicional, e nao `aria-label={rotulo}`: com `rotulo` ausente, o valor
      // `undefined` explicito apagaria um `aria-label` vindo do espalhamento.
      {...(rotulo ? { "aria-label": rotulo } : {})}
      disabled={desabilitado}
      aria-disabled={carregando || undefined}
      aria-busy={carregando || undefined}
      onClick={aoAcionar}
    >
      {carregando && <span className="botao__girando" aria-hidden="true" />}
      {children}
    </button>
  );
}
