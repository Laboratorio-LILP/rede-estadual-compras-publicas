# Documentação da RECPSP

Porta de entrada da frente. Quem chega aqui — pessoa ou sessão do Claude Code —
lê nesta ordem:

| # | Arquivo | Responde |
|---|---|---|
| 1 | [`../CLAUDE.md`](../CLAUDE.md) | limites de segurança, armadilhas do código, divergências herdadas |
| 2 | [`ARCHITECTURE.md`](ARCHITECTURE.md) | como o sistema está montado hoje |
| 3 | [`MODELO_DE_DADOS.md`](MODELO_DE_DADOS.md) | o que existe no banco e como alterá-lo |
| 4 | [`QUESTIONS.md`](QUESTIONS.md) | o que ainda **não** foi decidido — não invente resposta |
| 5 | [`requisitos/`](requisitos/) | o que a plataforma deve fazer (46 RF + 19 RNF) |
| 6 | [`CHECKLIST-MODELO.md`](CHECKLIST-MODELO.md) | o placar vivo das pendências da frente |

O `README.md` da raiz cobre instalação e comandos; este cobre entendimento.

## Sobre `requisitos/`

O `.md` é a **fonte**: versiona junto com o código e é o que uma sessão consegue
ler. O `.docx` (identidade visual GESP) e o `.pdf` são **renderizações** da mesma
versão, para circulação institucional.

Regra para não haver duas verdades: alterou o requisito, altere o `.md`,
regenere `.docx` e `.pdf` e republique a cópia da pasta da frente no OneDrive,
que é onde a equipe lê. Nunca edite o `.docx` diretamente.

Estado em 26/08/2026: o `.md` está na v1.1 (as-is sincronizado com as rodadas
do dia); o `.docx` e o `.pdf` ainda renderizam a v1.0 — regenerar e republicar
na próxima circulação institucional.

## Manutenção

`ARCHITECTURE.md` e `MODELO_DE_DADOS.md` descrevem o código: quando o
comportamento observado divergir do que eles afirmam, **o código vence** e o
documento é corrigido na mesma sessão. Atualize-os quando mudar a estrutura
(nova seção no servidor, nova tabela, papéis, regra de visibilidade,
modularização, troca de banco), não a cada funcionalidade.

`QUESTIONS.md` cresce durante o trabalho e encolhe quando alguém decide: item
decidido migra para a seção "Decididas", com data e origem.

## O que ainda não existe

`DEPLOY.md` (passo a passo para a TI subir em homologação), `adr/` (decisões da
frente, a começar pelo banco de produção), `openapi.yaml` (contrato das 57 rotas),
`IDENTIDADE_VISUAL.md`, `ACESSIBILIDADE.md`, `LGPD.md`, `SEED_E_CONTEUDO.md`
e `specs/`. A ordem recomendada e a justificativa estão no
prompt da próxima sessão, na pasta da frente.

Os ADRs transversais do laboratório vivem na vault
(`OneDrive-PRODESP/LILP/SGGD - SEGES - LILP/ADR/`); os desta frente virão para
`docs/adr/`, no padrão da Biblioteca Digital.
