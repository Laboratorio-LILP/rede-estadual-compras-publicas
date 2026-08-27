/**
 * EstadoVazio — quando nao ha' o que mostrar.
 *
 * Substitui 14 vazios sob medida do legado. Um vazio util faz tres coisas:
 * diz que esta vazio, explica por que, e oferece a saida.
 */

import type { ReactNode } from "react";

import type { NivelDeTitulo } from "./Cartao";

export interface PropriedadesDoEstadoVazio {
  titulo: string;
  /** Decidido pela pagina, para nao quebrar a hierarquia de cabecalhos. */
  nivelDoTitulo: NivelDeTitulo;
  descricao?: string;
  /** A saida: normalmente um `Botao` ou um link. */
  acao?: ReactNode;
  className?: string;
}

export function EstadoVazio({
  titulo,
  nivelDoTitulo,
  descricao,
  acao,
  className = "",
}: PropriedadesDoEstadoVazio) {
  const Titulo = `h${nivelDoTitulo}` as const;

  return (
    <div className={`estado-vazio ${className}`.trim()}>
      <svg
        className="estado-vazio__icone"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M20 13V7a2 2 0 0 0-2-2h-5.586a1 1 0 0 1-.707-.293l-1.414-1.414A1 1 0 0 0 9.586 3H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6M17 17v6m3-3h-6"
        />
      </svg>

      <Titulo className="estado-vazio__titulo">{titulo}</Titulo>
      {descricao && <p className="estado-vazio__descricao">{descricao}</p>}
      {acao && <div className="estado-vazio__acao">{acao}</div>}
    </div>
  );
}
