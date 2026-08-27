/**
 * Toast — a confirmacao passageira, anunciada.
 *
 * Substitui os 21 `alert()` do legado. `alert()` trava a aba inteira, nao se
 * estiliza, nao se empilha e nao distingue sucesso de erro.
 *
 * Comportamento do Radix Toast: regiao viva propria, foco alcancavel por F6,
 * pausa do temporizador quando o ponteiro esta em cima ou a janela perde o
 * foco, e ordem de leitura correta.
 *
 * A duracao padrao e' longa de proposito. O criterio 2.2.1 da WCAG trata de
 * limite de tempo; uma confirmacao que some em dois segundos e' inutil para
 * quem le' devagar. Quem quiser mais tempo pode passar `duracao`.
 */

import * as Aviso from "@radix-ui/react-toast";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type VarianteDeToast = "sucesso" | "erro" | "info";

export interface PedidoDeToast {
  variante: VarianteDeToast;
  titulo: string;
  descricao?: string;
  /** Milissegundos ate sumir sozinho. */
  duracao?: number;
}

interface ToastAberto extends PedidoDeToast {
  chave: number;
}

interface ValorDoContexto {
  mostrar: (pedido: PedidoDeToast) => void;
}

const Contexto = createContext<ValorDoContexto | null>(null);

/** Doze segundos: tempo de ler duas linhas sem pressa. */
const DURACAO_PADRAO = 12_000;

export function ProvedorDeToast({ children }: { children: ReactNode }) {
  const [abertos, definirAbertos] = useState<ToastAberto[]>([]);

  const mostrar = useCallback((pedido: PedidoDeToast) => {
    // A chave vem de um contador monotonico, e nao de `Date.now()`: dois
    // avisos disparados no mesmo milissegundo colidiriam e o React reusaria o
    // no', trocando o texto do que ja' estava na tela.
    definirAbertos((anteriores) => [
      ...anteriores,
      { ...pedido, chave: (anteriores.at(-1)?.chave ?? 0) + 1 },
    ]);
  }, []);

  const valor = useMemo(() => ({ mostrar }), [mostrar]);

  const fechar = useCallback((chave: number) => {
    definirAbertos((anteriores) => anteriores.filter((aberto) => aberto.chave !== chave));
  }, []);

  return (
    <Contexto.Provider value={valor}>
      <Aviso.Provider swipeDirection="right">
        {children}

        {abertos.map((aberto) => (
          <Aviso.Root
            key={aberto.chave}
            className={`toast toast--${aberto.variante}`}
            duration={aberto.duracao ?? DURACAO_PADRAO}
            onOpenChange={(estaAberto) => {
              if (!estaAberto) fechar(aberto.chave);
            }}
          >
            <div className="toast__corpo">
              <Aviso.Title className="toast__titulo">{aberto.titulo}</Aviso.Title>
              {aberto.descricao && (
                <Aviso.Description className="toast__descricao">
                  {aberto.descricao}
                </Aviso.Description>
              )}
            </div>

            <Aviso.Close className="toast__fechar" aria-label="Fechar aviso">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
              </svg>
            </Aviso.Close>
          </Aviso.Root>
        ))}

        <Aviso.Viewport className="toast__area" />
      </Aviso.Provider>
    </Contexto.Provider>
  );
}

/** Dispara avisos. Falha alto fora do provedor — ver o teste. */
export function useToast(): ValorDoContexto {
  const contexto = useContext(Contexto);
  if (!contexto) {
    // Em silencio, a mensagem nunca apareceria, e o defeito so seria notado
    // por quem estivesse esperando a confirmacao.
    throw new Error("useToast exige que a arvore esteja dentro de <ProvedorDeToast>.");
  }
  return contexto;
}
