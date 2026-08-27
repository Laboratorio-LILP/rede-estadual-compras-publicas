/**
 * Modal — a sobreposicao modal do produto.
 *
 * Comportamento do Radix Dialog. O que ele entrega e que NAO se reimplementa
 * (regra 4 do ADR-007): prisao de foco, devolucao do foco ao gatilho, fechar
 * com Esc, `aria-modal`, e esconder o resto da pagina do leitor de tela.
 *
 * O legado tinha 2 modais ad hoc sem nada disso — um deles bloqueante e sem
 * saida pelo teclado, o que e' uma armadilha para quem nao usa ponteiro.
 */

import * as Dialogo from "@radix-ui/react-dialog";
import type { ReactNode } from "react";

export interface PropriedadesDoModal {
  /** O elemento que abre. Recebe o comportamento do gatilho por composicao. */
  gatilho: ReactNode;
  /** Vira o nome acessivel do dialogo. Nunca opcional: dialogo sem nome e' "dialogo". */
  titulo: string;
  /** Ligada por `aria-describedby`, e nao solta no corpo. */
  descricao?: string;
  children: ReactNode;
  /** Rodape de acoes (confirmar, cancelar). */
  acoes?: ReactNode;
  aberto?: boolean;
  aoMudarAbertura?: (aberto: boolean) => void;
}

export function Modal({
  gatilho,
  titulo,
  descricao,
  children,
  acoes,
  aberto,
  aoMudarAbertura,
}: PropriedadesDoModal) {
  return (
    // Espalhamento condicional, e nao `open={aberto}`: sob
    // `exactOptionalPropertyTypes`, passar `undefined` explicito nao e' o mesmo
    // que omitir — e o Radix distingue dialogo controlado de nao controlado
    // justamente pela AUSENCIA da propriedade.
    <Dialogo.Root
      {...(aberto === undefined ? {} : { open: aberto })}
      {...(aoMudarAbertura ? { onOpenChange: aoMudarAbertura } : {})}
    >
      <Dialogo.Trigger asChild>{gatilho}</Dialogo.Trigger>

      <Dialogo.Portal>
        <Dialogo.Overlay className="modal__fundo" />
        <Dialogo.Content className="modal">
          <Dialogo.Title className="modal__titulo">{titulo}</Dialogo.Title>
          {descricao ? (
            <Dialogo.Description className="modal__descricao">{descricao}</Dialogo.Description>
          ) : (
            // O Radix avisa em desenvolvimento quando falta descricao. Dizer
            // explicitamente que nao ha' e' melhor que deixar o aviso no
            // console de todo mundo.
            <Dialogo.Description hidden />
          )}

          <div className="modal__corpo">{children}</div>
          {acoes && <div className="modal__acoes">{acoes}</div>}

          <Dialogo.Close
            className="modal__fechar"
            // "X" nao e' nome acessivel.
            aria-label="Fechar"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
            </svg>
          </Dialogo.Close>
        </Dialogo.Content>
      </Dialogo.Portal>
    </Dialogo.Root>
  );
}
