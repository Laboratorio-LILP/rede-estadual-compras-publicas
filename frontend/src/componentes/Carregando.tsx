/**
 * Carregando — o estado de espera, anunciado.
 *
 * Substitui 10 "Carregando..." em 6 marcacoes do legado, nenhuma anunciada.
 *
 * `role="status"` com `aria-live="polite"`: avisa na proxima pausa, sem cortar
 * o que estava sendo lido. Espera nao e' emergencia.
 */

export type VarianteDeCarregamento = "girando" | "esqueleto";

export interface PropriedadesDeCarregando {
  variante?: VarianteDeCarregamento;
  /** Diga O QUE carrega. "Carregando" sozinho nao ajuda ninguem. */
  texto?: string;
  /** So para o esqueleto: quantas barras desenhar. */
  linhas?: number;
  className?: string;
}

export function Carregando({
  variante = "girando",
  texto = "Carregando",
  linhas = 3,
  className = "",
}: PropriedadesDeCarregando) {
  return (
    <div className={`carregando ${className}`.trim()}>
      {variante === "esqueleto" ? (
        // O esqueleto e' forma, nao conteudo: sem `aria-hidden` o leitor de
        // tela anunciaria um punhado de caixas vazias. Quem fala e' o status.
        <div className="carregando__esqueleto" aria-hidden="true">
          {Array.from({ length: linhas }, (_, indice) => (
            <span key={indice} className="carregando__barra" />
          ))}
        </div>
      ) : (
        <span className="carregando__girando" aria-hidden="true" />
      )}

      <p className="carregando__texto" role="status" aria-live="polite">
        {texto}
      </p>
    </div>
  );
}
