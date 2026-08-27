# RECPSP — Instruções da frente para o Claude Code

Rede Estadual de Compras Públicas de São Paulo (RECPSP), Projeto 3 do Portfólio
2026 do LILP. Este arquivo é a camada de **Instruções da frente**; viaja com o
repositório.

> **Estado da frente (27/08/2026): etapa 0 concluída — a fundação da base nova
> está de pé.** Este repositório carrega **duas gerações**: a base herdada do
> protótipo do Eduardo (Node/Express/SQLite — raiz, `server/`, `src/`), que roda
> como **demonstração congelada**, e a base nova (Django 5 + PostgreSQL 16 +
> React/Vite/TypeScript), em `backend/`, `frontend/` e `docker/`. **Nenhuma
> funcionalidade nova entra no legado** — nele, só correção de segurança crítica.
> Próxima etapa: **1 — design system e taxonomia**
> (`docs/specs/plano-de-implementacao.md`).

> **Pendência de segurança aberta (P1).** Há uma chave real do YouTube Data API
> no histórico Git, herdada do repositório de origem. Rotacioná-la no Google
> Cloud é a única correção. Ver **Segredos**, no fim.

## Limites de segurança — inegociáveis

Valem integralmente os limites do `LILP/CLAUDE.md` transversal e do ADR-006 da
vault (reunião CTI de 30/06/2026): **sem túneis** ou mecanismos de exposição
externa, **sem alterações de firewall**, **sem PowerShell** em host corporativo,
**sem acesso a servidores** — acesso restrito a TI/PRODESP; a **VPN é a via
única** de acesso remoto. Vedado usar IA para contornar barreiras de segurança.
Se algo estiver inacessível: **parar e registrar solicitação à TI**
(Felipe/Diego). Toda porta local em **loopback** — inclusive o servidor do Vite,
cujo padrão de fábrica (`0.0.0.0`) precisa ser desligado.

## Rito de sessão

O rito transversal vive em `LILP/CLAUDE.md` na árvore OneDrive. **Este clone fica
FORA do OneDrive** (ADR-002) — leia o rito e o estado direto na vault:

- Vault (Mac): `~/Library/CloudStorage/OneDrive-PRODESP/LILP/SGGD - SEGES - LILP/`
- Estado vivo do laboratório: `…/Mapa de Contexto Operacional.md` (ler por completo, até o Changelog)
- Estado desta frente: `…/Portfólio/Mapa-Semente — RECPSP.md`
- Decisões transversais: `…/ADR/` — a RECPSP é restringida por ADR-001, 002,
  004 (portas), 005 (subcaminho), 006 (regime de segurança), 007 (design
  system e acessibilidade) e 008 (ambiente em contêiner)

## Ordem de leitura desta frente

1. **Este arquivo** — limites e estado.
2. **`docs/adr/`** — as decisões da reescrita (ler o 0002 primeiro; o 0004
   registra por que o `vite.config.ts` diverge da letra do ADR-004).
3. **`docs/specs/`** — arquitetura-alvo, modelo de dados, design system, plano.
4. **`docs/QUESTIONS.md`** — o que segue sem decisão. **Não invente resposta.**
5. `docs/ARCHITECTURE.md` e `docs/MODELO_DE_DADOS.md` — **a base legada**, úteis
   enquanto a demonstração existir.
6. `docs/requisitos/` — os 46 RF + 19 RNF (a seção 7, as-is, ficou datada com a
   decisão de reescrita; pendência de v1.1 registrada).

## As duas gerações

| | Legado (demonstração) | Base nova |
|---|---|---|
| Onde | raiz: `server/`, `src/`, `public/` | `backend/`, `frontend/`, `docker/` |
| Stack | Express 5 + SQLite + React 19 sobre CRA | Django 5 + PostgreSQL 16 + React 19 sobre Vite/TS |
| Porta | web **8003** (compose `lilp-recpsp`) | app **8004** · Postgres **5434** · Vite **5173** (compose `lilp-recpsp-nova`) |
| Comandos | `make demo-*` | `make up`, `make test`, `make lint`… |
| Regra | **congelado** — só correção de segurança crítica | todo o trabalho novo |
| Banco | SQLite descartável (só demonstração) | modelo novo, sem migração de dados |
| Fim | some da árvore no corte (etapa 6) | assume a 8003 no corte |

## Comandos da base nova

Pré-requisito único: Docker. **Toda ferramenta roda dentro do contêiner**
(ADR-008) — não instale Python, Node nem PostgreSQL na máquina, e não rode
`pytest`, `npm` ou `ruff` no host: o resultado não vale.

- `make setup` — 1ª vez: valida o `.env` (falha sem `RECPSP_DB_PASSWORD`),
  constrói e sobe os três serviços.
- `make up` / `down` / `logs` / `ps` / `shell` / `shell-front`.
- `make test` — pytest + Vitest. `make lint` — ruff, mypy (estrito), tsc,
  ESLint, guardião de tokens. `make format` — ruff.
- `make saude` — confere API, CSP da página raiz e o repasse `/api` do Vite.
- `make migrate` / `makemigrations` / `superusuario`.
- `make build-app` (build do front + `check --deploy`) · `make auditoria` ·
  `make imagem` · `make ci` (o mesmo laço da esteira) · `make a11y-check`
  (vazio até a etapa 1).
- `make clean` — **apaga os volumes**, inclusive o banco de desenvolvimento.

### Armadilhas da base nova (aprendidas na etapa 0)

- **`node_modules` mora num volume**, senão o monte do host o encobre. Depois de
  mexer em `frontend/package.json`, rode `make build` — ele reconstrói a imagem
  **e renova o volume**. Sem isso o contêiner segue com a instalação antiga e a
  falha é silenciosa.
- **O Vite sobe a árvore procurando configuração de PostCSS** e acha a do
  legado, que carrega binário do macOS dentro de contêiner Linux. Por isso
  `vite.config.ts` declara `css.postcss` no lugar, e o compose esconde
  `/app/node_modules` e `/app/build` do host com volumes vazios.
- **Dentro do contêiner os servidores ligam em `0.0.0.0`** — é a única forma de
  o encaminhamento de porta alcançá-los. O loopback é garantido pela publicação
  `127.0.0.1:<porta>` no compose. Ver `docs/adr/0004-loopback-em-conteiner.md`.
- **Casar as versões de `vite` e `vitest`.** Um `vitest` que fixa major anterior
  do Vite aninha uma segunda cópia e o `tsc` reprova com dois conjuntos de tipos
  incompatíveis.
- **`from .base import *` traz a referência dos dicionários.** Alterar
  `DATABASES` ou `STORAGES` no lugar, em `prod.py`, contamina quem mais os
  segura. Monte um dicionário novo.
- O lock do front é gerado **em contêiner**:
  `docker run --rm -v "$PWD/frontend":/work -w /work node:22-bookworm-slim npm install --package-lock-only`.

## Comandos da demonstração herdada (congelada)

Os mesmos verbos sob o prefixo `demo-`: `demo-setup` (falha sem `JWT_SECRET`),
`demo-up`, `demo-down`, `demo-logs`, `demo-ps`, `demo-shell`, `demo-test`
(5 de front + 39 de API, requer Node 18+ no host), `demo-clean` (**apaga o
volume** e o banco demo).

Dev sem Docker: `npm run server` (API 3001) +
`REACT_APP_API_URL=http://localhost:3001/api npm run dev` (React 3000).

### Armadilhas do legado que ainda mordem

- `npm start` serve `build/` — sem `npm run build` antes, tudo é 404.
- O seed roda uma vez (guardado por "existe admin?"). `SEED_DEMO_DATA=0` é o
  padrão do compose — para a demonstração ter conteúdo, defina `SEED_DEMO_DATA=1`
  no `.env` antes do primeiro boot (ou `make clean` e suba de novo).
- Fora de produção o `JWT_SECRET` ausente vira segredo efêmero por processo:
  reiniciar derruba as sessões. Em produção o boot falha de propósito.
- Rota curinga em sintaxe Express 5 (`'{*path}'`) e **por último**.
- Lockfile: npm 11 do Mac × npm 10 da imagem — regenerar com
  `docker run --rm -v "$PWD":/work -w /work node:22-bookworm-slim npm install --package-lock-only`.
- O `node_modules` do host pode não validar (`npm ls`) — os testes confiáveis
  rodam no contêiner; esta é a motivação registrada do ADR-008.

## Regras para sessões nesta frente

- **Uma etapa do plano por vez**, com commit ao fim. Nada fica preso em worktree
  — a lição de 26/08 (6 commits presos num worktree travado) não se repete.
- **Funcionalidade nova nasce de um requisito.** Localize o RF/RNF no Documento
  de Requisitos e cite o ID na mensagem de commit. Decisão em aberto não se
  inventa: registre em `docs/QUESTIONS.md` e pare.
- Especificação diverge da implementação? **A implementação consciente vence e o
  spec é corrigido na mesma sessão.**
- Decisão nova com peso estrutural → ADR em `docs/adr/` (da frente) ou na vault
  (transversal), nunca só no chat.
- Pergunta sem decisão → `docs/QUESTIONS.md`; item decidido migra para
  "Decididas" com data e origem.
- **Nunca faça push para o `upstream`** (`dudyfarias/RECPSP`) — a URL de push é
  uma sentinela inválida, de propósito.
- Commits sem acento, no padrão dos existentes (`tipo(escopo): resumo`).

## Segredos

Nunca entram em arquivo versionado nem na vault. `.env` é gitignored;
`.env.example` documenta as chaves. **Nenhum `.env` foi versionado em momento
algum** (verificado sobre todo o histórico em 26/08/2026).

### Chave do YouTube exposta no histórico — pendência P1 aberta

Uma chave real do Google/YouTube Data API (formato `AIza…`) esteve no código
como fallback. Entrou em `26b1081` (14/03/2026), saiu em `757d815` (17/03/2026)
e **continua nos blobs do histórico** — aqui e no repositório de origem, público
desde março. Reescrever o histórico não resolve; **rotacionar no Google Cloud é
a única correção**. Até lá, considere-a comprometida. A importação de pílulas da
base nova (etapa 2 do plano) **não entra** antes da rotação.

Verificação após rotacionar: `git log --all --oneline -S'AIza' --reverse`.
