/**
 * O piso de acessibilidade do ADR-007, medido nas paginas no ar.
 *
 * Ate a etapa 0, `make a11y-check` so imprimia um aviso: nao havia pagina a
 * medir. A partir daqui ele mede de verdade, e a esteira reprova quando o
 * numero cai.
 *
 * ## Duas paginas, dois motivos
 *
 * - **A amostra do design system** (Vite, 5173) — todo componente do
 *   inventario esta la', com todos os estados. Se um componente e' inacessivel,
 *   nao ha' onde esconde-lo.
 * - **A pagina raiz servida pelo Django** (8004) — nasce de outro caminho, com
 *   CSS proprio, e precisa ser medida por si.
 *
 * ## Dois motores, de proposito
 *
 * O `axe-core` acha o que um motor de regras acha; o HTML_CodeSniffer
 * interpreta as tecnicas da WCAG por outro caminho e pega coisas diferentes.
 * Um so' motor da' a sensacao de cobertura sem a cobertura. E' o mesmo motor
 * que o `pa11y` embrulha, aqui usado direto — ver o comentario de `FONTE_HTMLCS`.
 *
 * O quarto criterio do ADR-007, "Lighthouse >= 95", NAO tem verificacao
 * separada aqui, e isso e' deliberado: a categoria de acessibilidade do
 * Lighthouse E' o proprio axe-core, com um subconjunto das regras e uma media
 * ponderada. Rodar os dois mediria a mesma coisa duas vezes, uma delas
 * cobrando minutos de Chrome sem cabeca por execucao. O criterio aqui e' mais
 * DURO que o dele: zero violacao de QUALQUER gravidade, e nao 95 pontos.
 */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

/**
 * O motor do HTML_CodeSniffer, lido do disco e injetado na pagina.
 *
 * E' o MESMO motor que o `pa11y` embrulha — mas o pa11y arrasta o Puppeteer, e
 * com ele cinco advisories de gravidade alta sem versao corrigida
 * (`extract-zip`, GHSA-jmr9-qjv8-65gv). A base nova mantem `make auditoria` em
 * ZERO desde a etapa 0, e trocar esse padrao por um embrulho nao vale: o
 * pacote puro nao tem dependencia nenhuma, e quem dirige o navegador ja' e' o
 * Playwright.
 */
const FONTE_HTMLCS = readFileSync(
  createRequire(import.meta.url).resolve("html_codesniffer/build/HTMLCS.js"),
  "utf8",
);

/** Tipos de mensagem do HTMLCS. Interessa o primeiro. */
const ERRO = 1;

interface ProblemaDeCodeSniffer {
  codigo: string;
  mensagem: string;
  elemento: string;
}

declare global {
  // eslint-disable-next-line no-var
  var HTMLCS: {
    process: (padrao: string, alvo: Document, aoTerminar: () => void) => void;
    getMessages: () => { type: number; code: string; msg: string; element?: Element }[];
  };
}

/**
 * Carrega a pagina com o HTMLCS ja' presente e devolve so os ERROS de WCAG2AA.
 *
 * `addInitScript` entra pelo protocolo de depuracao, e nao por `<script>` na
 * pagina — o que importa porque a CSP da aplicacao e' estrita (`script-src
 * 'self'`, sem `unsafe-inline` nem `unsafe-eval`) e barraria a injecao. Medir
 * a pagina com a CSP relaxada mediria outra pagina.
 */
async function medirComCodeSniffer(page: Page, url: string): Promise<ProblemaDeCodeSniffer[]> {
  await page.addInitScript({ content: FONTE_HTMLCS });
  await page.goto(url, { waitUntil: "networkidle" });

  return page.evaluate(
    (tipoDeErro) =>
      new Promise<ProblemaDeCodeSniffer[]>((resolver) => {
        globalThis.HTMLCS.process("WCAG2AA", document, () => {
          resolver(
            globalThis.HTMLCS.getMessages()
              .filter((mensagem) => mensagem.type === tipoDeErro)
              .map((mensagem) => ({
                codigo: mensagem.code,
                mensagem: mensagem.msg,
                elemento: (mensagem.element?.outerHTML ?? "").slice(0, 120),
              })),
          );
        });
      }),
    ERRO,
  );
}

const URL_FRONT = process.env.RECPSP_URL_FRONT ?? "http://frontend:5173";
const URL_APP = process.env.RECPSP_URL_APP ?? "http://backend:8004";

const PAGINAS = [
  { nome: "amostra do design system (Vite)", url: `${URL_FRONT}/` },
  { nome: "pagina raiz da aplicacao (Django)", url: `${URL_APP}/` },
];

/** As etiquetas do que se afirma cumprir. AA, mais as regras da 2.1 e 2.2. */
const ETIQUETAS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

function relatar(violacoes: { id: string; impact?: string | null; nodes: unknown[] }[]): string {
  return violacoes
    .map((v) => `  [${v.impact ?? "sem gravidade"}] ${v.id} — ${v.nodes.length} no(s)`)
    .join("\n");
}

test.describe("axe-core", () => {
  for (const pagina of PAGINAS) {
    test(`${pagina.nome}: zero violacao`, async ({ page }) => {
      await page.goto(pagina.url, { waitUntil: "networkidle" });

      const resultado = await new AxeBuilder({ page }).withTags(ETIQUETAS).analyze();

      expect(
        resultado.violations,
        `Violacoes em ${pagina.url}:\n${relatar(resultado.violations)}`,
      ).toEqual([]);
    });
  }

  test("a amostra continua limpa com as sobreposicoes abertas", async ({ page }) => {
    // Sobreposicao fechada nao existe no DOM: medir so o estado de repouso
    // deixaria modal e menu — justamente os componentes com mais ARIA — fora
    // da medicao inteira. Foi assim que apareceu o `aria-hidden-focus` de
    // gravidade "serious" que o `modal={false}` do MenuSuspenso resolveu.
    //
    // A regra `region` fica de fora SO nesta medicao. Ela e' de boa pratica
    // (nao e' criterio da WCAG) e cobra que todo conteudo esteja dentro de um
    // landmark. Sobreposicao do Radix nasce num portal preso ao `body`, fora
    // de qualquer landmark por construcao — e' o que impede que um ancestral
    // com `overflow: hidden` a corte. O conteudo nao esta orfao: pertence a um
    // gatilho que ESTA dentro de landmark, e a relacao e' declarada por
    // `aria-expanded` e `aria-controls`. Nas duas medicoes de repouso acima a
    // regra continua ligada, que e' onde ela de fato pega problema.
    const semRegiaoDePortal = ["region"];

    await page.goto(`${URL_FRONT}/`, { waitUntil: "networkidle" });

    await page.getByRole("button", { name: "Abrir modal" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    const comModal = await new AxeBuilder({ page })
      .withTags(ETIQUETAS)
      .disableRules(semRegiaoDePortal)
      .analyze();
    expect(comModal.violations, `Com o modal aberto:\n${relatar(comModal.violations)}`).toEqual([]);

    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();

    await page.getByRole("button", { name: "Abrir menu" }).click();
    await expect(page.getByRole("menu")).toBeVisible();

    const comMenu = await new AxeBuilder({ page })
      .withTags(ETIQUETAS)
      .disableRules(semRegiaoDePortal)
      .analyze();
    expect(comMenu.violations, `Com o menu aberto:\n${relatar(comMenu.violations)}`).toEqual([]);
  });
});

test.describe("HTML_CodeSniffer (WCAG2AA)", () => {
  for (const pagina of PAGINAS) {
    test(`${pagina.nome}: zero erro`, async ({ page }) => {
      const erros = await medirComCodeSniffer(page, pagina.url);

      expect(
        erros,
        `Erros em ${pagina.url}:\n${erros
          .map((e) => `  ${e.codigo} — ${e.mensagem}\n    ${e.elemento}`)
          .join("\n")}`,
      ).toEqual([]);
    });
  }
});

test.describe("teclado", () => {
  test("o skip link e' o primeiro alvo e leva o foco ao conteudo", async ({ page }) => {
    await page.goto(`${URL_FRONT}/`, { waitUntil: "networkidle" });

    await page.keyboard.press("Tab");
    const pular = page.getByRole("link", { name: /pular para o conteudo/i });
    await expect(pular).toBeFocused();
    // Fora da tela ate receber foco, e visivel depois — o defeito comum e' um
    // skip link que existe no HTML e nunca aparece.
    await expect(pular).toBeVisible();

    await page.keyboard.press("Enter");
    await expect(page.locator("main#conteudo")).toBeFocused();
  });

  test("todo interativo tem anel de foco visivel", async ({ page }) => {
    // WCAG 2.4.7. O legado tinha seis aneis diferentes, cada tela com o seu;
    // aqui e' um, da regra global, e este teste prova que ele DESENHA.
    await page.goto(`${URL_FRONT}/`, { waitUntil: "networkidle" });

    const botao = page.getByRole("button", { name: "Primario" });
    await botao.focus();

    const contorno = await botao.evaluate((elemento) => {
      const estilo = getComputedStyle(elemento);
      return { largura: estilo.outlineWidth, estilo: estilo.outlineStyle };
    });

    expect(parseFloat(contorno.largura)).toBeGreaterThanOrEqual(2);
    expect(contorno.estilo).not.toBe("none");
  });

  test("o modal prende o foco e o devolve a quem o abriu", async ({ page }) => {
    await page.goto(`${URL_FRONT}/`, { waitUntil: "networkidle" });

    const gatilho = page.getByRole("button", { name: "Abrir modal" });
    await gatilho.click();

    const dialogo = page.getByRole("dialog");
    await expect(dialogo).toBeVisible();

    // Doze tabulacoes: mais do que ha' de focalizavel dentro do dialogo. Se o
    // foco escapasse, teria saido para a pagina e o `toBeVisible` de dentro
    // falharia.
    for (let i = 0; i < 12; i += 1) await page.keyboard.press("Tab");
    await expect(dialogo.locator(":focus")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialogo).toBeHidden();
    await expect(gatilho).toBeFocused();
  });

  test("o menu navega por setas e devolve o foco no Esc", async ({ page }) => {
    await page.goto(`${URL_FRONT}/`, { waitUntil: "networkidle" });

    const gatilho = page.getByRole("button", { name: "Abrir menu" });
    await gatilho.focus();
    await page.keyboard.press("Enter");

    // Aberto por TECLADO, o menu ja' poe o foco no primeiro item — e' o padrao
    // WAI-ARIA, e e' o que evita uma tabulacao a mais para chegar ao conteudo.
    // Aberto por ponteiro, nao poe.
    await expect(page.getByRole("menu")).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Meu perfil" })).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("menuitem", { name: "Mensagens" })).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("menuitem", { name: "Sair" })).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toBeHidden();
    await expect(gatilho).toBeFocused();
  });

  test("nada da pagina exige rolagem horizontal em tela estreita", async ({ page }) => {
    // WCAG 1.4.10 (reflow), a 320px. No legado a navegacao primaria
    // simplesmente sumia abaixo de 768px, sem substituto.
    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto(`${URL_FRONT}/`, { waitUntil: "networkidle" });

    const transborda = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(transborda).toBe(false);
  });
});

test.describe("fontes hospedadas no proprio servidor (ADR-007, LGPD)", () => {
  test("nenhuma requisicao sai para fora da propria origem", async ({ page }: { page: Page }) => {
    // A CSP ja' proibe (`font-src 'self'`), mas uma proibicao que ninguem
    // exercita nao e' garantia: este teste OLHA o trafego. Em rede fechada de
    // homologacao, uma fonte do Google nao carregaria — e o texto sairia com a
    // reserva sem que ninguem soubesse por que.
    const externas: string[] = [];
    page.on("request", (requisicao) => {
      const url = new URL(requisicao.url());
      const permitidas = new Set(["frontend", "backend", "localhost", "127.0.0.1"]);
      if (!permitidas.has(url.hostname) && url.protocol.startsWith("http")) {
        externas.push(requisicao.url());
      }
    });

    await page.goto(`${URL_FRONT}/`, { waitUntil: "networkidle" });

    expect(externas, `Requisicoes para fora:\n${externas.join("\n")}`).toEqual([]);
  });
});
