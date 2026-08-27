# RECPSP — Instruções da frente para o Claude Code

Rede Estadual de Compras Públicas de São Paulo (RECPSP), Projeto 3 do Portfólio
2026 do LILP. Este arquivo é a camada de **Instruções da frente**; viaja com o
repositório.

> **Estado da frente (27/08/2026): reescrita decidida e especificada.** Este
> repositório carrega **duas gerações**: a base herdada do protótipo do Eduardo
> (Node/Express/SQLite — raiz, `server/`, `src/`), que roda como **demonstração
> congelada**, e a base nova (Django + PostgreSQL + React/Vite/TypeScript), a
> nascer em `backend/` e `frontend/` conforme
> `docs/specs/plano-de-implementacao.md`. **Nenhuma funcionalidade nova entra no
> legado** — nele, só correção de segurança crítica.

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
2. **`docs/adr/`** — as decisões da reescrita (ler o 0002 primeiro).
3. **`docs/specs/`** — arquitetura-alvo, modelo de dados, design system, plano.
4. **`docs/QUESTIONS.md`** — o que segue sem decisão. **Não invente resposta.**
5. `docs/ARCHITECTURE.md` e `docs/MODELO_DE_DADOS.md` — **a base legada**, úteis
   enquanto a demonstração existir.
6. `docs/requisitos/` — os 46 RF + 19 RNF (a seção 7, as-is, ficou datada com a
   decisão de reescrita; pendência de v1.1 registrada).

## As duas gerações

| | Legado (demonstração) | Base nova |
|---|---|---|
| Onde | raiz: `server/`, `src/`, `public/` | `backend/`, `frontend/`, `docker/` (a criar — etapa 0 do plano) |
| Stack | Express 5 + SQLite + React 19 sobre CRA | Django 5 + PostgreSQL 16 + React 19 sobre Vite/TS |
| Porta | web **8003** (compose `lilp-recpsp`) | app **8004** · Postgres **5434** · Vite **5173** (dev) |
| Regra | **congelado** — só correção de segurança crítica | todo o trabalho novo |
| Banco | SQLite descartável (só demonstração) | modelo novo, sem migração de dados |
| Fim | some da árvore no corte (etapa 6) | assume a 8003 no corte |

## Comandos do legado (enquanto a demonstração existir)

- `make setup` — 1ª vez: valida `.env` (falha sem `JWT_SECRET`), constrói e sobe.
- `make up` / `down` / `logs` / `shell` · `make test` (5 de front + 39 de API,
  requer Node 18+ no host) · `make clean` — **apaga o volume** e o banco demo.
- Dev sem Docker: `npm run server` (API 3001) + `REACT_APP_API_URL=http://localhost:3001/api npm run dev` (React 3000).
- Na etapa 0 os alvos do legado ganham o prefixo `demo-` e os verbos padrão
  (ADR-008) passam à base nova.

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
