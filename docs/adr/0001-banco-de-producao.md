# ADR 0001 — Banco de produção: PostgreSQL

- **Status:** Aceito (2026-08-27).
- **Família:** ADR de repositório da RECPSP. Não se confunde com os transversais do laboratório (`ADR-NNN`, na vault) — ver a convenção no `ADR/README.md` da vault.
- **Contexto:** a base herdada usa SQLite em arquivo, mono-instância, num volume nomeado. Não há mecanismo de migração: o schema nasce por `CREATE TABLE IF NOT EXISTS` no boot e as colunas novas entram por `ALTER TABLE` avulsos dentro de `try/catch` vazio, que engole erro real junto com o esperado. Não há um único `CREATE INDEX`. As chaves estrangeiras foram declaradas sem `ON DELETE`, o que obriga cada rota de exclusão a limpar as tabelas filhas à mão — foi daí que nasceu o defeito corrigido em 26/08. O padrão das demais frentes é PostgreSQL em contêiner. A escala prevista é o conjunto das unidades compradoras do Estado (RNF-ESC-01). O banco atual contém **apenas dado falso de demonstração** e é descartável.

## Decisão

- **PostgreSQL**, em contêiner, no padrão da BDLP.
- **Migrações versionadas** pelo Django: toda alteração de schema vira arquivo versionado, aplicado em ordem e reversível.
- **Índices desde o schema inicial**, não como otimização posterior. Mínimo: as colunas usadas em filtro e ordenação das listagens.
- **Chaves estrangeiras com `ON DELETE CASCADE`** onde a dependência é de composição (resposta em tópico, curtida em resposta, opção de enquete). Onde não for, `RESTRICT` explícito. As rotinas manuais de limpeza deixam de existir.
- **Sem migração de dados.** O SQLite herdado é descartado junto com o protótipo. Não há porte do SQL inline do back atual para o dialeto do PostgreSQL.
- **Porta 5434 em loopback**, conforme o mapa do ADR-004 transversal (atualização de 27/08).

## Consequências

- Fecha o RNF-ESC-01 e destrava mais de uma instância da aplicação.
- Três dívidas registradas no `CHECKLIST-MODELO.md` — migrações, índices e cascata — deixam de ser disciplina e passam a ser propriedade da ferramenta.
- O laboratório passa a ter duas frentes no mesmo banco, o que simplifica operação e o pedido de infraestrutura à TI (RNF-HOSP-01 prevê servidor único com divisão lógica).
- Custo: PostgreSQL vira dependência de desenvolvimento. Resolvido pelo ADR-008 transversal — o banco sobe em contêiner, ninguém instala nada.
- O `docs/legado/modelo-de-dados.md` descreve as 18 tabelas do SQLite e fica obsoleto com esta decisão. Substituição prevista na especificação do modelo novo.
