# Design system da RECPSP

> Implementação, nesta frente, do contrato transversal do laboratório —
> [`ADR-007`](https://github.com/Laboratorio-LILP) na vault
> (`Padrões/Design System LILP.md`). O contrato fixa valores e comportamento;
> este documento fixa como a RECPSP os realiza em React + Tailwind, e o que se
> preserva do mockup do Eduardo.

| | |
|---|---|
| Versão | 1.0 |
| Data | 27/08/2026 |
| Princípio 1 | **Conceito e layout do mockup são fiéis; cor e tipografia são corrigidas** onde a acessibilidade exige. Ninguém redesenha telas validadas pela equipe. |
| Princípio 2 | Acessibilidade por construção, não por auditoria ao final — os números do legado (0 `onKeyDown` em 8.215 linhas, 28 rótulos órfãos, 15 formas de botão) são o que acontece sem regra. |

---

## 1. Tokens

Declarados uma vez como CSS custom properties (nomes `--sp-*`, os mesmos da BDLP)
e mapeados no tema do Tailwind. **Nenhum valor hexadecimal fora do arquivo de
tokens** — regra de lint.

### Cor (contrato ADR-007)

| Token | Valor | Uso |
|---|---|---|
| `--sp-red` | `#ED1C24` | **marca — só não-texto** (preenchimento, ícone, borda, faixa) |
| `--sp-red-dark` | `#BD0E15` | **ação** — texto vermelho e fundo de botão primário (6,49:1) |
| `--sp-red-darker` | `#9B0B11` | botão primário sob o ponteiro |
| `--sp-blue` | `#034EA2` | link, foco, botão secundário (8,03:1) |
| `--sp-green` | `#0B9247` | sucesso — só não-texto ou texto grande |
| `--sp-yellow` | `#FBB900` | secundária GESP — nunca com texto branco |
| `--sp-petrol` | `#233254` | faixas escuras, rodapé |
| `--sp-gray-light` | `#F5F5F5` | fundo de seção alternada |
| `--sp-gray-medium` | `#BFBFBF` | bordas |
| `--sp-gray-dark` | `#808080` | texto auxiliar **grande** apenas |

Extensões locais da RECPSP (neutros de texto, todos ≥ 4,5:1 sobre branco):

| Token | Valor | Uso |
|---|---|---|
| `--sp-text` | `#1D1D1B` | corpo (16,0:1) |
| `--sp-text-secondary` | `#6B7280` | metadados, legendas (4,83:1) — substitui o `text-gray-400` de 2,54:1 usado 113 vezes no legado |

**Correção obrigatória herdada:** o vermelho de ação adotado em 26/08 foi
`#BE161D`; o contrato fixa `#BD0E15` (o da BDLP). Troca na base nova; o legado
congelado não se toca.

### Tipografia, espaço e forma

- **Corpo:** Verdana; **títulos e rótulos:** Montserrat com reserva Verdana.
  **Fontes hospedadas no próprio servidor** (`@font-face` local) — sem requisição
  ao Google por visitante (LGPD + VPN, ADR-007).
- Escala de texto: 12 · 14 (base) · 16 · 18 · 20 · 24 · 30 px. Nada abaixo de
  12 px (o legado usava 10 e 11).
- Raio: **3 valores** — `sm` 4px (campos, selos), `md` 8px (cartões, botões),
  `full` (avatar, pílula). O legado usava 7.
- Sombra: **2 valores** — `card` e `card-hover` (os do legado, que eram bons).
- Espaço: escala de 4 px do Tailwind; container de página único
  (`max-w-6xl` + `px-4`) — o legado tinha 5 larguras e 5 paddings para o mesmo papel.
- Breakpoints padrão do Tailwind (640/768/1024); **menu móvel existe** — no
  legado a navegação primária sumia abaixo de 768 px sem substituto.

## 2. Primitivos e regras de construção

Comportamento vem de **Radix UI** (headless: Dialog, DropdownMenu, Tabs, Popover,
Tooltip, Toast) ou de elemento nativo do HTML. Aparência vem dos tokens. As quatro
regras do ADR-007 valem como revisão de código:

1. clicável é `button` ou `a`;
2. todo campo tem rótulo associado (`id`/`htmlFor` resolvidos **dentro** do componente `Campo`);
3. sobreposição fecha com `Esc`, prende e devolve o foco (Radix entrega isso);
4. nada de comportamento de teclado reimplementado à mão.

Mais: um `<h1>` por página (a rota `/` do legado não tinha nenhum); landmarks
(`header`, `nav`, `main`, `footer`) e skip link no layout raiz; `aria-live` para
toasts e erros de formulário; foco visível global azul (herdado do legado — o
único mecanismo central que funcionava lá).

## 3. Inventário de componentes

O critério de existência: **cada padrão que o legado repetiu ≥ 3 vezes vira
componente com variantes tipadas.** Estados mínimos de todo interativo:
default · hover · focus-visible · active · disabled · loading.

| Componente | Variantes | Base | Substitui no legado |
|---|---|---|---|
| `Botao` | `primario · secundario · fantasma · perigo` × `sm · md` | nativo | 22 ocorrências em 15 formas |
| `Campo` (input/select/textarea) | erro, ajuda, obrigatório | nativo | 50 controles em 24 formas, 6 anéis de foco, 28 rótulos órfãos |
| `Cartao` | `plano · elevado` | nativo | ~36 superfícies em ~27 formas |
| `Selo` | `papel · especialidade · formato · nivel · situacao` | nativo | 37 pills em 24 formas; `ROLE_STYLES` divergente azul/verde |
| `Avatar` | `sm · md · lg` | nativo | 4 implementações com cores conflitantes — cor determinística por usuário, única |
| `Modal` | — | Radix Dialog | 2 modais ad hoc sem teclado (um deles bloqueante e sem saída) |
| `MenuSuspenso` | — | Radix DropdownMenu | busca e notificações inacessíveis por teclado |
| `Toast` | `sucesso · erro · info` | Radix Toast | os 21 `alert()` |
| `Alerta` | `info · sucesso · aviso · erro` | nativo + `role="alert"` | 9 caixas em 6 formas, nenhuma anunciada |
| `EstadoVazio` / `Carregando` | ícone, ação | nativo / skeleton | 14 vazios sob medida; 10 "Carregando..." em 6 marcações, zero skeleton |
| `Paginacao` | — | nativo | 60 linhas coladas numa página só |
| `Tabela` | ordenável | nativo `<table>` | a pseudo-tabela de `div` com 608px fixos da Home |
| `Breadcrumbs` | — | nativo | o único componente bom do legado — portar |
| `NavegacaoPrincipal` | desktop · móvel (drawer) | Radix | navbar de 697 linhas; menu móvel inexistente |
| `EditorMarkdown` + `ConteudoFormatado` | — | textarea + react-markdown | renderizador artesanal com XSS de `href`; sanitização por biblioteca, allowlist de esquema, **sob teste** |
| `Icone` | registro único | SVG próprio | 101 SVGs inline, `Icon` definido 3× |

Regra de paridade visual: cada componente nasce do screenshot da tela
correspondente do mockup; a diferença permitida é a do mapa da seção 4.

## 4. Mapa de correção do mockup (de → para)

| No mockup (legado) | Na base nova | Motivo |
|---|---|---|
| `#FF161F` / `red-500` em botão | `--sp-red-dark` `#BD0E15` | 3,90:1 → 6,49:1 (AA) |
| `#ED1C24` com texto branco | permitido só em não-texto | 4,38:1 reprova AA |
| `text-gray-400` (113 usos) | `--sp-text-secondary` | 2,54:1 → 4,83:1 |
| `text-[10px]`/`text-[11px]` | 12 px mínimo | legibilidade |
| 5 das 8 cores de tag reprovando com branco | paleta de selos recalculada dos tokens | AA |
| campos escuros no painel de perfil | mesmo `Campo` claro de todo o produto | consistência |
| hover por `onMouseEnter` em JS | estados CSS dos tokens | manutenção |
| navegação some < 768 px | drawer móvel | RNF-ACE-01 |

Todo o resto — estrutura das telas, cards da home, hierarquia do centro de
capacitação, fluxos do fórum — **é reproduzido como está**.

## 5. Verificação

- **Lint:** `eslint-plugin-jsx-a11y` no perfil estrito + regra local proibindo
  hexadecimal fora do arquivo de tokens e `style=` de cor.
- **Teste de componente:** cada interativo tem teste de teclado e de rótulo
  (Vitest + Testing Library).
- **`make a11y-check`:** Playwright + axe-core nas páginas construídas — os
  quatro critérios do ADR-007 (Lighthouse ≥ 95 · axe 0 sérios · pa11y 0 erros
  WCAG2AA · teclado funcional).
- Resultado datado registrado neste diretório a cada rodada (padrão
  `validacao_a11y.md` da BDLP).
