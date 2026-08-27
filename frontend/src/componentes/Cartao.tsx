/**
 * Cartao — a superficie de conteudo.
 *
 * Substitui ~36 superficies em ~27 formas do legado por duas variantes.
 *
 * O cartao NAO e' clicavel de proposito. Card inteiro clicavel produz um alvo
 * sem nome acessivel proprio, engole os links de dentro (link dentro de link e'
 * marcacao invalida) e impede selecionar o texto. Quem precisa de acao poe um
 * link ou um botao DENTRO.
 */

import type { ReactNode } from "react";

export type VarianteDeCartao = "plano" | "elevado";
export type NivelDeTitulo = 2 | 3 | 4 | 5 | 6;

export interface PropriedadesDoCartao {
  children: ReactNode;
  variante?: VarianteDeCartao;
  titulo?: string;
  /**
   * Nivel do cabecalho, decidido pela PAGINA. Fixar o nivel aqui produziria
   * salto de hierarquia (h1 direto para h3) assim que o cartao mudasse de
   * lugar — falha de WCAG 1.3.1. Obrigatorio junto com `titulo`.
   */
  nivelDoTitulo?: NivelDeTitulo;
  className?: string;
}

export function Cartao({
  children,
  variante = "plano",
  titulo,
  nivelDoTitulo = 3,
  className = "",
}: PropriedadesDoCartao) {
  const Titulo = `h${nivelDoTitulo}` as const;

  return (
    <div className={`cartao cartao--${variante} ${className}`.trim()}>
      {titulo && <Titulo className="cartao__titulo">{titulo}</Titulo>}
      {children}
    </div>
  );
}
