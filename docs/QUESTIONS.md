# Perguntas em aberto — RECPSP

> Registro versionado do que **ainda não foi decidido**. Vale a regra da PESCP:
> se algo não estiver escrito e for indispensável, registre aqui como pergunta —
> não invente resposta e não deduza da implementação atual, que em vários pontos
> é herança de protótipo, não decisão.
>
> Cada item traz o **status atual** (o que o código ou o registro dizem hoje) e a
> **pergunta** (o que precisa ser decidido, e por quem). Ao fechar um item,
> mova-o para a seção "Decididas", com data e origem da decisão.

Versão 1.0 · 26/08/2026 · origem: seção 12 do Documento de Requisitos da
Plataforma + leitura integral do código.

---

## Governança e escopo

### 1. A ferramenta é do laboratório ou do órgão central?

**Status atual:** a normatização da Rede é responsabilidade do LILP (Lina,
26/08). Na mesma reunião, Marcos Toffoli levantou o ponto: a plataforma seria
instrumento permanente do laboratório, ou solução a ser entregue ao órgão
central (SILOG) para gerir? A questão ficou sem resposta.

**Pergunta:** quem é o dono do produto em regime permanente? A resposta muda o
modelo de sustentação, quem administra a moderação e quem responde pelo conteúdo.
**Decide:** Comitê Gestor / subsecretário.

### 2. Data de lançamento

**Status atual:** o prazo de meados de julho venceu. A leitura de 03/06 é que o
conteúdo completo só volta em novembro (pós-eleição), mas que a plataforma deve
sair antes com o que não cai do ar.

**Pergunta:** qual a data pactuada, e o lançamento é único ou em duas etapas
(plataforma agora, conteúdo estadual depois)? **Decide:** Lina / Renato.

### 3. Publicação da Resolução e do Regimento

**Status atual:** a minuta de Resolução está com o Renato desde março de 2026.
O Regimento deve ser publicado em até 90 dias após a Resolução.

**Pergunta:** há previsão? O art. 10 da minuta condiciona a formalização da
participação e a publicização dos Termos ao Portal — sem a norma publicada, o
requisito RF-GOV-01 não tem base para ser construído. **Decide:** Renato / PGE.

## Decisões técnicas

### 4. Banco de produção: SQLite ou Postgres?

**Status atual:** SQLite em arquivo, num volume nomeado, mono-instância. O padrão
das demais frentes do LILP é Postgres em contêiner. Não há índices no schema e
não há mecanismo de migração.

**Pergunta:** mantém SQLite ou migra para Postgres antes da subida? A decisão
condiciona tudo que toca dados e precisa virar ADR de repositório antes de
qualquer trabalho de schema. Se ficar SQLite, é preciso decidir também como fica
a escala prevista (todas as unidades compradoras do Estado).
**Decide:** Bernardo, com a TI quanto à infraestrutura.

### 5. Interface do cadastrador

**Status atual:** decidido em 11/08 que os representantes indicados pelos órgãos
cadastram os servidores da própria unidade (nome e CPF). Discutiu-se dar acesso
ao painel administrativo genérico ou criar página própria; a tendência registrada
foi página própria, por segurança.

**Pergunta:** confirma página própria com papel novo ("cadastrador"), e o
cadastro precisa de aprovação da administração antes de virar acesso?
**Decide:** Bernardo com Laís e Eduardo.

### 6. Importação em lote de cadastros

**Status atual:** levantada em 11/08 como alternativa ao formulário unitário
(o representante sobe uma planilha com nome e CPF).

**Pergunta:** entra na v1 ou fica para a fase 2? **Decide:** Laís (é ela quem
sente o custo operacional de cadastrar órgão por órgão).

### 7. Reativar "Minha Jornada"

**Status atual:** implementada e desligada por flag
(`MINHA_JORNADA_ENABLED = false`, último commit do Eduardo em 31/07). O código
e os testes continuam no repositório. Em paralelo, decidiu-se em 27/07 remover
a barra de progresso, porque não há como medir conclusão de curso externo.

**Pergunta:** a página volta com que métrica? Se só é possível registrar
"clicou", o painel pessoal vale a pena? **Decide:** Eduardo e Laís.

## Conteúdo e nomenclatura

### 8. "Trilha" ou "agrupamento temático"?

**Status atual:** discutido em 08/07. "Trilha" já significa, nas escolas de
governo, uma sequência com certificação própria. O que a plataforma faz é
agrupar cursos de fontes diferentes por tema, sem ordem obrigatória — e há
risco de sobreposição de conteúdo entre cursos de origens distintas.

**Pergunta:** qual nome usar na interface para o agrupamento interno, e como
distingui-lo visualmente das trilhas externas que a plataforma apenas aponta?
**Decide:** Lina.

### 9. Vídeos de treinamento: Biblioteca ou capacitação da Rede?

**Status atual:** em 20/08 a Lina ficou em dúvida se material em vídeo deve ir
para o acervo da Biblioteca Digital ou para a página de capacitação da Rede.
Material em texto e apresentação vai para a Biblioteca.

**Pergunta:** qual é a regra de roteamento por tipo de material? Sem ela, o
mesmo conteúdo tende a ser cadastrado nos dois lugares. **Decide:** Lina, com
Jorge (curadoria do acervo).

### 10. Hospedagem de cursos pelo canal da UNICAMP

**Status atual:** consulta iniciada pela Lina em 03/06 — se a UNICAMP aceita
transmitir e hospedar cursos no canal dela durante o período eleitoral, quando
os canais do Estado saem do ar. Havia preocupação de que fosse interpretado
como contorno das vedações.

**Pergunta:** houve retorno da UNICAMP? Há parecer sobre as vedações da Secom?
**Decide:** Lina.

## Achados do código que exigem decisão

Estes não vieram de reunião: apareceram na leitura do `server/index.js` em
26/08/2026 e representam divergência entre o que foi decidido e o que está
implementado, ou pontas soltas do protótipo herdado.

### 11. Moderação prévia cobre todo tópico ou só tópico com mídia?

**Status atual:** o código só coloca em `pending` os tópicos **com imagem ou
vídeo** criados por usuário comum:

```js
const topicStatus = (hasMedia && !isAdminOrMod) ? 'pending' : 'approved';
```

Um tópico de texto puro é publicado direto, sem passar por curadoria. A decisão
registrada na apresentação de 26/08 (Laís) é que **todo** tópico novo passe por
aprovação, justamente pelo risco político. O Documento de Requisitos registra
isso como RF-FOR-03 e descreve o as-is como implementado — o que só vale para
tópicos com mídia.

**Pergunta:** confirma que toda criação de tópico deve entrar pendente? Se sim,
é mudança de uma linha, mas cria carga de moderação diária que precisa de dono.
Se não, qual o critério? **Decide:** Laís e Lina.

### 12. Onde mora o catálogo de capacitação?

**Status atual:** o conteúdo de capacitação está em **três lugares que não
coincidem**:

1. `src/data/capacitacaoCourses.js` e `capacitacaoEvents.js` — dado estático no front;
2. seed de 14 cursos gravados em `resources` no servidor;
3. `CAPACITACAO_COURSE_IDS` — lista fixa de 10 identificadores que valida o
   registro de progresso, e que não corresponde nem a (1) nem a (2).

Registrar progresso num curso que não esteja nessa lista devolve
"Curso inválido".

**Pergunta:** qual é a fonte de verdade? O requisito RF-CAP-02 pede catálogo
gerenciável pela administração, o que aponta para o banco — mas isso exige
migrar o conteúdo do front e unificar os identificadores.
**Decide:** Bernardo com Eduardo.

### 13. `specialist_requests`: implementar ou remover?

**Status atual:** a tabela existe com fluxo completo de solicitação
(justificativa, status, revisor, nota). Nenhuma rota a usa. A concessão de
especialista é hoje só por ato do administrador.

**Pergunta:** haverá autosserviço — o servidor pede reconhecimento como
especialista e a administração aprova — ou a designação continua sendo sempre
por convite? No segundo caso, a tabela sai do schema.
**Decide:** Lina (é decisão de governança da Rede, não técnica).

### 14. O papel `especialista` entra no modelo formal?

**Status atual:** conceder especialidade grava `role = 'especialista'`, mas esse
valor não está no conjunto aceito por `PUT /api/admin/users/:id/role`
(`user`, `moderator`, `admin`) e não concede permissão nenhuma — é só destaque
visual. O front já trata o valor.

**Pergunta:** especialista é um papel (com permissões próprias, como marcar
melhor resposta ou responder em nome da Rede) ou apenas um selo? Hoje o modelo
diz uma coisa e o código faz outra. **Decide:** Lina e Bernardo.

### 15. Categorias do fórum seguem o metaprocesso?

**Status atual:** o seed cria 11 categorias planas (Planejamento, Obras
Públicas, Contratação Direta, Sustentabilidade, Documentos, Gestão Contratual,
Licitação, Inovação, Central de Compras, Governança, Capacitação). O documento
"DESCRIÇÃO RECPSP" (31/03) e o RF-FOR-01 pedem organização pelo **metaprocesso
da contratação** — Planejamento da Contratação, Seleção do Fornecedor, Gestão de
Contratos — mais temas transversais, espelhando o Portal de Compras.

**Pergunta:** reorganizar agora, antes de haver conteúdo real? Depois do
lançamento isso vira migração de dados com tópicos já classificados.
**Decide:** Lina.

### 16. Conteúdo de demonstração sai antes da homologação?

**Status atual:** o seed cria 5 usuários fictícios e 15 tópicos com respostas,
curtidas e votos — com órgãos de outros estados (Prefeitura de São Paulo,
TCE-RJ, Ministério da Economia). Serve para desenvolvimento.

**Pergunta:** a homologação institucional sobe com esse conteúdo (útil para
testar navegação) ou com base limpa (evita confusão de quem valida)? Se limpa,
é preciso um caminho de seed separado para dev. **Decide:** Bernardo com Laís.

---

## Decididas

*(vazio — mover itens para cá com data e origem da decisão)*
