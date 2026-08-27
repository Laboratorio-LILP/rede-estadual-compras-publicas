# Documentação da RECPSP

Porta de entrada da frente. Quem chega aqui — pessoa ou sessão do Claude Code —
lê nesta ordem:

| # | Onde | Responde |
|---|---|---|
| 1 | [`../CLAUDE.md`](../CLAUDE.md) | limites de segurança, o estado da transição, as duas gerações |
| 2 | [`adr/`](adr/) | as decisões da reescrita — ler o [0002](adr/0002-reescrita-stack-e-estrangulamento.md) primeiro |
| 3 | [`specs/`](specs/) | o que construir: [arquitetura-alvo](specs/arquitetura-alvo.md), [modelo de dados](specs/modelo-de-dados.md), [design system](specs/design-system.md), [plano](specs/plano-de-implementacao.md) |
| 4 | [`QUESTIONS.md`](QUESTIONS.md) | o que ainda **não** foi decidido — não invente resposta |
| 5 | [`requisitos/`](requisitos/) | o que a plataforma deve fazer (46 RF + 19 RNF) |
| 6 | [`ARCHITECTURE.md`](ARCHITECTURE.md) · [`MODELO_DE_DADOS.md`](MODELO_DE_DADOS.md) | **a base legada** (demonstração congelada), até o corte |

## Sobre `requisitos/`

O `.md` é a fonte; `.docx` e `.pdf` são renderizações para circulação
institucional. Alterou o requisito: altere o `.md`, regenere os outros dois e
republique a cópia da pasta da frente no OneDrive. Nunca edite o `.docx` direto.
**Pendência:** a seção 7 (as-is) ficou datada com a decisão de reescrita —
v1.1 registrada no checklist.

## Manutenção

- `specs/` descrevem o **alvo**: divergência consciente na implementação
  atualiza o spec na mesma sessão.
- `ARCHITECTURE.md` e `MODELO_DE_DADOS.md` descrevem o **legado**: congelados
  junto com ele; somem da árvore no corte (etapa 6), junto com o código que
  descrevem.
- `QUESTIONS.md` cresce durante o trabalho e encolhe quando alguém decide; item
  decidido migra para "Decididas" com data e origem.
- `CHECKLIST-MODELO.md` é o placar — data em cada item fechado.

## O que ainda não existe

`DEPLOY.md` (escrever quando a esteira de homologação estiver montada — ADR-006),
`LGPD.md` (consolidar com a revisão jurídica dos Termos), `SEED_E_CONTEUDO.md`
(conteúdo editorial de lançamento) e o manual do usuário (meta 3.2). O contrato
OpenAPI deixou de ser pendência de documento: a base nova o gera automaticamente
(Django Ninja).
