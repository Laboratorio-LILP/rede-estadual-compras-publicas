/**
 * Contraste dos tokens de cor, medido — nao declarado.
 *
 * A auditoria de 27/08 achou no legado 5 das 8 cores de selo reprovando AA com
 * texto branco e um `text-gray-400` de 2,54:1 usado 113 vezes. Nada disso e'
 * descuido de quem escreveu: e' o que acontece quando a regra existe so em
 * prosa. Aqui ela e' aritmetica, e roda a cada `make test`.
 *
 * O arquivo de tokens e' lido do disco e as combinacoes DECLARADAS no design
 * system sao conferidas contra a formula da WCAG 2.1. Um token novo que va'
 * para cima de outro precisa entrar na tabela abaixo — senao ninguem mediu.
 *
 * Contrato: `docs/specs/design-system.md`, secoes 1 e 4 (mapa de correcao).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const AQUI = dirname(fileURLToPath(import.meta.url));
const TOKENS = readFileSync(join(AQUI, "tokens.css"), "utf8");

/** Piso da WCAG 2.1 AA para texto normal (1.4.3). */
const AA_TEXTO = 4.5;
/** Piso para texto grande (>= 18,66px negrito ou 24px) e para elemento
 *  grafico ou de interface (1.4.11) — o anel de foco cai aqui. */
const AA_NAO_TEXTO = 3;

/**
 * Le os valores do `:root` de `tokens.css`, resolvendo `var(--outro)` de forma
 * recursiva. Um token semantico (`--sp-acao`) costuma apontar para um token de
 * paleta (`--sp-red-dark`), e o que interessa medir e' a cor que chega a' tela.
 */
function lerTokens(css: string): Map<string, string> {
  const brutos = new Map<string, string>();
  for (const achado of css.matchAll(/(--sp-[\w-]+)\s*:\s*([^;]+);/g)) {
    const [, nome, valor] = achado;
    if (nome && valor) brutos.set(nome, valor.trim());
  }

  const resolver = (nome: string, vistos = new Set<string>()): string => {
    const valor = brutos.get(nome);
    if (valor === undefined) throw new Error(`Token inexistente em tokens.css: ${nome}`);
    if (vistos.has(nome)) throw new Error(`Referencia circular de tokens em ${nome}`);
    const apontado = /^var\((--sp-[\w-]+)\)$/.exec(valor)?.[1];
    return apontado ? resolver(apontado, new Set([...vistos, nome])) : valor;
  };

  return new Map([...brutos.keys()].map((nome) => [nome, resolver(nome)]));
}

const VALORES = lerTokens(TOKENS);

/** Canal sRGB -> componente linear, conforme a WCAG 2.1. */
function linearizar(canal: number): number {
  const c = canal / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function luminancia(hexadecimal: string): number {
  const digitos = /^#([0-9a-f]{6})$/i.exec(hexadecimal.trim())?.[1];
  if (!digitos) throw new Error(`Cor que nao e' hexadecimal de 6 digitos: ${hexadecimal}`);
  const inteiro = parseInt(digitos, 16);
  const [r, g, b] = [(inteiro >> 16) & 255, (inteiro >> 8) & 255, inteiro & 255];
  return 0.2126 * linearizar(r) + 0.7152 * linearizar(g) + 0.0722 * linearizar(b);
}

function contraste(frente: string, fundo: string): number {
  const [a, b] = [luminancia(frente), luminancia(fundo)];
  const [claro, escuro] = a > b ? [a, b] : [b, a];
  return (claro + 0.05) / (escuro + 0.05);
}

function razao(tokenFrente: string, tokenFundo: string): number {
  const frente = VALORES.get(tokenFrente);
  const fundo = VALORES.get(tokenFundo);
  if (!frente || !fundo) throw new Error(`Token ausente: ${tokenFrente} ou ${tokenFundo}`);
  return contraste(frente, fundo);
}

/** Todas as combinacoes que o produto de fato desenha. `[frente, fundo, piso]`. */
const COMBINACOES: [string, string, number][] = [
  // Texto sobre as duas superficies de pagina.
  ["--sp-text", "--sp-fundo", AA_TEXTO],
  ["--sp-text", "--sp-fundo-alternado", AA_TEXTO],
  ["--sp-text-secondary", "--sp-fundo", AA_TEXTO],
  ["--sp-text-secondary", "--sp-fundo-alternado", AA_TEXTO],
  ["--sp-link", "--sp-fundo", AA_TEXTO],
  ["--sp-link", "--sp-fundo-alternado", AA_TEXTO],

  // Botoes: o rotulo sobre o preenchimento, em repouso e sob o ponteiro.
  ["--sp-botao-primario-texto", "--sp-botao-primario-fundo", AA_TEXTO],
  ["--sp-botao-primario-texto", "--sp-botao-primario-fundo-hover", AA_TEXTO],
  ["--sp-botao-secundario-texto", "--sp-botao-secundario-fundo", AA_TEXTO],
  ["--sp-botao-secundario-texto", "--sp-botao-secundario-fundo-hover", AA_TEXTO],
  // Perigo e' contornado em repouso e preenchido sob o ponteiro — ver o teste
  // de distincao logo abaixo.
  ["--sp-botao-perigo-texto", "--sp-botao-perigo-fundo", AA_TEXTO],
  ["--sp-botao-perigo-texto-hover", "--sp-botao-perigo-fundo-hover", AA_TEXTO],
  ["--sp-botao-perigo-borda", "--sp-fundo", AA_NAO_TEXTO],
  ["--sp-botao-fantasma-texto", "--sp-fundo", AA_TEXTO],
  ["--sp-botao-fantasma-texto", "--sp-botao-fantasma-fundo-hover", AA_TEXTO],
  // Desabilitado e' isento pela 1.4.3, mas ilegivel e' defeito de qualquer forma.
  ["--sp-desabilitado-texto", "--sp-desabilitado-fundo", AA_TEXTO],

  // Faixas escuras: cabecalho e rodape institucionais.
  ["--sp-faixa-texto", "--sp-faixa-fundo", AA_TEXTO],

  // Alertas: as quatro variantes, texto sobre o proprio fundo tingido.
  ["--sp-alerta-info-texto", "--sp-alerta-info-fundo", AA_TEXTO],
  ["--sp-alerta-sucesso-texto", "--sp-alerta-sucesso-fundo", AA_TEXTO],
  ["--sp-alerta-aviso-texto", "--sp-alerta-aviso-fundo", AA_TEXTO],
  ["--sp-alerta-erro-texto", "--sp-alerta-erro-fundo", AA_TEXTO],

  // Selos: as cinco variantes do inventario. E' aqui que o legado reprovava.
  ["--sp-selo-papel-texto", "--sp-selo-papel-fundo", AA_TEXTO],
  ["--sp-selo-especialidade-texto", "--sp-selo-especialidade-fundo", AA_TEXTO],
  ["--sp-selo-formato-texto", "--sp-selo-formato-fundo", AA_TEXTO],
  ["--sp-selo-nivel-texto", "--sp-selo-nivel-fundo", AA_TEXTO],
  ["--sp-selo-situacao-texto", "--sp-selo-situacao-fundo", AA_TEXTO],

  // Elementos nao textuais (1.4.11): o anel de foco e a borda de campo
  // precisam ser vistos contra a superficie em que aparecem.
  ["--sp-foco", "--sp-fundo", AA_NAO_TEXTO],
  ["--sp-foco", "--sp-fundo-alternado", AA_NAO_TEXTO],
  ["--sp-campo-borda", "--sp-fundo", AA_NAO_TEXTO],
  ["--sp-campo-borda-erro", "--sp-fundo", AA_NAO_TEXTO],
];

describe("contraste dos tokens de cor", () => {
  it.each(COMBINACOES)("%s sobre %s alcanca %f:1", (frente, fundo, piso) => {
    expect(razao(frente, fundo)).toBeGreaterThanOrEqual(piso);
  });
});

describe("regras herdadas do contrato ADR-007", () => {
  it("a acao primaria e a destrutiva nao se parecem", () => {
    // Sao os dois botoes vermelhos do produto. Desenhados iguais, "Salvar" e
    // "Excluir" viram o mesmo alvo — e o legado nao distinguia: usava
    // `bg-red-500` nos dois. A distincao aqui e' de preenchimento, nao de
    // matiz, para a marca continuar sendo a marca.
    expect(VALORES.get("--sp-botao-primario-fundo")).not.toBe(
      VALORES.get("--sp-botao-perigo-fundo"),
    );
  });

  it("o vermelho de marca nunca e' o vermelho de acao", () => {
    // O mockup usava #FF161F em botao (3,90:1) e a rodada de 26/08 corrigiu
    // para #BE161D. O contrato fixa o #BD0E15 da BDLP — e' este que vale.
    expect(VALORES.get("--sp-red-dark")).toBe("#bd0e15");
    expect(VALORES.get("--sp-red")).not.toBe(VALORES.get("--sp-red-dark"));
  });

  it("a marca so aparece em nao-texto, porque com branco reprova AA", () => {
    // Prova por que a regra existe: o token de marca com texto branco da menos
    // que 4,5:1. Se um dia der mais, a regra pode ser revista com dado.
    expect(razao("--sp-white", "--sp-red")).toBeLessThan(AA_TEXTO);
  });

  it("nenhum texto usa o cinza auxiliar, que so serve a texto grande", () => {
    expect(razao("--sp-gray-dark", "--sp-fundo")).toBeLessThan(AA_TEXTO);
  });

  it("nada abaixo de 12px na escala de texto", () => {
    const tamanhos = [...TOKENS.matchAll(/--sp-texto-[\w-]+:\s*([\d.]+)rem/g)].map(([, valor]) =>
      Number(valor),
    );
    expect(tamanhos.length).toBeGreaterThan(0);
    expect(Math.min(...tamanhos)).toBeGreaterThanOrEqual(0.75);
  });

  it("a forma fica em tres raios e duas sombras", () => {
    expect([...TOKENS.matchAll(/--sp-raio-[\w-]+:/g)]).toHaveLength(3);
    expect([...TOKENS.matchAll(/--sp-sombra-[\w-]+:/g)]).toHaveLength(2);
  });
});
