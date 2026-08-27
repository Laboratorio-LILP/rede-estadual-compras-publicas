# Rede Estadual de Compras Públicas de São Paulo (RECPSP)

> Projeto 3 do Portfólio 2026 do **Laboratório de Inovação em Logística Pública (LILP)**,
> da Secretaria de Gestão e Governo Digital (SGGD), Governo do Estado de São Paulo.

A RECPSP é a comunidade profissional digital dos gestores de compras do Estado. A plataforma
reúne três funções: um **fórum** para discutir casos e dúvidas, um **repositório** de boas
práticas e modelos, e uma **trilha de capacitação** com cursos e calendário de eventos.

A rede foi instituída para enfrentar a dispersão das unidades compradoras paulistas. Hoje cada
órgão resolve sozinho problemas que outros já resolveram. A plataforma dá a essas unidades um
lugar comum para perguntar, responder e padronizar.

---

## Duas gerações na mesma árvore

Em 27/08/2026 foi decidida a **reescrita** da plataforma ([ADR 0002](docs/adr/0002-reescrita-stack-e-estrangulamento.md)).
Até o corte único, o repositório carrega duas bases:

| | Base nova | Demonstração herdada |
|---|---|---|
| Onde | `backend/`, `frontend/`, `docker/` | raiz: `server/`, `src/`, `public/` |
| Stack | Django 5 + PostgreSQL 16 + React/Vite/TS | Express 5 + SQLite + React sobre CRA |
| Portas (loopback) | app **8004** · Postgres **5434** · Vite **5173** | web **8003** |
| Comandos | `make up`, `make test`, `make lint`… | os mesmos sob o prefixo `demo-` |
| Regra | todo o trabalho novo | **congelada** — só correção de segurança crítica |

Rode `make help` para a lista completa dos dois conjuntos.

## Comece por aqui — base nova

Pré-requisito único: **Docker + Docker Compose v2**. Não é preciso Python, Node,
PostgreSQL nem nada mais na máquina: toda ferramenta roda dentro do contêiner
([ADR-008](docs/adr/README.md) transversal).

```bash
git clone git@github.com:Laboratorio-LILP/rede-estadual-compras-publicas.git
cd rede-estadual-compras-publicas
cp .env.example .env
openssl rand -hex 32      # use o resultado como RECPSP_DB_PASSWORD no .env
make setup                # constrói as imagens e sobe os três serviços
```

- Front (Vite, com recarregamento automático): <http://127.0.0.1:5173>
- Aplicação Django e API: <http://127.0.0.1:8004>
- Saúde do serviço: <http://127.0.0.1:8004/api/v1/saude>
- Contrato OpenAPI: <http://127.0.0.1:8004/api/v1/openapi.json>

Confira tudo de uma vez com `make saude`. Sem `RECPSP_DB_PASSWORD` no `.env` o
compose se recusa a subir — é proposital, no padrão de segredos da frente.

## Comece por aqui — demonstração herdada

```bash
cp .env.example .env      # defina JWT_SECRET (gere com: openssl rand -hex 32)
make demo-setup           # constrói a imagem e sobe o stack lilp-recpsp
```

Abra <http://localhost:8003>. O banco não precisa de instalação: o SQLite é criado no
primeiro boot, dentro do volume `lilp-recpsp_dbdata`, já com categorias, tags e conteúdo
de exemplo. Sem `JWT_SECRET` no `.env`, o compose se recusa a subir — é proposital.

## Dev local sem Docker (só a demonstração herdada)

Para mexer no front com hot reload você precisa de **Node.js 18 ou superior**.

```bash
npm install
cp .env.example .env      # se ainda não existir
```

### Rodar em desenvolvimento

Você precisa de **dois terminais**. O front e a API são processos separados em dev.

```bash
# terminal 1 — API na porta 3001
npm run server

# terminal 2 — React na porta 3000
REACT_APP_API_URL=http://localhost:3001/api npm run dev
```

Abra <http://localhost:3000>.

A variável `REACT_APP_API_URL` é obrigatória. Sem ela, o front procura a API na própria porta
3000 e todas as chamadas falham.

### Rodar como em produção (sem Docker)

Em produção existe um processo só. O servidor Express entrega a API e o site — é
exatamente o que o container faz.

```bash
npm run build
npm start                 # sobe tudo na porta 3001
```

---

## Comandos

### Base nova (tudo dentro do contêiner)

| Comando | O que faz |
|---|---|
| `make setup` | 1ª vez: valida o `.env`, constrói as imagens e sobe os três serviços. |
| `make up` / `make down` | Sobe / derruba o stack. O banco fica no volume. |
| `make build` | Reconstrói as imagens e **renova as dependências do front**. |
| `make test` | pytest e Vitest, de dentro do contêiner. |
| `make lint` | ruff, mypy, tsc, ESLint e o guardião de tokens. |
| `make format` | Formata o back (ruff). |
| `make a11y-check` | Piso de acessibilidade do ADR-007 (entra na etapa 1). |
| `make saude` | Confere a API, a CSP da página raiz e o repasse `/api` do Vite. |
| `make migrate` / `make makemigrations` | Migrações do Django. |
| `make logs` / `make ps` / `make shell` / `make shell-front` | Diagnóstico. |
| `make auditoria` | Auditoria de dependências (pip-audit e npm audit). |
| `make imagem` | Constrói a imagem de produção do back. |
| `make ci` | O mesmo laço que a esteira roda. |
| `make clean` | Derruba e **apaga os volumes** — o banco de desenvolvimento é perdido. |

### Demonstração herdada

Os mesmos verbos sob o prefixo `demo-`: `demo-setup`, `demo-up`, `demo-down`,
`demo-logs`, `demo-ps`, `demo-shell`, `demo-test`, `demo-clean`.

### npm (dev da demonstração, sem Docker)

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe o React em `localhost:3000`. |
| `npm run server` | Sobe a API em `localhost:3001`. |
| `npm start` | Sobe a API e serve o `build/`. **Não sobe o React.** |
| `npm run build` | Gera o `build/` de produção. |
| `npm test` | Roda os testes do front. |
| `npm run test:api` | Roda os testes de API (banco temporário, não toca `server/forum.db`). |
| `npm run lint` | ESLint em `src/` e `server/`. |

---

## Primeiro acesso

O seed cria um administrador e cinco usuários de exemplo. **O login é pelo e-mail**, não
pelo nome de usuário:

| E-mail | Senha | Papel |
|---|---|---|
| `admin@forum.com` | `admin123` | Administrador |
| `maria@teste.com`, `joao@teste.com`, `ana@teste.com`, `carlos@teste.com`, `fernanda@teste.com` | `teste123` | Usuário comum |

> **Essa tabela só vale fora de produção.** Com `NODE_ENV=production` o comportamento muda
> por construção: o admin nasce com a senha de `ADMIN_PASSWORD` ou, sem ela, com uma senha
> sorteada que aparece **uma única vez** no log do boot (`make logs`) — anote na hora. Os
> cinco usuários de exemplo não são criados; para semeá-los deliberadamente, use
> `SEED_DEMO_DATA=1`.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Front | React 19 + React Router 7 |
| Estado do servidor | TanStack Query 5 |
| Build | Create React App 5 com CRACO |
| CSS | Tailwind 3 (`@tailwindcss/postcss`) |
| API | Express 5 |
| Banco | SQLite (`better-sqlite3`) |
| Autenticação | JWT (`jsonwebtoken`) + `bcryptjs` |
| Segurança HTTP | `helmet`, `cors`, `express-rate-limit` |
| Testes | Jest + Testing Library (front) · `node:test` (API) |
| CI | GitHub Actions — lint, testes e build em PR e na `main` |
| Empacotamento | Docker Compose (`lilp-recpsp`) + Makefile |

---

## Estrutura do projeto

### Base nova

```
rede-estadual-compras-publicas/
├── backend/
│   ├── config/
│   │   ├── settings/     # base · dev (segredo efêmero) · prod (fail-loud)
│   │   ├── api.py        # Django Ninja em /api/v1 (contrato OpenAPI gerado)
│   │   └── urls.py       # API → admin sob caminho próprio → página raiz
│   ├── apps/             # contas · taxonomia · forum · capacitacao ·
│   │                     # mensagens · portal · indicadores (uma por domínio)
│   ├── tests/            # saúde, CSP da página raiz, segredos, subcaminho
│   ├── pyproject.toml    # ruff, mypy (estrito) e pytest
│   └── requirements*.txt
├── frontend/
│   ├── src/
│   │   ├── estilos/tokens.css   # FONTE ÚNICA de cor (ADR-007)
│   │   ├── api/cliente.ts       # cliente HTTP único (sessão por cookie)
│   │   ├── configuracao.ts      # base e prefixo da API, por ambiente
│   │   └── App.tsx
│   ├── scripts/          # guardião: nenhum hexadecimal fora dos tokens
│   ├── vite.config.ts
│   └── eslint.config.js
├── docker/
│   ├── docker-compose.dev.yml   # app 8004 · Postgres 5434 · Vite 5173
│   ├── backend/Dockerfile       # alvos dev e prod
│   └── frontend/Dockerfile
├── .devcontainer/        # atalho de editor; nada existe só aqui (ADR-008)
├── .pre-commit-config.yaml
└── Makefile              # porta de entrada canônica das duas gerações
```

### Demonstração herdada

```
rede-estadual-compras-publicas/
├── server/
│   ├── index.js          # API + schema + seed + entrega do build (arquivo único)
│   └── test/             # testes de API (node:test) — banco temporário por execução
├── src/
│   ├── pages/            # Home, Portal, Categories, Topic, NewTopic, Capacitacao,
│   │                     # CalendarioEventos, MinhaJornada, Messages, UserProfile,
│   │                     # Admin, Login, Register, Terms
│   ├── components/       # Navbar, Footer, Breadcrumbs, RichTextEditor,
│   │                     # FormattedContent, CategoryBadge, ForumNoticeModal, ScrollToTop
│   ├── context/          # AuthContext — sessão e token
│   ├── config/           # features.js — flags de funcionalidade
│   ├── data/             # catálogo de cursos e calendário de eventos
│   ├── utils/            # formatadores
│   ├── api.js            # cliente HTTP único
│   └── App.test.js       # testes
├── public/               # brasão, logotipos e assinaturas do Governo de SP
├── .github/workflows/    # ci-legado.yml — só quando o código herdado muda
├── craco.config.js
├── tailwind.config.js    # paleta gov.* e tipografia
├── Dockerfile            # dois estágios: build do front + runtime enxuto
├── docker-compose.yml    # stack lilp-recpsp — web em loopback 8003, volume do banco
├── .env.example          # as duas gerações, em seções separadas
├── CLAUDE.md             # instruções da frente para o Claude Code
└── docs/                 # ADRs, specs, requisitos e checklist da frente
```

---

## Como o sistema é organizado

O `server/index.js` concentra tudo: schema, seed, regras de negócio e rotas. São 57 rotas sob
`/api`, agrupadas assim:

| Grupo | Rotas | Para quê |
|---|---|---|
| `auth` | 11 | Cadastro, login, perfil, categorias de interesse, progresso de curso, aceite de termos. |
| `admin` | 13 | Aprovar e rejeitar tópicos, gerir papéis, banir, definir especialidades, importar playlists. |
| `topics` | 11 | Criar, listar, editar e votar em tópicos e enquetes. |
| `posts` | 6 | Respostas, curtidas e descurtidas. |
| `categories` | 5 | As 11 categorias temáticas da rede. |
| `messages` | 3 | Mensagens diretas entre membros. |
| `tags`, `notifications`, `users`, `search`, `resources`, `health` | 8 | Apoio. |

Depois dessas vem uma rota curinga, que devolve o `index.html` para qualquer outro caminho.
É ela que faz o roteamento do React funcionar.

O banco tem 18 tabelas. Os papéis são `admin`, `moderator` e `user`. Além do papel, um membro
pode ser marcado como especialista em categorias específicas.

**Tópico com imagem ou vídeo entra pendente** e só aparece depois que a moderação aprova.
Tópico só de texto publica direto — a decisão de levar **todo** tópico à curadoria prévia está
em aberto (`docs/QUESTIONS.md`, pergunta 11).

---

## Testes

### Base nova

```bash
make test     # pytest e Vitest, de dentro do contêiner
make lint     # ruff, mypy, tsc, ESLint e o guardião de tokens
```

Nada roda no host — é a garantia do [ADR-008](docs/adr/README.md): o mesmo laço
de verificação na máquina, na sessão de agente e na esteira.

- **Back (pytest)** — saúde e contrato OpenAPI; a página raiz com CSP estrita e
  os demais cabeçalhos de segurança; **segredo ausente derruba o boot em
  produção** (a regra é verificada, não declarada); o prefixo de subcaminho vem
  do ambiente em qualquer grafia.
- **Front (Vitest)** — a página raiz tem um único `<h1>`, os landmarks e o skip
  link; nenhum valor de cor chega ao componente; a montagem do prefixo da API.

A esteira (`.github/workflows/ci.yml`) roda `make lint`, `make test`,
`make build-app`, `make a11y-check`, a auditoria de dependências e a construção
da imagem de produção.

### Demonstração herdada

```bash
make demo-test
```

Duas suítes (o `make demo-test` roda as duas; em separado, `npm test` e `npm run test:api`):

- **Front (`npm test`)** — cinco testes de interface: texto dos Termos de Uso, aceite do
  comunicado no primeiro acesso, calendário de eventos, retorno ao topo e progresso da trilha.
- **API (`npm run test:api`)** — testes com o `node:test` embutido do Node, sem dependência
  nova: autenticação e banimento, visibilidade e moderação (visitante × usuário × moderador
  contra `pending`, `rejected` e `locked`), exclusão em cascata (tópico, resposta, usuário) e
  autorização das rotas administrativas. Cada arquivo roda num banco SQLite temporário
  (`DB_PATH`) e nunca toca `server/forum.db` nem o volume do Docker.

A esteira do legado (`.github/workflows/ci-legado.yml`) roda lint, as duas suítes e o
build — **só quando `server/`, `src/` ou `public/` mudam**, já que a base está congelada.

---

## Configuração

O `.env.example` documenta todas as chaves:

| Variável | Para quê | Obrigatória |
|---|---|---|
| `PORT` | Porta da API em dev sem Docker. Padrão `3001`. | Não |
| `JWT_SECRET` | Assina os tokens de sessão. | **Sim — no Docker o compose não sobe sem ela** |
| `DB_PATH` | Caminho do SQLite em dev. No Docker o compose já define `/data/forum.db`. | Não |
| `YOUTUBE_API_KEY` | Importa playlists de capacitação. | Só para essa função |
| `RECPSP_PORT` | Porta no host para o Docker (loopback). Padrão `8003`. | Não |
| `ALLOWED_ORIGINS` | Origens aceitas pelo CORS, separadas por vírgula. Se mudar `RECPSP_PORT`, ajuste aqui também. | Só no Docker |

O `JWT_SECRET` não tem mais valor fixo no código. O comportamento depende do ambiente:

- **Com `NODE_ENV=production` e sem a variável, o servidor não sobe** — imprime o erro e
  encerra. Vale dentro e fora do Docker; no compose a interpolação `${JWT_SECRET:?…}` já
  barra antes disso.
- **Fora de produção**, gera um segredo aleatório por processo. Ninguém precisa configurar
  nada para rodar local, e o repositório não publica nenhuma constante que sirva para
  forjar token. Em troca, reiniciar o servidor derruba as sessões abertas.

O arquivo `.env` nunca entra no Git. O banco também não — em dev ele vive em
`server/forum.db`; no Docker, em `/data/forum.db`, dentro do volume `lilp-recpsp_dbdata`.
Os dois ambientes não compartilham dados.

---

## Origem do código

Este repositório continua o trabalho de **Eduardo Farias Cappia**, entregue em 31/07/2026 no
repositório pessoal `dudyfarias/RECPSP`. O histórico foi preservado integralmente, com os 85
commits originais e sua autoria.

O repositório de origem permanece configurado como `upstream`:

```bash
git remote -v
# origin    git@github.com:Laboratorio-LILP/rede-estadual-compras-publicas.git
# upstream  https://github.com/dudyfarias/RECPSP.git
```

---

## Estado e próximos passos

**Em 27/08/2026 foi decidida a reescrita da plataforma** (Django + PostgreSQL no
back, React + Vite + TypeScript no front), preservando o conceito e o layout do
protótipo. As decisões estão em [`docs/adr/`](docs/adr/) — comece pelo
[0002](docs/adr/0002-reescrita-stack-e-estrangulamento.md) — e a especificação em
[`docs/specs/`](docs/specs/).

**A etapa 0 do [plano de implementação](docs/specs/plano-de-implementacao.md)
está concluída**: a fundação da base nova está de pé em `backend/`, `frontend/` e
`docker/`, com o laço de verificação inteiro rodando dentro do contêiner. A
próxima é a **etapa 1** — design system e taxonomia.

A base herdada continua no ar como demonstração congelada (porta 8003) até o
corte único: as instruções e os comandos `demo-*` seguem valendo para ela, e
nenhuma funcionalidade nova entra nela.

Permanece a **pendência de segurança herdada**: uma chave de API exposta no
histórico Git, a rotacionar no Google Cloud. Detalhes na seção *Segredos* do
[`CLAUDE.md`](CLAUDE.md).

---

## Licença

MIT — ver o arquivo [`LICENSE`](LICENSE). O titular do copyright ainda precisa de
confirmação da coordenação.
