# Validação de acessibilidade — RECPSP (base nova)

> Resultado **datado** de cada rodada de `make a11y-check`, no padrão que a
> Biblioteca Digital adota. O contrato é o ADR-007 transversal; a implementação
> na frente está em [`design-system.md`](design-system.md), seção 5.
>
> Regra: uma rodada só entra aqui depois de rodar **dentro do contêiner**
> (ADR-008). Resultado obtido na máquina não vale.

---

## Rodada 1 — 27/08/2026 (etapa 1: design system e taxonomia)

**Comando:** `make a11y-check` · **Ferramentas:** Playwright 1.62.1
(imagem oficial `mcr.microsoft.com/playwright:v1.62.1-noble`), axe-core 4.13,
HTML_CodeSniffer 2.5.1.

### Páginas medidas

| Página | Servida por | Endereço na rede do Compose |
|---|---|---|
| Amostra do design system | Vite | `http://frontend:5173/` |
| Raiz da aplicação | Django | `http://backend:8004/` |

A amostra é medida **três vezes**: em repouso, com o modal aberto e com o menu
suspenso aberto. Sobreposição fechada não existe no DOM — medir só o repouso
deixaria de fora justamente os componentes com mais ARIA.

### Resultado: **11 de 11 verificações passaram**

| # | Verificação | Resultado |
|---|---|---|
| 1 | axe-core — amostra (Vite), em repouso | ✅ zero violação |
| 2 | axe-core — raiz da aplicação (Django) | ✅ zero violação |
| 3 | axe-core — amostra com modal e com menu abertos | ✅ zero violação |
| 4 | HTML_CodeSniffer WCAG2AA — amostra (Vite) | ✅ zero erro |
| 5 | HTML_CodeSniffer WCAG2AA — raiz (Django) | ✅ zero erro |
| 6 | Teclado — skip link é o primeiro alvo e move o foco ao `main` | ✅ |
| 7 | Teclado — anel de foco desenha (≥ 2 px, estilo declarado) | ✅ |
| 8 | Teclado — modal prende o foco e o devolve ao gatilho no Esc | ✅ |
| 9 | Teclado — menu navega por setas e devolve o foco no Esc | ✅ |
| 10 | Reflow — sem rolagem horizontal a 320 px (WCAG 1.4.10) | ✅ |
| 11 | LGPD/ADR-007 — nenhuma requisição sai da própria origem | ✅ |

Etiquetas do axe: `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`,
`best-practice`. Critério aplicado: **zero violação de qualquer gravidade** —
mais duro que o "0 sérios" do ADR-007.

### Dois defeitos reais encontrados e corrigidos nesta rodada

1. **`aria-hidden-focus`, gravidade *serious*, 6 nós.** O `DropdownMenu` do
   Radix nasce **modal**, e menu modal marca `aria-hidden="true"` na página
   inteira enquanto está aberto — sem tornar nada inerte. O resultado é
   conteúdo escondido do leitor de tela e ainda alcançável pela tabulação.
   Corrigido com `modal={false}`, que também é o correto pelo padrão WAI-ARIA
   de menu de botão: menu de ações não é diálogo, e sair dele com Tab deve
   funcionar. **Este defeito só apareceu porque a medição abre as
   sobreposições** — em repouso, o menu não existe no DOM.
2. **`--sp-text-secondary` reprovando AA sobre a seção alternada** (4,43:1). Não
   foi o axe que pegou, e sim o teste de contraste dos tokens
   (`frontend/src/estilos/tokens.test.ts`): o valor da especificação era medido
   sobre branco, mas o token também é usado sobre `#F5F5F5`. Escurecido para
   `#5D6572` (5,88:1 e 5,40:1). O `design-system.md` foi corrigido na mesma
   sessão.

### Uma regra desligada, e por quê

`region` (boa prática — não é critério da WCAG) fica desligada **somente** na
medição com sobreposição aberta. Sobreposição do Radix nasce num portal preso
ao `body`, fora de qualquer landmark por construção — é o que impede que um
ancestral com `overflow: hidden` a corte. O conteúdo não está órfão: pertence a
um gatilho que está dentro de landmark, e a relação é declarada por
`aria-expanded`/`aria-controls`. Nas duas medições de repouso a regra continua
ligada.

### Prova de que a verificação sabe reprovar

Uma `<img>` sem texto alternativo foi inserida na amostra de propósito. Os dois
motores acusaram — `image-alt` de gravidade **crítica** no axe, e erro
correspondente no HTML_CodeSniffer — e a página do Django, não alterada, seguiu
verde. A mutação foi revertida e a rodada refeita, com os 11 resultados acima.

Sem esse passo, "11 de 11 passaram" não distingue uma página acessível de um
arranjo que nunca falharia.

### O que esta rodada **não** cobre

- **Só as duas páginas que existem.** As telas do produto (Centro de
  Capacitação, Fórum, Home) são das etapas 2 a 5; cada uma entra aqui quando
  nascer.
- **Um só navegador** (Chromium). Firefox e WebKit estão na imagem e podem
  entrar como projetos do Playwright quando houver motivo.
- **Nenhum leitor de tela real.** Ferramenta automática cobre em torno de um
  terço dos critérios da WCAG. Navegação assistida com NVDA ou VoiceOver
  continua sendo teste de gente, e fica para a validação de paridade com a
  equipe (etapa 6).
- **Nenhuma medição de desempenho.** O critério "Lighthouse ≥ 95" do ADR-007
  não é medido em separado — a categoria de acessibilidade do Lighthouse é o
  próprio axe-core. Razão registrada em `design-system.md`, seção 5.
