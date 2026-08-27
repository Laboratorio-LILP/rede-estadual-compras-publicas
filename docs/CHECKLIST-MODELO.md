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

- [ ] Etapa 0 — fundação: esqueleto, contêineres (ADR-008), Makefile novo, CI nova, CSP estrita.
- [ ] Etapa 1 — design system (tokens ADR-007, componentes com teclado e rótulo) + taxonomia BDLP semeada.
- [ ] Etapa 2 — Capacitação completa, gerida pelo admin. **Pré-condição: chave do YouTube rotacionada.**
- [ ] Etapa 3 — contas, cadastro escalonado, sentinela; trilho Gov.br aberto com a TI.
- [ ] Etapa 4 — fórum com moderação total e três eixos. **Pré-condição: dono da moderação nomeado (pergunta 17).**
- [ ] Etapa 5 — mensagens, notificações, home gerida, busca transversal, indicadores mínimos.
- [ ] Etapa 6 — corte: paridade validada, `DEPLOY.md`, legado fora da árvore, `recpsp.onrender.com` desativado.

## Pendências que a reescrita NÃO resolve

- [ ] **Rotacionar a chave do YouTube Data API** exposta no histórico (P1 —
  vencida; só a rotação no Google Cloud corrige; o histórico importado a
  preserva mesmo com o legado fora da árvore).
- [ ] Acessibilidade **medida**: `make a11y-check` com os quatro critérios do
  ADR-007 verde em toda página pública (o piso agora existe; falta medir).
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
