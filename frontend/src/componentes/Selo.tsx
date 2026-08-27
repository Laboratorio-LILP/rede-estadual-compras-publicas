/**
 * Selo — rotulo curto de classificacao.
 *
 * Cinco variantes, uma por categoria semantica do inventario. Cada par de cor
 * esta medido em `estilos/tokens.test.ts`: no legado, 5 das 8 cores de selo
 * reprovavam AA com texto branco, e a mesma funcao aparecia em duas cores
 * diferentes conforme a tela.
 *
 * A cor nunca e' o unico portador de significado (WCAG 1.4.1): o texto do selo
 * diz o que ele e'.
 */

import type { ReactNode } from "react";

export type VarianteDeSelo = "papel" | "especialidade" | "formato" | "nivel" | "situacao";

export interface PropriedadesDoSelo {
  children: ReactNode;
  variante: VarianteDeSelo;
  /**
   * Texto so para leitor de tela, lido antes do rotulo. Serve a quem navega
   * saltando de elemento em elemento e encontra o selo fora de contexto:
   * "Selecao do Fornecedor" sozinho nao diz que e' uma especialidade.
   */
  prefixoAcessivel?: string;
  className?: string;
}

export function Selo({ children, variante, prefixoAcessivel, className = "" }: PropriedadesDoSelo) {
  return (
    <span className={`selo selo--${variante} ${className}`.trim()}>
      {prefixoAcessivel && <span className="so-leitor-de-tela">{prefixoAcessivel}</span>}
      {children}
    </span>
  );
}
