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
- [ ] Credenciais de seed fora do código (`admin`/`admin123` e 5 usuários `teste123` versionados; ver `docs/QUESTIONS.md`, pergunta 16).
- [ ] `JWT_SECRET` sem fallback também fora do Docker (hoje o servidor sobe com valor de dev e só avisa).
- [ ] CSP estrita em produção (hoje `contentSecurityPolicy: false` no helmet).
- [ ] Rate limit além da autenticação (hoje só register/login têm limite).
- [ ] Paleta GESP `#ED1C24` (hoje `#FF161F` no `tailwind.config.js`).
- [ ] Acessibilidade eMAG 3.1 + WCAG 2.0 AA, auditada.
- [ ] Arquivo `LICENSE` (MIT, padrão do laboratório).
- [ ] Mecanismo de migração de schema (hoje só `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE` em try/catch; decidir junto com o ADR 0001 — banco).
- [ ] Índices no schema (não há nenhum `CREATE INDEX`; independe da decisão de banco).
- [ ] FKs com `ON DELETE CASCADE` (recomendação estrutural para o ADR 0001; a correção atual é limpeza manual em transação).
- [ ] `docs/DEPLOY.md` (não existe; escrever quando o caminho de homologação da frente for definido — ADR-006).
- [ ] "Sub-path clean" e isolamento do admin (ADR-005 — a verificar no front).
- [ ] Desativar a hospedagem de teste externa (`recpsp.onrender.com`) quando a homologação institucional subir.
- [ ] ADRs de repositório (`docs/adr/`, padrão BDLP) — o 0001 (banco de produção) é o primeiro.
