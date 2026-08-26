# Checklist "Pronto-para-Modelo" — RECPSP

Adaptado do checklist da BDLP (`biblioteca-digital-logistica-publica/docs/CHECKLIST-MODELO.md`)
para a realidade desta frente: monólito Node (Express 5 + SQLite + React 19), importado de
protótipo externo em 26/08/2026. **Este arquivo é o placar da frente** — marque ao fechar
cada item e registre a data.

## Casca reutilizável (padrão LILP)

- `docker-compose.yml` — stack `lilp-recpsp`, serviço único em loopback `127.0.0.1:8003`,
  volume nomeado `lilp-recpsp_dbdata`, fail-loud sem `JWT_SECRET`.
- `Dockerfile` — dois estágios: build do front + runtime enxuto (só `dependencies`).
- `Makefile` — interface de operação (setup/up/down/logs/shell/test/clean).
- `.env.example` (fonte única das chaves), `.github/workflows/ci.yml`.
- `CLAUDE.md` + `docs/` (`ARCHITECTURE.md`, `MODELO_DE_DADOS.md`, `QUESTIONS.md`, este arquivo).

## Conteúdo específico (o que a RECPSP substitui em relação à BDLP)

- Backend Django + Postgres → monólito Express 5 + SQLite (decisão de banco pendente — ADR 0001).
- Seeds de taxonomia da BDLP → seed de categorias/tags/conteúdo de demonstração em `server/index.js`.
- Identidade visual e textos próprios da Rede (Linguagem Simples; brasão e assinaturas em `public/`).

## Checklist de bootstrap

- [x] Repo na org `Laboratorio-LILP`; clone de trabalho FORA do OneDrive (ADR-002). *(26/08/2026)*
- [x] `name: lilp-recpsp` no compose; mapa de portas sem conflito (8003; BDLP 8000/8080/5432, PESCP 8002/5433). *(26/08/2026)*
- [x] `cp .env.example .env`; `JWT_SECRET` forte obrigatório — o stack não sobe sem ele. *(26/08/2026)*
- [x] `make up` sobe o serviço; stack verificada no ar. *(26/08/2026)*
- [x] Suíte de testes mínima passando (`make test` = front + API) e `npm run lint` limpo. *(26/08/2026, sessão do laço de verificação)*
- [x] CI verde: `.github/workflows/ci.yml` roda `npm ci`, lint, testes de front, testes de API e build, em PR e na `main`; comandos validados localmente (lock conferido contra o npm da imagem `node:22`). *(26/08/2026)*
- [x] Servidor testável: `app` exportado, `listen` condicionado a `require.main`, importação de playlists pulável (`SKIP_PLAYLIST_IMPORT=1`). *(26/08/2026)*
- [x] Defeito de exclusão (FK de curtidas de resposta) confirmado em execução, corrigido em transação e coberto por regressão (`server/test/exclusao.test.js`). *(26/08/2026)*

## Hardening — pendências herdadas (trabalho de entrada da frente)

- [ ] **Rotacionar a chave do YouTube Data API** exposta no histórico Git (P1 — Todoist; só a rotação no Google Cloud resolve).
- [x] Credenciais de seed fora do código em produção: admin com `ADMIN_PASSWORD` ou senha sorteada e impressa uma única vez; usuários de exemplo só com `SEED_DEMO_DATA=1`. Fora de produção o padrão de dev segue, de propósito. *(26/08/2026)*
- [x] `JWT_SECRET` sem fallback: com `NODE_ENV=production` o servidor recusa subir; fora de produção gera segredo aleatório por processo — nenhuma constante de assinatura fica versionada. *(26/08/2026)*
- [x] CSP estrita em produção: `script-src 'self'`, com `INLINE_RUNTIME_CHUNK=false` no build. Verificada no navegador. *(26/08/2026)*
- [ ] Rate limit além da autenticação (hoje só register/login têm limite).
- [x] Paleta GESP `#ED1C24` no `tailwind.config.js` e nos 38 literais do `src/`. *(26/08/2026)*
- [ ] Acessibilidade eMAG 3.1 + WCAG 2.0 AA, auditada.
- [x] Arquivo `LICENSE` (MIT). Titular do copyright a confirmar com a coordenação. *(26/08/2026)*
- [x] URL executável (`javascript:`, `data:`) bloqueada no renderizador de markdown do fórum. *(26/08/2026)*
- [x] `trust proxy` configurável: sem ele, atrás de proxy o rate limit de login conta todos os usuários como um IP só. *(26/08/2026)*
- [ ] Mecanismo de migração de schema (hoje só `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE` em try/catch; decidir junto com o ADR 0001 — banco).
- [ ] Índices no schema (não há nenhum `CREATE INDEX`; independe da decisão de banco).
- [ ] FKs com `ON DELETE CASCADE` (recomendação estrutural para o ADR 0001; a correção atual é limpeza manual em transação).
- [ ] `docs/DEPLOY.md` (não existe; escrever quando o caminho de homologação da frente for definido — ADR-006).
- [ ] "Sub-path clean" e isolamento do admin (ADR-005 — a verificar no front).
- [ ] Desativar a hospedagem de teste externa (`recpsp.onrender.com`) quando a homologação institucional subir.
- [ ] ADRs de repositório (`docs/adr/`, padrão BDLP) — o 0001 (banco de produção) é o primeiro.
