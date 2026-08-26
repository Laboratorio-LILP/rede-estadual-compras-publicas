# RECPSP — Integração da frente para o Claude Code

Rede Estadual de Compras Públicas de São Paulo (RECPSP), Projeto 3 do Portfólio 2026 do LILP. Este arquivo é a camada de **Instruções da frente** para o Claude Code; viaja com o repositório.

**Leia a seção "Divergências do padrão LILP" antes de mexer no código.** Este repo veio de fora do laboratório e ainda não passou pelo endurecimento que a BDLP e a PESCP já sofreram.

> **Pendência de segurança aberta.** Há uma chave real do YouTube Data API no histórico Git, herdada do repositório de origem. Ela precisa ser rotacionada no Google Cloud. Ver a seção **Segredos**, no fim deste arquivo.

## Limites de segurança — inegociáveis

Valem integralmente os limites do `LILP/CLAUDE.md` transversal e do ADR-006 da vault (reunião
CTI de 30/06/2026): **sem túneis** ou mecanismos de exposição externa, **sem alterações de
firewall**, **sem PowerShell** em host corporativo, **sem acesso a servidores** — acesso
restrito a TI/PRODESP; a **VPN é a via única** de acesso remoto. Vedado usar IA para contornar
barreiras de segurança. Se algo estiver inacessível, a resposta correta é **parar e registrar
solicitação à equipe de TI** (Felipe/Diego).

## Rito de sessão

O rito transversal vive em `LILP/CLAUDE.md` na árvore OneDrive. **Este clone fica FORA do OneDrive** (ADR-002), onde o arquivo transversal não é ancestral — leia o rito e o estado direto na vault:

- Vault (Mac): `~/Library/CloudStorage/OneDrive-PRODESP/LILP/SGGD - SEGES - LILP/`
- Rito + teoria: `…/Padrões/Arquitetura de Contexto.md` (+ `LILP/CLAUDE.md`)
- Estado vivo do laboratório: `…/Mapa de Contexto Operacional.md`
- Estado desta frente: seção RECPSP de `…/Portfólio/Portfólio.md` (mapa-semente próprio ainda não existe — pendência, igual à PESCP).

Vault atualizada em 26/08/2026: o `Portfólio.md` registra este repositório como o oficial da frente, e o ADR-002 ganhou entrada sobre o caminho canônico dos clones e sobre esta importação.

## O que é

Fórum e portal de capacitação da rede de compradores públicos do Estado. **Monólito Node**: uma única `package.json` cobre front e back.

- **Front** — React 19 + React Router 7 + TanStack Query 5, sobre Create React App 5 com CRACO. Tailwind 3 via `@tailwindcss/postcss`.
- **Back** — Express 5 + **SQLite** (`better-sqlite3`), autenticação por JWT (`jsonwebtoken` + `bcryptjs`), `helmet`, `cors` e `express-rate-limit`.
- **Servidor único** — `server/index.js` (≈1.900 linhas) expõe a API em `/api` **e** serve o build do React. Não há processo separado em produção.

Domínio: 18 tabelas (`users`, `topics`, `posts`, `categories`, `tags`, `messages`, `notifications`, `resources`, enquetes, curtidas, progresso de curso, especialidades). 57 rotas sob `/api`, mais a rota curinga do SPA. Papéis: `admin`, `moderator`, `user`, mais especialidade por categoria (`user_specialties`).

Funcionalidades ativas: fórum com moderação prévia (tópico entra pendente e um admin aprova), mensagens diretas, notificações, enquetes, trilha de capacitação com importação de playlists do YouTube, calendário de eventos, aceite de termos no primeiro acesso.

## Onde isto roda

- **Clone canônico:** `~/Developer/Governo/rede-estadual-compras-publicas` (fora do OneDrive, ADR-002).
- **Remoto:** `github.com/Laboratorio-LILP/rede-estadual-compras-publicas` (`origin`).
- **Upstream:** `github.com/dudyfarias/RECPSP` (`upstream`) — repo pessoal do Eduardo Cappia, origem deste código. Use `git fetch upstream` se ele publicar algo novo. **Nunca faça push para o upstream** — a URL de push do remote foi trocada por uma sentinela inválida, então o push falha por construção.
- **Docker (via canônica):** compose **`lilp-recpsp`**, um serviço (`web`), em **loopback** `127.0.0.1:8003` (`RECPSP_PORT`) — coexiste com a BDLP (8000/8080/5432) e a PESCP (8002/5433). Banco no volume nomeado `lilp-recpsp_dbdata`.
- **Dev sem Docker:** React em `3000`, API em `3001` (`PORT`).
- **Homologação de testes do Eduardo:** `https://recpsp.onrender.com`, presente na lista padrão de `ALLOWED_ORIGINS`. Hospedagem externa, fora do padrão de implantação do LILP — ver Divergências.

## Comandos

Makefile no padrão das outras frentes (Docker é a via canônica desde 26/08/2026):

- `make setup` — 1ª vez: valida o `.env` (falha claro sem `JWT_SECRET`), constrói a imagem e sobe.
- `make up` / `down` / `restart` / `logs` / `ps` / `shell`.
- `make test` — testes do front **e da API** no host (requer Node 18+).
- `make clean` — derruba e **APAGA o volume**: o banco do fórum inteiro se perde.

Para mexer no front com hot reload, dev sem Docker — os scripts reais da `package.json`:

| Comando | O que faz de verdade |
|---|---|
| `npm run dev` | Sobe o **React** em `localhost:3000` (react-scripts start). |
| `npm run server` | Sobe a **API** em `localhost:3001`. |
| `npm start` | Sobe a **API**, não o React. É o comando de produção. |
| `npm run build` | Gera o `build/` que o servidor serve. |
| `npm test` | Roda os testes de `src/App.test.js` (5 casos reais). |
| `npm run test:api` | Testes de API (`node:test`, `server/test/`) em banco temporário — não toca `server/forum.db`. |
| `npm run lint` | ESLint (do react-scripts) em `src/` e `server/`. |

**Em dev você precisa dos dois processos**, em terminais separados:

```bash
npm run server                                   # terminal 1 — API na 3001
REACT_APP_API_URL=http://localhost:3001/api npm run dev   # terminal 2 — React na 3000
```

A variável é obrigatória: não existe campo `proxy` na `package.json`, e `src/api.js` cai no default `/api`, que em dev bate na 3000 e falha.

## Gotchas (não tropece)

- **`npm start` não sobe o React.** Sobe o servidor, que serve `build/`. Sem `npm run build` antes, todas as rotas devolvem 404 no `sendFile`.
- **O seed só roda uma vez.** Ele é guardado por `SELECT id FROM users WHERE role = 'admin'`. Se já existe admin, o bloco inteiro é pulado — mudar categorias ou tags no código **não** altera um banco já semeado. Para reprocessar: apague `server/forum.db` e suba de novo.
- **`server/forum.db` é gitignored** (junto com `-shm` e `-wal`). É artefato de runtime, recriado pelo seed. Apagar o arquivo apaga o fórum inteiro.
- **Rota curinga em sintaxe Express 5.** `app.get('{*path}', …)` — o `'*'` do Express 4 não funciona aqui. Ao mexer no roteamento, mantenha a sintaxe nova.
- **A rota curinga é a última.** Qualquer rota nova precisa ser registrada **antes** dela, senão o React engole a chamada.
- **`express.json({ limit: '5mb' })`** — o editor de texto rico manda HTML no corpo; uploads maiores estouram com 413.
- **Rate limit só na autenticação:** 20 tentativas por IP a cada 15 minutos. O resto da API não tem limite.
- **Sem migrations.** O schema é criado por `CREATE TABLE IF NOT EXISTS` no boot. Alterar uma coluna existente exige script manual — o `IF NOT EXISTS` não atualiza tabela que já existe.
- **O volume `lilp-recpsp_dbdata` persiste por nome de projeto**, não por pasta — base limpa exige `make clean` (ou `docker volume rm lilp-recpsp_dbdata`). No volume vazio o seed roda de novo, mas **não** recria `admin123`: o compose define `NODE_ENV=production`, então o admin nasce com `ADMIN_PASSWORD` ou com uma senha sorteada que aparece **uma única vez** no log do boot (`make logs`). Os usuários de exemplo não são criados.
- **No container o banco fica em `/data/forum.db`** (`DB_PATH` do compose); em dev sem Docker, em `server/forum.db`. Os dois ambientes não compartilham dados.
- **Dependência nova entra na seção certa.** O runtime da imagem instala só as `dependencies` (os 7 pacotes do servidor); todo o front (React, react-scripts, Tailwind) vive em `devDependencies` e só existe no estágio de build. Servidor → `dependencies`; front → `devDependencies`.
- **Os testes de API não tocam o banco de dev.** `npm run test:api` roda cada arquivo de `server/test/` em processo próprio, com `DB_PATH` temporário e `SKIP_PLAYLIST_IMPORT=1`. O limitador de autenticação (20 tentativas/IP/15min) vale nos testes — economize logins; `server/test/helpers.js` faz cache de token por e-mail.
- **Lock dessincronizado com o `npm ci` do build:** o npm local (v11 + wrapper allow-scripts) pode gravar um lock que o npm 10 do `node:22` rejeita (aconteceu em 26/08 — dedupe inválido de `yaml` herdado do lock original). Regenere com o npm do container: `docker run --rm -v "$PWD":/work -w /work node:22-bookworm-slim npm install --package-lock-only`.

## Divergências do padrão LILP (herdadas)

Estes pontos **não** seguem o que BDLP e PESCP já adotaram. Corrigi-los é trabalho de entrada da frente, não bug do Eduardo — o repo nasceu como protótipo de fórum, fora do padrão do laboratório.

| Ponto | Como está aqui | Padrão LILP |
|---|---|---|
| **Credenciais de seed** | **Resolvida em 26/08:** em produção o admin nasce com senha de `ADMIN_PASSWORD` ou sorteada e impressa uma única vez no log; os dados de demonstração só entram com `SEED_DEMO_DATA=1`. Fora de produção o padrão `admin123` segue, por conveniência de dev. | Sem credencial padrão em repositório. |
| **`JWT_SECRET`** | **Resolvida em 26/08:** com `NODE_ENV=production` o servidor recusa subir sem a variável; fora de produção gera segredo aleatório por processo. O fallback fixo saiu do código. | Segredos por env, **sem fallback** — o stack falha claro se faltarem. |
| **CSP** | **Resolvida em 26/08:** CSP estrita com `script-src 'self'` (o build desliga o runtime chunk inline via `INLINE_RUNTIME_CHUNK=false`). `style-src` ainda precisa de `'unsafe-inline'` pelo atributo `style` do React, e libera `fonts.googleapis.com`. | CSP estrita (`script-src 'self'`) em produção. |
| **Origens CORS** | **Resolvida em 26/08:** `ALLOWED_ORIGINS` por env; sem a variável, vale a lista original (que inclui `onrender.com`). | Configuração por ambiente. |
| **Hospedagem** | Versão de teste em nuvem pública externa. | VM da SGGD atrás da borda, acesso por VPN (ADR-006). |
| **Banco** | SQLite em arquivo — desde 26/08 num volume nomeado (sobrevive a rebuild), mas segue mono-instância. | Postgres em contêiner. |
| **Empacotamento** | **Resolvida em 26/08:** compose `lilp-recpsp` + Makefile, loopback 8003, imagem em dois estágios. | Docker Compose + Makefile. |
| **CI** | **Resolvida em 26/08:** `.github/workflows/ci.yml` roda `npm ci`, lint, testes (front + API) e build, em PR e na `main`. | GitHub Actions com lint + testes nos PRs. |
| **Paleta** | **Resolvida em 26/08:** `#ED1C24` no `tailwind.config.js` e nos 38 literais espalhados pelo `src/`. | GESP **`#ED1C24`** (Pantone 485 C, fiel ao manual). |
| **Acessibilidade** | Sem auditoria. | eMAG 3.1 + WCAG 2.0 AA, auditado. |
| **Licença** | **Resolvida em 26/08:** arquivo `LICENSE` (MIT). Confirmar o titular do copyright com a coordenação. | MIT, com arquivo `LICENSE`. |

Na importação nada foi alterado — o código chegou exatamente como o Eduardo entregou em 31/07/2026, com histórico e autoria preservados. Em 26/08/2026, três rodadas mexeram nesta tabela: a containerização fechou Empacotamento, Origens CORS e o `JWT_SECRET` na via canônica; o laço de verificação fechou CI; e a rodada de dívida técnica fechou Credenciais de seed, `JWT_SECRET` no código, CSP, Paleta e Licença. Seguem abertas: **Hospedagem, Banco e Acessibilidade**. O placar vivo da frente é `docs/CHECKLIST-MODELO.md`.

## Comportamentos que mudaram na rodada de dívida técnica (26/08/2026)

Correções verificadas contra o servidor real. Quem for mexer no código precisa saber:

- **Exclusão é atômica.** `DELETE` de tópico, post e categoria roda dentro de `db.transaction()`, com a ordem de cascata centralizada em `apagarTopicoEmCascata` / `apagarPostEmCascata`. Antes a sequência solta violava a FK de `post_likes` no meio e deixava o tópico vivo, já sem tags nem curtidas.
- **Excluir conta anonimiza, não apaga.** Tópicos e posts são reatribuídos à conta sentinela `usuario-removido@recpsp.invalid` (banida, senha aleatória, não registrável); mensagens, notificações, interesses e reações do usuário são eliminados. Antes a exclusão levava junto as respostas de terceiros.
- **Excluir tema em uso devolve 409**, não 500.
- **Rota de API inexistente devolve 404 em JSON.** Antes caía na curinga do SPA e o cliente estourava no `res.json()`.
- **O handler de erro global é o último `app.use`.** Registrá-lo antes do `express.static` faz o Express ignorá-lo para falhas de arquivo estático.
- **A chave do YouTube viaja no cabeçalho `X-goog-api-key`**, nunca na query string, e nenhuma mensagem crua do Google chega ao cliente. Sem a chave, a importação fica desligada e responde 503.
- **`trust proxy` é configurável (`TRUST_PROXY`, padrão `loopback`).** Sem isso, atrás de proxy o rate limit de login conta todos os usuários como um IP só.
- **`PUT /api/auth/profile` valida como o cadastro.** Antes aceitava e-mail sem formato válido e descartava senha curta em silêncio, respondendo 200.

## Flags de funcionalidade

`src/config/features.js` guarda os recursos desligados sem remover a implementação:

- `MINHA_JORNADA_ENABLED = false` — desligado no último commit do Eduardo (`11105e2`, 31/07/2026). A página `MinhaJornada.js` e o cálculo `calculateJourneyStats` continuam no código e sob teste. Reativar é trocar uma linha.

## Front

Identidade do Governo de SP (brasão e assinaturas em `public/`). Tipografia Verdana com Montserrat para títulos. Paleta `gov.*` no `tailwind.config.js`. Escrita em Linguagem Simples.

## Segredos

Nunca entram em arquivo versionado nem na vault. `.env` é gitignored; `.env.example` documenta as chaves (`PORT`, `JWT_SECRET`, `DB_PATH`, `YOUTUBE_API_KEY`).

**Nenhum arquivo `.env` foi versionado em momento algum** — só o `.env.example`. Verificado em 26/08/2026 sobre todo o histórico.

### Chave do YouTube exposta no histórico — pendência aberta

Uma **chave real do Google/YouTube Data API** (formato `AIza…`) esteve embutida no código como fallback do `YOUTUBE_API_KEY`. Ela entrou em `26b1081` (14/03/2026) e saiu do código em `757d815` (17/03/2026), mas **continua acessível nos blobs do histórico Git**.

Situação: a chave está pública desde 14/03/2026 no repositório de origem `dudyfarias/RECPSP`, e desde 26/08/2026 também aqui, porque a importação preservou o histórico completo.

**Rotacionar a chave no Google Cloud é a única correção que funciona.** Reescrever o histórico não resolve: a chave já circulou publicamente por meses e continua no repo do Eduardo. Enquanto não for rotacionada, considere-a comprometida.

Verificação:

```bash
git log --all --oneline -S'AIza' --reverse   # deve voltar vazio após rotação + limpeza do histórico
```
