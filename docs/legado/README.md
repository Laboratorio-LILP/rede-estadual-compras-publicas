# Documentação da base legada

O protótipo Node/Express/SQLite do Eduardo, que roda como **demonstração
congelada** na porta 8003. Nenhuma funcionalidade nova entra aqui — só correção
de segurança crítica (ADR [0002](../adr/0002-reescrita-stack-e-estrangulamento.md)).

| Documento | Responde |
|---|---|
| [`arquitetura.md`](arquitetura.md) | como o protótipo está montado — Express, rotas, front sobre CRA |
| [`modelo-de-dados.md`](modelo-de-dados.md) | as 18 tabelas SQLite e o que saber antes de alterá-las |

## Por que estes documentos ainda existem

Enquanto a demonstração estiver no ar, quem for mexer nela precisa deles. Os
pares da base nova vivem em [`../specs/`](../specs/) — cada documento aponta
para o seu.

## Quando esta pasta some

No **corte único** (etapa 6 do [plano](../specs/plano-de-implementacao.md)): a
base nova assume a 8003, o código legado sai da árvore e esta pasta sai junto,
numa operação só. O histórico do Git preserva os dois.
