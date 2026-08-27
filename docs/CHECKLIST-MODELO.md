# Checklist "Pronto-para-Modelo" — RECPSP

**Este arquivo é o placar da frente** — marque ao fechar cada item e registre a
data. Reorganizado em 27/08/2026 com a decisão de reescrita (ADR 0002): a seção
de hardening herdado foi dividida entre o que segue aberto, o que fechou e o que
a reescrita torna propriedade da base nova.

## Casca reutilizável (padrão LILP) — fechada em 26/08/2026

- [x] Repo na org `Laboratorio-LILP`; clone FORA do OneDrive (ADR-002). *(26/08)*
- [x] Compose `lilp-recpsp`; portas sem conflito; loopback. *(26/08)*
- [x] `JWT_SECRET` obrigatório na via canônica — o stack não sobe sem ele. *(26/08)*
- [x] Suíte mínima (5 front + 39 API) e lint limpos; CI verde em PR e na `main`. *(26/08)*
- [x] Servidor testável (`app` exportado; playlists puláveis). *(26/08)*
- [x] Defeito de exclusão corrigido em transação, com regressão. *(26/08)*

## Decisão e especificação da reescrita — fechada em 27/08/2026

- [x] ADRs transversais: ADR-007 (design system + acessibilidade) e ADR-008
  (ambiente em contêiner); atualizações em ADR-001/004/005; portas alocadas
  (8004 · 5434 · 5173). *(27/08)*
- [x] ADRs da frente: 0001 banco · 0002 reescrita e transição · 0003 papéis,
  moderação e taxonomia. *(27/08)*
- [x] Specs: arquitetura-alvo · modelo de dados · design system · plano de
  implementação. *(27/08)*
- [x] Perguntas 4, 5, 11–16 decididas e migradas no `QUESTIONS.md`; novas 17–19
  abertas. *(27/08)*
- [ ] Validação do pacote com a equipe (reunião semanal — levar perguntas 17–19).

## Base nova — placar por etapa do plano (`docs/specs/plano-de-implementacao.md`)

- [x] Etapa 0 — fundação: esqueleto, contêineres (ADR-008), Makefile novo, CI nova, CSP estrita. *(27/08)*
  - `make up` sobe os três serviços — app **8004**, Postgres **5434**, Vite **5173**, todos publicados em `127.0.0.1` (conferido com `docker ps` e `netstat`).
  - `make test` roda pytest (20) e Vitest (7) **de dentro do contêiner** — o que a sessão de 26/08 provou ser impossível no legado.
  - Página raiz com **CSP estrita** verificada por teste: `default-src 'none'`, sem `unsafe-inline`, sem `unsafe-eval`.
  - Segredo ausente **derruba o boot em produção**, com teste que exige a falha.
  - `make lint` verde: ruff, **mypy estrito**, tsc, ESLint (jsx-a11y estrito) e o guardião que proíbe hexadecimal fora de `tokens.css`.
  - `make auditoria`: **zero** vulnerabilidades nas duas cadeias (a do legado tem 54). A auditoria já pagou por si — apontou PYSEC-2026-1845 no pytest, corrigida na mesma sessão.
  - Imagem de produção construída e conferida: roda sem privilégio (`recpsp`, uid 10001).
  - CI verde no GitHub após o push de `143b8ca`: os três trabalhos da esteira nova e o do legado.
  - **Divergência consciente registrada:** [ADR 0004](adr/0004-loopback-em-conteiner.md) — em contêiner o loopback é garantido pela publicação no host; a letra do ADR-004 transversal precisa de nota (proposta na vault).
- [x] Etapa 1 — design system (tokens ADR-007, componentes com teclado e rótulo) + taxonomia BDLP semeada. *(27/08)*
  - **Tokens completos** em `frontend/src/estilos/tokens.css`, em duas camadas (paleta do contrato · papel de interface), mapeados no tema do **Tailwind 4** — que entrou pelo `vite.config.ts`, e não por arquivo na raiz.
  - **`tema.css` zera as escalas de fábrica** (`--color-*: initial` e o mesmo para tipografia, raio e sombra): depois disso `bg-red-500` e `text-gray-400` deixam de existir. Sem isso o guardião de hexadecimal seria contornável por acidente — `text-gray-400`, a classe de 2,54:1 usada 113 vezes no legado, não tem hexadecimal nenhum.
  - **Contraste medido, não declarado:** `tokens.test.ts` lê `tokens.css` do disco e calcula a razão WCAG de **cada par que o produto desenha** (34 asserções). Achou um defeito real da especificação — `--sp-text-secondary` dava 4,43:1 sobre a seção alternada.
  - **Fontes no próprio servidor:** Montserrat (OFL 1.1) versionada em `estilos/fontes/`, 3 pesos `latin`, 18 KB cada; Verdana é fonte de sistema e **não pode ser redistribuída** (licença Microsoft). Um teste **olha o tráfego** e reprova se qualquer requisição sair da origem.
  - **Layout raiz:** landmarks, skip link como primeiro alvo da tabulação, um `<h1>` por página (a rota `/` do legado não tinha nenhum) e foco visível global.
  - **Onze componentes** com teste de teclado e de rótulo: `LayoutRaiz`, `Botao`, `Campo`, `Cartao`, `Selo`, `Alerta`, `Toast`, `Modal`, `MenuSuspenso`, `Carregando`, `EstadoVazio`. Comportamento de sobreposição vem do **Radix**, nada de teclado reimplementado à mão.
  - **App `taxonomia`:** `CategoriaProcessual`, `Assunto` e `Natureza`, migração inicial **com índices e travas de integridade** (ADR 0001), e `seed_taxonomia` idempotente com a **BDLP v9** — 30 termos processuais, 19 assuntos (14 BDLP + 5 da Lina, com origem marcada) e 5 naturezas.
  - **Página de amostra** com o inventário inteiro e todos os estados.
  - **`make a11y-check` deixou de ser vazio:** 11 verificações, verdes. axe-core **zero violação de qualquer gravidade** e HTML_CodeSniffer **zero erro WCAG2AA** nas duas páginas, mais suíte de teclado e reflow a 320 px. Relatório datado em [`specs/validacao_a11y.md`](specs/validacao_a11y.md).
  - **Placar:** `make lint` verde · `make test` com **157** testes (39 back + 118 front) · `make auditoria` **zero** vulnerabilidades nas **três** cadeias · `make build-app` verde.
  - **Achados corrigidos na própria etapa:** o `MenuSuspenso` marcava a página inteira como `aria-hidden` (gravidade *serious*); o `Botao` descartava props e quebrava todo modal e menu por `asChild`; `perigo` e `primario` desenhavam idênticos; `make format` nunca formatava quando havia erro não corrigível.
  - **Specs corrigidos na mesma sessão** (regra do `CLAUDE.md`): `design-system.md` → v1.1, com cinco correções marcadas; ADR 0003 → tabela da taxonomia completada (faltavam 5 microcategorias) e regra de capitalização registrada.
- [ ] Etapa 2 — Capacitação completa, gerida pelo admin. **Pré-condição: chave do YouTube rotacionada.**
- [ ] Etapa 3 — contas, cadastro escalonado, sentinela; trilho Gov.br aberto com a TI.
- [ ] Etapa 4 — fórum com moderação total e três eixos. **Pré-condição: dono da moderação nomeado (pergunta 17).**
- [ ] Etapa 5 — mensagens, notificações, home gerida, busca transversal, indicadores mínimos.
- [ ] Etapa 6 — corte: paridade validada, `DEPLOY.md`, legado fora da árvore, `recpsp.onrender.com` desativado.

## Pendências abertas pela etapa 0

- [ ] **Nota no ADR-004 transversal** (vault): a prescrição de ligar o Vite em
  `127.0.0.1` dentro do contêiner não é realizável; o loopback é garantido pela
  publicação no host. Texto proposto no [ADR 0004](adr/0004-loopback-em-conteiner.md).
- [ ] **Nome do projeto Compose no corte:** a base nova roda como
  `lilp-recpsp-nova` enquanto as duas gerações convivem. Na etapa 6 ela assume
  `lilp-recpsp` e a porta 8003.
- [x] **CI verde no GitHub** *(27/08)* — `main` empurrada (`143b8ca`); a esteira
  nova passou nos três trabalhos (lint/testes/build, auditoria de dependências,
  imagem de produção) e a do legado também. Último item do critério de pronto
  da etapa 0, fechado.

## Pendências que a reescrita NÃO resolve

- [ ] **Rotacionar a chave do YouTube Data API** exposta no histórico (P1 —
  vencida; só a rotação no Google Cloud corrige; o histórico importado a
  preserva mesmo com o legado fora da árvore).
- [~] Acessibilidade **medida**: o laço existe e roda verde desde 27/08 nas
  **duas páginas que existem** (amostra do design system e raiz da aplicação) —
  ver [`specs/validacao_a11y.md`](specs/validacao_a11y.md). Continua aberto
  porque as telas do produto nascem nas etapas 2 a 5, e cada uma precisa entrar
  na medição. Fora do alcance da ferramenta automática, e ainda pendente:
  navegação com leitor de tela real (NVDA/VoiceOver), na validação de paridade
  com a equipe (etapa 6).
- [ ] `DEPLOY.md` quando o caminho de homologação estiver montado (esteira — TI).
- [ ] Confirmar com a coordenação o titular do copyright da LICENSE (MIT).
- [ ] Documento de Requisitos v1.2 — o `.md` chegou à v1.1 em 26/08 (as-is das
  rodadas do dia), mas a reescrita datou o as-is de novo; atualizar o `.md`,
  regenerar `.docx`/`.pdf` (ainda na v1.0) e republicar no OneDrive.

## Fechadas no legado em 26/08 (registro)

- [x] Credenciais de seed fora do código em produção (`ADMIN_PASSWORD`/sorteio;
  `SEED_DEMO_DATA=0` padrão). · [x] `JWT_SECRET` sem fallback (exit em produção;
  efêmero fora). · [x] CSP estrita verificada. · [x] Paleta GESP (nota: o token
  de ação muda para `#BD0E15` na base nova — ADR-007). · [x] LICENSE MIT. ·
  [x] URL executável bloqueada no renderizador. · [x] `trust proxy` configurável.

## Tornadas propriedade da base nova (não são mais tarefas)

Migrações de schema → Django (ADR 0001) · índices → migração inicial (ADR 0001) ·
FKs com política explícita → modelo novo (ADR 0001) · rate limit além do login →
toda a API por construção · sub-path clean → os quatro pontos do ADR-005 na
arquitetura-alvo · isolamento do admin → caminho próprio + pedido de subdomínio
(ADR-005).
