/**
 * LayoutRaiz — a moldura que toda pagina do produto herda.
 *
 * Entrega, por construcao, quatro coisas que o legado nao tinha:
 *
 * 1. **Landmarks** (`banner`, `navigation`, `main`, `contentinfo`) — o mapa
 *    que um leitor de tela usa para saltar entre regioes.
 * 2. **Skip link** como primeiro alvo da tabulacao. Sem ele, quem navega por
 *    teclado atravessa a navegacao inteira em TODA pagina antes do texto.
 * 3. **Um `h1` por pagina.** A rota `/` do legado nao tinha nenhum.
 * 4. **Foco visivel**, herdado da regra global de `base.css`.
 *
 * O titulo e' propriedade obrigatoria de proposito: pagina sem `h1` deixa de
 * ser possivel de escrever.
 */

import type { ReactNode } from "react";

export interface PropriedadesDoLayoutRaiz {
  /** Vira o `h1`. Uma pagina, um titulo. */
  titulo: string;
  /** Linha de apoio sob o titulo. */
  subtitulo?: string;
  /** Conteudo do landmark de navegacao. Ausente, o landmark nao nasce. */
  navegacao?: ReactNode;
  /** Acoes a' direita do titulo (botao primario da pagina, filtros). */
  acoes?: ReactNode;
  children: ReactNode;
}

export function LayoutRaiz({
  titulo,
  subtitulo,
  navegacao,
  acoes,
  children,
}: PropriedadesDoLayoutRaiz) {
  return (
    <>
      {/* Primeiro no' focalizavel do documento, por posicao no DOM. */}
      <a className="pular-para-conteudo" href="#conteudo">
        Pular para o conteudo
      </a>

      <header className="faixa">
        <div className="faixa__interior">
          {/*
            `p`, e nao cabecalho: a marca institucional repetida em toda pagina
            competiria com o `h1` na navegacao por titulos.
          */}
          <p className="faixa__marca">Rede Estadual de Compras Publicas de Sao Paulo</p>
          {navegacao && (
            <nav className="faixa__navegacao" aria-label="Navegacao principal">
              {navegacao}
            </nav>
          )}
        </div>
      </header>

      {/*
        `tabindex="-1"` no alvo do salto: sem ele, varios navegadores movem so
        a rolagem e deixam o foco onde estava, e o skip link vira decoracao.
      */}
      <main id="conteudo" className="pagina" tabIndex={-1}>
        <div className="pagina__cabecalho">
          <div>
            <h1 className="pagina__titulo">{titulo}</h1>
            {subtitulo && <p className="pagina__subtitulo">{subtitulo}</p>}
          </div>
          {acoes && <div className="pagina__acoes">{acoes}</div>}
        </div>

        {children}
      </main>

      <footer className="rodape">
        <div className="rodape__interior">
          <p>Laboratorio de Inovacao em Logistica Publica — SGGD/SEGES</p>
        </div>
      </footer>
    </>
  );
}
