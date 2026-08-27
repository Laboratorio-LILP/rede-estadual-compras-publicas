/**
 * Campo — input, select ou textarea, sempre com rotulo ligado.
 *
 * Substitui 50 controles em 24 formas do legado, e mata a classe de defeito
 * dos 28 rotulos orfaos: a ligacao `id`/`htmlFor` acontece AQUI DENTRO
 * (regra 2 do ADR-007), entao quem usa o componente nao tem como esquece-la.
 *
 * O anel de foco tambem e' um so — no legado eram seis, porque cada tela
 * escrevia o seu `focus:ring-*`. Aqui o foco vem da regra global de
 * `base.css`, com o token do design system.
 */

import { useId } from "react";
import type { ChangeEvent } from "react";

export interface OpcaoDeCampo {
  valor: string;
  texto: string;
}

export interface PropriedadesDoCampo {
  rotulo: string;
  /** Elemento nativo por tras. `select` exige `opcoes`. */
  como?: "input" | "select" | "textarea";
  tipo?: "text" | "email" | "password" | "search" | "url" | "tel" | "number";
  opcoes?: OpcaoDeCampo[];
  valor?: string;
  aoMudar?: (valor: string) => void;
  /** Explicacao permanente. Anunciada junto com o rotulo. */
  ajuda?: string;
  /** Mensagem de invalidez. Interrompe o leitor de tela ao aparecer. */
  erro?: string;
  obrigatorio?: boolean;
  desabilitado?: boolean;
  marcador?: string;
  linhas?: number;
  className?: string;
}

export function Campo({
  rotulo,
  como = "input",
  tipo = "text",
  opcoes = [],
  valor,
  aoMudar,
  ajuda,
  erro,
  obrigatorio = false,
  desabilitado = false,
  marcador,
  linhas = 4,
  className = "",
}: PropriedadesDoCampo) {
  const base = useId();
  const idDoControle = `${base}-controle`;
  const idDaAjuda = `${base}-ajuda`;
  const idDoErro = `${base}-erro`;

  // A ordem importa: o leitor de tela le' a descricao na ordem em que os ids
  // aparecem. A ajuda primeiro (o que se espera), o erro depois (o que houve).
  const descricao = [ajuda ? idDaAjuda : null, erro ? idDoErro : null].filter(Boolean).join(" ");

  const comuns = {
    id: idDoControle,
    className: `campo__controle${erro ? " campo__controle--erro" : ""}`,
    required: obrigatorio,
    disabled: desabilitado,
    "aria-invalid": erro ? (true as const) : undefined,
    "aria-describedby": descricao || undefined,
    value: valor,
    onChange: (evento: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      aoMudar?.(evento.target.value),
  };

  return (
    <div className={`campo ${className}`.trim()}>
      <label className="campo__rotulo" htmlFor={idDoControle}>
        {rotulo}
        {obrigatorio && (
          // Decoracao: quem informa a obrigatoriedade a quem nao enxerga e' o
          // atributo `required`. Sem `aria-hidden`, o leitor diria
          // "CPF asterisco".
          <span className="campo__obrigatorio" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {como === "select" ? (
        <select {...comuns}>
          {opcoes.map((opcao) => (
            <option key={opcao.valor} value={opcao.valor}>
              {opcao.texto}
            </option>
          ))}
        </select>
      ) : como === "textarea" ? (
        <textarea {...comuns} rows={linhas} placeholder={marcador} />
      ) : (
        <input {...comuns} type={tipo} placeholder={marcador} />
      )}

      {ajuda && (
        <p className="campo__ajuda" id={idDaAjuda}>
          {ajuda}
        </p>
      )}
      {erro && (
        <p className="campo__erro" id={idDoErro} role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}
