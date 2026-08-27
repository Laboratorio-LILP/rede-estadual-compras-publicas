/**
 * Pagina de amostra do design system (etapa 1 do plano de implementacao).
 *
 * Serve a tres publicos, e por isso e' uma pagina de verdade e nao um
 * rascunho:
 *
 * - **a equipe**, que valida paridade visual com o mockup do Eduardo tela a
 *   tela (design-system.md, secao 3: "cada componente nasce do screenshot da
 *   tela correspondente");
 * - **quem programa**, que ve' o inventario inteiro com todos os estados num
 *   lugar so, em vez de descobrir a variante certa lendo o codigo;
 * - **o `make a11y-check`**, que mede esta pagina com o axe. Nao ha' onde
 *   esconder um componente inacessivel: se ele existe, esta aqui.
 *
 * As paginas do produto (Centro de Capacitacao, Forum, Home) sao das etapas 2
 * a 5, sobre estes mesmos componentes.
 */

import { useState } from "react";

import { Alerta } from "./componentes/Alerta";
import { Botao } from "./componentes/Botao";
import { Campo } from "./componentes/Campo";
import { Carregando } from "./componentes/Carregando";
import { Cartao } from "./componentes/Cartao";
import { EstadoVazio } from "./componentes/EstadoVazio";
import { LayoutRaiz } from "./componentes/LayoutRaiz";
import { MenuSuspenso } from "./componentes/MenuSuspenso";
import { Modal } from "./componentes/Modal";
import { Selo } from "./componentes/Selo";
import { ProvedorDeToast, useToast } from "./componentes/Toast";
import { CAMINHO_BASE, URL_DA_API } from "./configuracao";

/** Uma secao da amostra. `region` nomeada, para o axe e para quem navega. */
function Secao({ titulo, id, children }: { titulo: string; id: string; children: React.ReactNode }) {
  return (
    <section className="secao" aria-labelledby={id}>
      <h2 className="secao__titulo" id={id}>
        {titulo}
      </h2>
      {children}
    </section>
  );
}

const VARIANTES_DE_SELO = [
  { variante: "papel", prefixo: "Papel:", texto: "Moderador" },
  { variante: "especialidade", prefixo: "Especialidade:", texto: "Selecao do Fornecedor" },
  { variante: "formato", prefixo: "Formato:", texto: "A distancia" },
  { variante: "nivel", prefixo: "Nivel:", texto: "Intermediario" },
  { variante: "situacao", prefixo: "Situacao:", texto: "Inscricoes abertas" },
] as const;

const VARIANTES_DE_ALERTA = [
  { variante: "info", titulo: "Moderacao previa", texto: "Todo topico passa por curadoria antes de aparecer." },
  { variante: "sucesso", titulo: "Enviado", texto: "O topico entrou na fila de curadoria." },
  { variante: "aviso", titulo: "Periodo eleitoral", texto: "A fonte estadual esta desativada por configuracao." },
  { variante: "erro", titulo: "Nao foi possivel salvar", texto: "O titulo passa de 200 caracteres." },
] as const;

function Amostra() {
  const { mostrar } = useToast();
  const [carregando, definirCarregando] = useState(false);

  return (
    <LayoutRaiz
      titulo="Design system da RECPSP"
      subtitulo="Etapa 1 do plano: os componentes de base, com os tokens do ADR-007 e o piso de acessibilidade sob teste."
      acoes={
        <MenuSuspenso
          gatilho={<Botao variante="fantasma">Acoes da pagina</Botao>}
          itens={[
            { chave: "tokens", texto: "Ver tokens", aoEscolher: () => undefined },
            { chave: "contraste", texto: "Relatorio de contraste", aoEscolher: () => undefined },
          ]}
        />
      }
    >
      <Secao titulo="Botao" id="secao-botao">
        <p className="secao__nota">
          Quatro variantes e dois tamanhos. Os seis estados obrigatorios de todo interativo:
          repouso, ponteiro, foco, pressionado, desabilitado e carregando.
        </p>
        <div className="linha">
          <Botao variante="primario">Primario</Botao>
          <Botao variante="secundario">Secundario</Botao>
          <Botao variante="fantasma">Fantasma</Botao>
          <Botao variante="perigo">Perigo</Botao>
        </div>
        <div className="linha">
          <Botao tamanho="sm">Pequeno</Botao>
          <Botao tamanho="md">Medio</Botao>
          <Botao desabilitado>Desabilitado</Botao>
          <Botao
            carregando={carregando}
            aoClicar={() => {
              definirCarregando(true);
              mostrar({ variante: "sucesso", titulo: "Acao concluida" });
            }}
          >
            {carregando ? "Salvando" : "Salvar e carregar"}
          </Botao>
          <Botao carregando>Sempre carregando</Botao>
        </div>
      </Secao>

      <Secao titulo="Campo" id="secao-campo">
        <p className="secao__nota">
          O rotulo se liga ao controle dentro do componente. Nao ha' como criar um rotulo orfao —
          era a falha mais repetida do legado, com 28 ocorrencias.
        </p>
        <div className="grade">
          <Campo rotulo="Nome civil" ajuda="Como consta no cadastro funcional." />
          <Campo rotulo="CPF" obrigatorio marcador="000.000.000-00" />
          <Campo rotulo="E-mail institucional" tipo="email" erro="Informe um e-mail valido." />
          <Campo
            rotulo="Orgao"
            como="select"
            opcoes={[
              { valor: "", texto: "Selecione" },
              { valor: "seges", texto: "SEGES" },
              { valor: "sggd", texto: "SGGD" },
            ]}
          />
          <Campo rotulo="Unidade" desabilitado ajuda="Escolha um orgao primeiro." />
          <Campo rotulo="Duvida" como="textarea" linhas={3} />
        </div>
      </Secao>

      <Secao titulo="Cartao" id="secao-cartao">
        <div className="grade">
          <Cartao titulo="Plano" nivelDoTitulo={3}>
            <p>Superficie com borda. Serve a listagens densas.</p>
          </Cartao>
          <Cartao variante="elevado" titulo="Elevado" nivelDoTitulo={3}>
            <p>Superficie com sombra. Serve a destaque na home.</p>
          </Cartao>
        </div>
      </Secao>

      <Secao titulo="Selo" id="secao-selo">
        <p className="secao__nota">
          Cinco variantes, cada uma com par de cor medido em <code>tokens.test.ts</code>. No legado
          eram 37 pilulas em 24 formas, com 5 das 8 cores reprovando AA.
        </p>
        <div className="linha">
          {VARIANTES_DE_SELO.map((selo) => (
            <Selo key={selo.variante} variante={selo.variante} prefixoAcessivel={selo.prefixo}>
              {selo.texto}
            </Selo>
          ))}
        </div>
      </Secao>

      <Secao titulo="Alerta" id="secao-alerta">
        <p className="secao__nota">
          Erro e aviso interrompem a leitura do leitor de tela; informacao e sucesso esperam a
          pausa.
        </p>
        <div className="pilha">
          {VARIANTES_DE_ALERTA.map((alerta) => (
            <Alerta
              key={alerta.variante}
              variante={alerta.variante}
              titulo={alerta.titulo}
              nivelDoTitulo={3}
            >
              {alerta.texto}
            </Alerta>
          ))}
        </div>
      </Secao>

      <Secao titulo="Sobreposicoes" id="secao-sobreposicoes">
        <p className="secao__nota">
          Comportamento do Radix: Esc fecha, o foco fica preso enquanto a sobreposicao esta aberta
          e volta a quem a abriu.
        </p>
        <div className="linha">
          <Modal
            titulo="Rejeitar o topico?"
            descricao="O autor recebe a notificacao com o motivo."
            gatilho={<Botao variante="perigo">Abrir modal</Botao>}
            acoes={
              <>
                <Botao variante="fantasma">Cancelar</Botao>
                <Botao variante="perigo">Rejeitar</Botao>
              </>
            }
          >
            <Campo rotulo="Motivo da rejeicao" como="textarea" linhas={3} obrigatorio />
          </Modal>

          <MenuSuspenso
            gatilho={<Botao variante="secundario">Abrir menu</Botao>}
            itens={[
              { chave: "perfil", texto: "Meu perfil", aoEscolher: () => undefined },
              { chave: "mensagens", texto: "Mensagens", aoEscolher: () => undefined },
              { chave: "sair", texto: "Sair", perigo: true, aoEscolher: () => undefined },
            ]}
          />

          <Botao
            variante="secundario"
            aoClicar={() =>
              mostrar({
                variante: "sucesso",
                titulo: "Topico enviado a' curadoria",
                descricao: "Voce recebe um aviso quando a moderacao decidir.",
              })
            }
          >
            Disparar toast
          </Botao>
        </div>
      </Secao>

      <Secao titulo="Espera e vazio" id="secao-espera">
        <div className="grade">
          <Cartao titulo="Carregando" nivelDoTitulo={3}>
            <Carregando texto="Carregando os cursos" />
          </Cartao>
          <Cartao titulo="Esqueleto" nivelDoTitulo={3}>
            <Carregando variante="esqueleto" linhas={3} texto="Carregando a fila de curadoria" />
          </Cartao>
        </div>
        <EstadoVazio
          titulo="Nenhum topico nesta categoria"
          nivelDoTitulo={3}
          descricao="Assim que a moderacao aprovar o primeiro, ele aparece aqui."
          acao={<Botao>Criar topico</Botao>}
        />
      </Secao>

      <Secao titulo="Tokens e ambiente" id="secao-tokens">
        <p className="secao__nota">
          Nenhum valor de cor mora nesta pagina: tudo vem de <code>tokens.css</code>, o unico
          arquivo com hexadecimal no front. O guardiao <code>make lint-tokens</code> prova isso, e{" "}
          <code>tokens.test.ts</code> mede o contraste de cada par.
        </p>
        <dl className="ambiente">
          <dt>Base publica</dt>
          <dd>
            <code>{CAMINHO_BASE}</code>
          </dd>
          <dt>Prefixo da API</dt>
          <dd>
            <code>{URL_DA_API}</code>
          </dd>
        </dl>
      </Secao>
    </LayoutRaiz>
  );
}

export default function App() {
  return (
    <ProvedorDeToast>
      <Amostra />
    </ProvedorDeToast>
  );
}
