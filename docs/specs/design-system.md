# Design system da RECPSP

> Implementação, nesta frente, do contrato transversal do laboratório —
> [`ADR-007`](https://github.com/Laboratorio-LILP) na vault
> (`Padrões/Design System LILP.md`). O contrato fixa valores e comportamento;
> este documento fixa como a RECPSP os realiza em React + Tailwind, e o que se
> preserva do mockup do Eduardo.

| | |
|---|---|
| Versão | **1.1** — corrigida em 27/08/2026 pela execução da etapa 1 (v1.0 em 27/08) |
| Data | 27/08/2026 |
| Princípio 1 | **Conceito e layout do mockup são fiéis; cor e tipografia são corrigidas** onde a acessibilidade exige. Ninguém redesenha telas validadas pela equipe. |
| Princípio 2 | Acessibilidade por construção, não por auditoria ao final — os números do legado (0 `onKeyDown` em 8.215 linhas, 28 rótulos órfãos, 15 formas de botão) são o que acontece sem regra. |
| Princípio 3 | **Acessível é medida, não adjetivo.** Todo par de cor que o produto desenha tem contraste calculado em `frontend/src/estilos/tokens.test.ts`, a cada `make test`. |

> **O que a v1.1 corrige.** A execução da etapa 1 encontrou cinco pontos em que
> este documento não sobreviveu ao contato com a implementação. Estão marcados
> como **Correção 1.1** ao longo do texto, com o motivo. Regra do `CLAUDE.md`:
> a implementação consciente vence e o spec é corrigido na mesma sessão.

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

Extensões locais da RECPSP (neutros de texto):

| Token | Valor | Uso |
|---|---|---|
| `--sp-text` | `#1D1D1B` | corpo (16,0:1 sobre branco) |
| `--sp-text-secondary` | **`#5D6572`** | metadados, legendas (5,88:1 sobre branco; **5,40:1 sobre `--sp-gray-light`**) — substitui o `text-gray-400` de 2,54:1 usado 113 vezes no legado |

> **Correção 1.1 — `--sp-text-secondary`.** A v1.0 fixava `#6B7280`, que dá
> 4,83:1 **sobre branco** — mas 4,43:1 sobre `--sp-gray-light` (`#F5F5F5`), o
> fundo das seções alternadas, onde ele também é usado. Reprova AA. O teste de
> contraste achou no primeiro RED; o valor foi escurecido para `#5D6572`, que
> passa nas três superfícies do produto (branco, cinza-claro e o cinza de
> desabilitado). A lição fica no princípio 3: contraste declarado numa
> superfície não é contraste garantido nas outras.

**Correção obrigatória herdada:** o vermelho de ação adotado em 26/08 foi
`#BE161D`; o contrato fixa `#BD0E15` (o da BDLP). Troca na base nova; o legado
congelado não se toca.

### Cores derivadas da paleta (medidas, não escolhidas por gosto)

A implementação precisou de valores que o ADR-007 não fixa: fundos tingidos
para os quatro alertas, um verde e um âmbar escuros para carregar texto, e um
cinza de borda de controle. Todos moram em `tokens.css`, e **cada par tem um
teste**:

| Papel | Par | Razão |
|---|---|---|
| Alerta de informação | `--sp-blue` sobre `#EAF1F9` | 7,05:1 |
| Alerta de sucesso | `#076B33` sobre `#E7F4EC` | 5,87:1 |
| Alerta de aviso | `#7A5300` sobre `#FDF3DA` | 6,20:1 |
| Alerta de erro | `--sp-red-dark` sobre `#FBEAEB` | 5,58:1 |
| Selo `papel` | branco sobre `--sp-petrol` | 12,68:1 |
| Selo `especialidade` | branco sobre `--sp-red-dark` | 6,49:1 |
| Selo `formato` | branco sobre `#4B5563` | 7,56:1 |
| Selo `nivel` | branco sobre `#076B33` | 6,65:1 |
| Selo `situacao` | `--sp-text` sobre `--sp-yellow` | 9,68:1 |
| Desabilitado | `#4B5563` sobre `#E5E7EB` | 6,10:1 |

> **Correção 1.1 — borda de campo.** O ADR-007 destina `--sp-gray-medium`
> (`#BFBFBF`) a "bordas". Como **contorno de controle** ele dá 1,84:1 e reprova
> o critério 1.4.11 da WCAG, que pede 3:1 para o que identifica um componente
> de interface — é a borda que diz onde o campo começa. Ficaram dois papéis
> separados: `--sp-borda` (`#BFBFBF`) para separador **decorativo**, isento; e
> `--sp-campo-borda` (`--sp-gray-dark`, `#808080`, 3,95:1) para contorno de
> controle. Correção de cor exigida pela acessibilidade — o que o princípio 1
> autoriza.
>
> **Correção 1.1 — o verde e o amarelo do contrato não carregam texto branco.**
> `--sp-green` com branco dá 4,03:1 e `--sp-yellow` dá 2,03:1. O ADR-007 já diz
> "só não-texto ou texto grande" e "nunca com texto branco"; a implementação
> respeita, com `--sp-green-dark` para selo e alerta, e texto escuro sobre o
> amarelo. Há teste **negativo** para as duas regras: se um dia a razão subir,
> a regra pode ser revista com dado.

### Tipografia, espaço e forma

- **Corpo:** Verdana; **títulos e rótulos:** Montserrat com reserva Verdana.
  **Sem requisição ao Google por visitante** (LGPD + VPN, ADR-007) — garantido
  por dois caminhos, e **verificado por teste que olha o tráfego da página**.

> **Correção 1.1 — só uma das duas famílias tem arquivo, e não pode ser
> diferente.** A v1.0 dizia "fontes hospedadas no próprio servidor (`@font-face`
> local)" para as duas. Na prática:
>
> - **Montserrat** é software livre sob a SIL Open Font License 1.1 —
>   redistribuível, e está versionada em `frontend/src/estilos/estatico/fontes/`
>   (subconjunto `latin`, pesos 400/600/700, 18 KB cada; origem
>   `@fontsource/montserrat@5.3.0`; a licença acompanha os arquivos).
> - **Verdana é fonte proprietária da Microsoft e a licença proíbe
>   redistribuí-la.** Também não é preciso: é fonte de sistema, presente em
>   praticamente toda máquina que vai abrir a plataforma, e fonte de sistema não
>   gera requisição nenhuma.
>
> O objetivo do ADR-007 — zero requisição a terceiro — fica cumprido pelos dois
> caminhos, e a CSP (`font-src 'self'`) o torna verificável pelo navegador. Há
> ainda um teste em `make a11y-check` que **observa a rede** e reprova se
> qualquer requisição sair da origem: proibição que ninguém exercita não é
> garantia.
>
> Os arquivos moram ao lado de `tokens.css` de propósito: o build do Vite e o
> Django leem o **mesmo** diretório. Não existe segunda cópia.
>
> **Correção 1.1 — nem todo CSS do design system é servível como está.** O
> Django publica `frontend/src/estilos/**estatico/**`, e não `estilos/` inteiro.
> Lá dentro só mora CSS puro — `tokens.css`, `fontes.css` e os arquivos de
> fonte —, que qualquer servidor entrega sem passo de build. `index.css`,
> `tema.css`, `base.css` e `componentes.css` dependem do Vite e do Tailwind e
> ficam **fora**: um `@import "tailwindcss"` num diretório publicado derruba o
> `collectstatic` de produção, que reescreve toda referência dentro de CSS.
> Foi assim que a etapa 1 quebrou a construção da imagem de produção sem que
> `make lint`, `make test` ou `make a11y-check` percebessem. A fronteira está
> sob teste em `backend/tests/test_estaticos.py`.
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

> **Correção 1.1 — `perigo` não pode ser igual a `primario`.** A primeira
> implementação preencheu os dois com `--sp-red-dark`, e "Salvar" e "Excluir"
> ficaram o mesmo alvo — que é exatamente o que o legado fazia, com `bg-red-500`
> nos dois. A distinção adotada é de **preenchimento**, não de matiz (o vermelho
> continua sendo a marca): `perigo` é **contornado** em repouso e preenche sob o
> ponteiro. Ação destrutiva não deve competir em peso visual com a ação primária
> da tela. Há teste que exige que os dois preenchimentos difiram.

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
  hexadecimal fora do arquivo de tokens e `style=` de cor
  (`make lint-tokens`).
- **Tema do Tailwind como trava, e não só como conveniência:**
  `frontend/src/estilos/tema.css` **zera** as escalas de fábrica
  (`--color-*: initial`, e o mesmo para tipografia, raio e sombra) e define
  só o que o contrato tem. Depois disso `bg-red-500` e `text-gray-400` deixam
  de existir. Sem isso o guardião seria contornável por acidente: ele proíbe
  hexadecimal, e `text-gray-400` — a classe de 2,54:1 usada 113 vezes no legado
  — não tem hexadecimal nenhum.
- **Teste de contraste** (`frontend/src/estilos/tokens.test.ts`): lê
  `tokens.css` do disco, resolve as indireções de `var()` e calcula a razão
  WCAG de **cada par que o produto desenha**. Token novo que vá por cima de
  outro entra na tabela de lá — senão ninguém mediu. Há também testes
  *negativos*: provam por que a marca não carrega texto branco (4,38:1) e por
  que o cinza auxiliar só serve a texto grande (3,95:1).
- **Teste de componente:** cada interativo tem teste de teclado e de rótulo
  (Vitest + Testing Library + `user-event`).
- **`make a11y-check`:** Playwright na imagem oficial, sobre as páginas **no
  ar** — a amostra do design system (Vite) e a raiz da aplicação (Django),
  cada uma em repouso e a amostra também com modal e menu **abertos**.

### Os quatro critérios do ADR-007, e como cada um é atendido

| Critério | Como | Onde |
|---|---|---|
| axe 0 sérios | **Mais duro:** zero violação de qualquer gravidade, com as etiquetas `wcag2a/aa`, `wcag21a/aa`, `wcag22aa` e `best-practice` | `a11y/testes/acessibilidade.spec.ts` |
| pa11y 0 erros WCAG2AA | O **mesmo motor** (HTML_CodeSniffer) usado direto, sem o invólucro `pa11y` | idem |
| teclado funcional | Suíte própria: skip link como primeiro alvo, anel de foco que de fato desenha, prisão e devolução de foco no modal, setas e Esc no menu, e reflow a 320 px | idem |
| Lighthouse ≥ 95 | **Não é medido em separado, de propósito** — ver abaixo | — |

**Por que não Lighthouse.** A categoria de acessibilidade do Lighthouse *é* o
próprio axe-core, com um subconjunto das regras e uma média ponderada. Rodar os
dois mediria a mesma coisa duas vezes, uma delas cobrando minutos de Chrome sem
cabeça por execução da esteira. O critério aplicado aqui é mais rigoroso que o
dele: **zero violação**, não 95 pontos.

**Por que não `pa11y`.** O `pa11y` arrasta o Puppeteer, e com ele cinco
advisories de gravidade alta sem versão corrigida (`extract-zip`,
GHSA-jmr9-qjv8-65gv). A base nova mantém `make auditoria` em **zero** desde a
etapa 0, e trocar esse padrão por um invólucro não compensa: o pacote
`html_codesniffer` não tem dependência nenhuma, e quem dirige o navegador já é
o Playwright.

**A verificação sabe reprovar.** Em 27/08, uma imagem sem texto alternativo foi
inserida na amostra de propósito: os dois motores acusaram (`image-alt`,
gravidade crítica no axe) e a página do Django, não alterada, seguiu verde. Um
teste que nunca falha não verifica nada — a prova por mutação é o que separa as
duas coisas.

- Resultado datado registrado neste diretório a cada rodada
  ([`validacao_a11y.md`](validacao_a11y.md), padrão da BDLP).
