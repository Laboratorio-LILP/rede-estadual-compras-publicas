/**
 * Alerta — a mensagem fixa na pagina.
 *
 * Substitui 9 caixas em 6 formas do legado, nenhuma anunciada, e os 21
 * `alert()` do navegador (que travam a pagina inteira e nao se estilizam).
 *
 * A escolha do papel ARIA e' o coracao do componente:
 *
 * - `role="alert"` (implicitamente `aria-live="assertive"`) INTERROMPE o que o
 *   leitor de tela esta lendo. Fica para erro e aviso, onde a interrupcao e'
 *   proporcional.
 * - `role="status"` (`aria-live="polite"`) espera a proxima pausa. Fica para
 *   informacao e sucesso — interromper alguem para dizer "salvo" e' abuso.
 */

import type { ReactNode } from "react";

import type { NivelDeTitulo } from "./Cartao";

export type VarianteDeAlerta = "info" | "sucesso" | "aviso" | "erro";

/** Traco do icone por variante. `currentColor`, entao herda a cor do alerta. */
const TRACOS: Record<VarianteDeAlerta, string> = {
  info: "M11.25 11.25h1.5v5.25h-1.5zM12 7.5h.008v.008H12z M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
  sucesso: "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
  aviso: "M12 9v3.75m0 3.75h.008M10.34 3.94 1.98 18a1.9 1.9 0 0 0 1.66 2.85h16.72A1.9 1.9 0 0 0 22 18L13.66 3.94a1.9 1.9 0 0 0-3.32 0z",
  erro: "M9.75 9.75l4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
};

export interface PropriedadesDoAlerta {
  children: ReactNode;
  variante: VarianteDeAlerta;
  titulo?: string;
  /** Decidido pela pagina, para nao quebrar a hierarquia de cabecalhos. */
  nivelDoTitulo?: NivelDeTitulo;
  /** Quando presente, aparece o botao de dispensar. */
  aoDispensar?: () => void;
  className?: string;
}

export function Alerta({
  children,
  variante,
  titulo,
  nivelDoTitulo = 3,
  aoDispensar,
  className = "",
}: PropriedadesDoAlerta) {
  const interrompe = variante === "erro" || variante === "aviso";
  const Titulo = `h${nivelDoTitulo}` as const;

  return (
    <div
      className={`alerta alerta--${variante} ${className}`.trim()}
      role={interrompe ? "alert" : "status"}
    >
      <svg
        className="alerta__icone"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d={TRACOS[variante]} />
      </svg>

      <div className="alerta__corpo">
        {titulo && <Titulo className="alerta__titulo">{titulo}</Titulo>}
        <div className="alerta__texto">{children}</div>
      </div>

      {aoDispensar && (
        <button
          type="button"
          className="alerta__dispensar"
          // "X" nao e' nome acessivel. Sem isto o leitor de tela diz "botao".
          aria-label="Dispensar aviso"
          onClick={aoDispensar}
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
        </button>
      )}
    </div>
  );
}
