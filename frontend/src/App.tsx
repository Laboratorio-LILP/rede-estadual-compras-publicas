import { CAMINHO_BASE, URL_DA_API } from "./configuracao";

/**
 * Pagina raiz do front na etapa 0 (fundacao).
 *
 * E so o esqueleto: prova que o front sobe sobre os tokens do design system e
 * que a base e o prefixo da API vem do ambiente. Os componentes de base
 * (`Botao`, `Campo`, `Cartao`...) e o layout raiz completo sao a etapa 1 do
 * `docs/specs/plano-de-implementacao.md`.
 */

const CORES = [
  { classe: "marca", nome: "--sp-red", uso: "marca — so em nao-texto" },
  { classe: "acao", nome: "--sp-red-dark", uso: "acao — botao primario e texto" },
  { classe: "link", nome: "--sp-blue", uso: "link, foco e botao secundario" },
  { classe: "sucesso", nome: "--sp-green", uso: "sucesso" },
  { classe: "destaque", nome: "--sp-yellow", uso: "secundaria GESP" },
  { classe: "escuro", nome: "--sp-petrol", uso: "faixas escuras e rodape" },
] as const;

export default function App() {
  return (
    <>
      <a className="pular-para-conteudo" href="#conteudo">
        Pular para o conteudo
      </a>

      <header className="cabecalho">
        <p className="cabecalho__marca">Rede Estadual de Compras Publicas de Sao Paulo</p>
      </header>

      <main id="conteudo" className="pagina">
        <h1>Base nova da RECPSP</h1>
        <p className="introducao">
          Etapa 0 do plano de implementacao: a fundacao esta de pe. A interface do produto nasce
          na etapa 1, sobre estes mesmos tokens.
        </p>

        <h2>Tokens de cor</h2>
        <ul className="amostra-de-cores">
          {CORES.map((cor) => (
            <li key={cor.nome}>
              <div className={`amostra-de-cores__cor ${cor.classe}`} />
              <code className="amostra-de-cores__nome">{cor.nome}</code>
              <span className="amostra-de-cores__uso">{cor.uso}</span>
            </li>
          ))}
        </ul>

        <h2>Ambiente</h2>
        <dl>
          <dt>Base publica</dt>
          <dd>
            <code>{CAMINHO_BASE}</code>
          </dd>
          <dt>Prefixo da API</dt>
          <dd>
            <code>{URL_DA_API}</code>
          </dd>
        </dl>

        <p className="nota">
          Nenhum valor de cor mora nesta pagina: tudo vem de <code>tokens.css</code>, que e o
          unico arquivo com hexadecimal do front.
        </p>
      </main>

      <footer className="rodape">
        <p>Laboratorio de Inovacao em Logistica Publica — SGGD/SEGES</p>
      </footer>
    </>
  );
}
