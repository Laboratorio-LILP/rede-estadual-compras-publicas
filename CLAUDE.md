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
- **Upstream:** `github.com/dudyfarias/RECPSP` (`upstream`) — repo pessoal do Eduardo Cappia, origem deste código. Use `git fetch upstream` se ele publicar algo novo. **Nunca faça push para o upstream.**
- **Portas em dev:** React em `3000`, API em `3001` (`PORT`).
- **Homologação de testes do Eduardo:** `https://recpsp.onrender.com`, que consta fixo em `ALLOWED_ORIGINS`. Hospedagem externa, fora do padrão de implantação do LILP — ver Divergências.

## Comandos

Não há Makefile (a BDLP e a PESCP têm; esta frente ainda não). Os scripts reais da `package.json`:

| Comando | O que faz de verdade |
|---|---|
| `npm run dev` | Sobe o **React** em `localhost:3000` (react-scripts start). |
| `npm run server` | Sobe a **API** em `localhost:3001`. |
| `npm start` | Sobe a **API**, não o React. É o comando de produção. |
| `npm run build` | Gera o `build/` que o servidor serve. |
| `npm test` | Roda os testes de `src/App.test.js` (5 casos reais). |

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

## Divergências do padrão LILP (herdadas)

Estes pontos **não** seguem o que BDLP e PESCP já adotaram. Corrigi-los é trabalho de entrada da frente, não bug do Eduardo — o repo nasceu como protótipo de fórum, fora do padrão do laboratório.

| Ponto | Como está aqui | Padrão LILP |
|---|---|---|
| **Credenciais de seed** | Cria `admin` / `admin123` e 5 usuários de teste com `teste123`, em código versionado e público. | Sem credencial padrão em repositório. |
| **`JWT_SECRET`** | Tem fallback `'dev-only-secret-change-in-production'`. Só emite aviso no console; **não falha**. | Segredos por env, **sem fallback** — o stack falha claro se faltarem. |
| **CSP** | Desativada no helmet (`contentSecurityPolicy: false`). | CSP estrita (`script-src 'self'`) em produção. |
| **Origens CORS** | Lista fixa no código, incluindo um domínio `onrender.com`. | Configuração por ambiente. |
| **Hospedagem** | Versão de teste em nuvem pública externa. | VM da SGGD atrás da borda, acesso por VPN (ADR-006). |
| **Banco** | SQLite em arquivo. Não sobrevive a múltiplas instâncias nem a contêiner efêmero. | Postgres em contêiner. |
| **Empacotamento** | Sem Docker, sem Makefile. | Docker Compose + Makefile. |
| **CI** | Não existe. | GitHub Actions com lint + testes nos PRs. |
| **Paleta** | `#FF161F` em `tailwind.config.js`. | GESP **`#ED1C24`** (Pantone 485 C, fiel ao manual). |
| **Acessibilidade** | Sem auditoria. | eMAG 3.1 + WCAG 2.0 AA, auditado. |
| **Licença** | Ausente. | MIT, com arquivo `LICENSE`. |

Nada disso foi alterado na importação: o código está exatamente como o Eduardo entregou em 31/07/2026, com histórico e autoria preservados.

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
