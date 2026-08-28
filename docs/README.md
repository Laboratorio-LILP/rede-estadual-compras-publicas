# Documentação da RECPSP

Porta de entrada da frente. Quem chega aqui — pessoa ou sessão do Claude Code —
lê nesta ordem:

| # | Onde | Responde |
|---|---|---|
| 1 | [`../CLAUDE.md`](../CLAUDE.md) | limites de segurança, o estado da transição, as duas gerações |
| 2 | [`adr/`](adr/) | as decisões da reescrita — ler o [0002](adr/0002-reescrita-stack-e-estrangulamento.md) primeiro |
| 3 | [`specs/`](specs/) | o que construir: [arquitetura-alvo](specs/arquitetura-alvo.md), [modelo de dados](specs/modelo-de-dados.md), [design system](specs/design-system.md), [plano](specs/plano-de-implementacao.md); e o que já foi medido: [validação de acessibilidade](specs/validacao_a11y.md) |
| 4 | [`QUESTIONS.md`](QUESTIONS.md) | o que ainda **não** foi decidido — não invente resposta |
| 5 | [`requisitos/`](requisitos/) | o que a plataforma deve fazer (46 RF + 19 RNF) |
| 6 | [`legado/`](legado/) | **a base legada** (demonstração congelada) — arquitetura e modelo de dados, até o corte |

## Duas gerações, duas pastas

O repositório carrega duas gerações ao mesmo tempo (ver [`../CLAUDE.md`](../CLAUDE.md)),
e a documentação segue a mesma divisão. **A pasta diz de qual geração o
documento fala** — não é preciso abrir o arquivo para saber:

| Pasta | Geração | Destino |
|---|---|---|
| [`specs/`](specs/) | base nova (Django + PostgreSQL + Vite) | fica |
| [`legado/`](legado/) | protótipo congelado na 8003 | some no corte (etapa 6) |

Existem, portanto, **dois documentos de arquitetura e dois de modelo de dados**,
e isso é intencional: descrevem sistemas diferentes, os dois no ar hoje. Cada um
abre apontando para o seu par.

## Sobre `requisitos/`

O `.md` é a fonte; `.docx` e `.pdf` são renderizações para circulação
institucional. Alterou o requisito: altere o `.md`, regenere os outros dois e
republique a cópia da pasta da frente no OneDrive. Nunca edite o `.docx` direto.
**Estado:** o `.md` está na v1.1 (as-is sincronizado com as rodadas de 26/08);
`.docx` e `.pdf` ainda renderizam a v1.0. A decisão de reescrita (27/08) datou o
as-is de novo — v1.2 + regeneração pendentes, registradas no checklist.

## Manutenção

- `specs/` descrevem o **alvo**: divergência consciente na implementação
  atualiza o spec na mesma sessão.
- `legado/` descreve o **legado**: congelado junto com ele. Some da árvore no
  corte (etapa 6) — `git rm -r docs/legado/` —, junto com o código que descreve.
- **Link de documentação é contrato:** `backend/tests/test_documentacao.py`
  confere, a cada `make test`, que todo link relativo aponta para algo que
  existe. Mover um documento sem consertar quem o cita reprova a suíte.
- `QUESTIONS.md` cresce durante o trabalho e encolhe quando alguém decide; item
  decidido migra para "Decididas" com data e origem.
- `CHECKLIST-MODELO.md` é o placar — data em cada item fechado.

## O que ainda não existe

`DEPLOY.md` (escrever quando a esteira de homologação estiver montada — ADR-006),
`LGPD.md` (consolidar com a revisão jurídica dos Termos), `SEED_E_CONTEUDO.md`
(conteúdo editorial de lançamento) e o manual do usuário (meta 3.2). O contrato
OpenAPI deixou de ser pendência de documento: a base nova o gera automaticamente
(Django Ninja).
