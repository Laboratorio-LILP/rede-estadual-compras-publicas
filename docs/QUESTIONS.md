# Perguntas em aberto — RECPSP

> Registro versionado do que **ainda não foi decidido**. Se algo não estiver
> escrito e for indispensável, registre aqui como pergunta — não invente resposta
> e não deduza da implementação, que em vários pontos é herança de protótipo.
> Item decidido migra para "Decididas", com data e origem.

Versão 2.0 · 27/08/2026 · v1.0 em 26/08/2026. A sessão de 27/08 decidiu oito
itens (ver "Decididas") e abriu três novos (17–19).

---

## Governança e escopo

### 1. A ferramenta é do laboratório ou do órgão central?

**Status atual:** a normatização da Rede é responsabilidade do LILP (Lina,
26/08). Na mesma reunião, Marcos Toffoli levantou: a plataforma é instrumento
permanente do laboratório, ou solução a entregar ao órgão central (SILOG)?
Sem resposta. A escolha de stack alinhada à BDLP (ADR 0002) é defensável nos
dois cenários — vale dizê-lo ao Comitê.

**Pergunta:** quem é o dono do produto em regime permanente?
**Decide:** Comitê Gestor / subsecretário.

### 2. Data de lançamento

**Status atual:** o prazo de meados de julho venceu. Leitura de 03/06: conteúdo
completo só em novembro (pós-eleição), mas a plataforma deve sair antes com o
que não cai do ar (RNF-DIS-01).

**Pergunta:** qual a data pactuada, e o lançamento é único ou em duas etapas?
**Decide:** Lina / Renato.

### 3. Publicação da Resolução e do Regimento

**Status atual:** minuta de Resolução com o Renato desde março/2026. O Regimento
sai em até 90 dias após ela. Sem a norma, o RF-GOV-01 (Termo de Participação)
não tem base — na base nova ele está modelado e **condicionado** (specs).

**Pergunta:** há previsão? **Decide:** Renato / PGE.

## Escopo funcional

### 6. Importação em lote de cadastros

**Status atual:** levantada em 11/08 como alternativa ao formulário unitário.
Fora da v1 no plano de implementação.

**Pergunta:** confirma para a fase 2? **Decide:** Laís.

### 7. Reativar "Minha Jornada"

**Status atual:** implementada e desligada por flag no legado. A base nova **não
a porta** na v1 (fora da v1 no plano); a decisão de 27/07 removeu a barra de
progresso (curso externo não é metrificável — registra-se o clique, e isso a
base nova faz via `ProgressoCurso`).

**Pergunta:** o painel pessoal volta na fase 2, com que métrica?
**Decide:** Eduardo e Laís.

### 8. "Trilha" ou "agrupamento temático"?

**Status atual:** o modelo novo chama a entidade de `Agrupamento` — cursos de
fontes diferentes agrupados por tema, sem ordem obrigatória e sem certificação.
O **nome de interface** segue em aberto ("trilha" colide com o sentido das
escolas de governo — 08/07).

**Pergunta:** qual nome aparece na tela, e como distingui-lo das trilhas
externas linkadas? **Decide:** Lina.

### 9. Vídeos de treinamento: Biblioteca ou capacitação da Rede?

**Status atual:** dúvida da Lina em 20/08. Material em texto vai para a
Biblioteca. Com a taxonomia agora compartilhada (ADR 0003), o mesmo vídeo pode
ser referenciado dos dois lados sem duplicar cadastro — o que muda o custo da
resposta.

**Pergunta:** qual é a regra de roteamento por tipo de material?
**Decide:** Lina, com Jorge.

### 10. Hospedagem de cursos pelo canal da UNICAMP

**Status atual:** consulta da Lina em andamento desde 03/06 (vedações
eleitorais — Secom).

**Pergunta:** houve retorno? **Decide:** Lina.

## Abertas na sessão de 27/08

### 17. Dono e escala da moderação diária

**Status atual:** com a moderação prévia total (ADR 0003), todo tópico espera
aprovação. A fila de curadoria vira tela de primeira classe na etapa 4 do plano
— mas fila sem dono mata o fórum mais rápido que qualquer defeito.

**Pergunta:** quem modera, com que cadência e que prazo-alvo de resposta? A v1
não lança o fórum sem essa resposta. **Decide:** Laís e Lina (levada à reunião
de 27/08).

### 18. Os cinco termos da Lina: assunto, tag ou navegação?

**Status atual:** Metaprocesso, Fluxo, Mapeamento de Processos, Documentação e
Modelos entraram como Assunto (origem `lina`) por decisão de 27/08 — mas
descrevem tipo de material ou a própria navegação, não tema. A dúvida é da
própria autora ("Não sei bem a diferença" — DESCRIÇÃO RECPSP). Mudar é barato
enquanto não há conteúdo real.

**Pergunta:** confirmam-se como Assunto, ou viram tag/entrada de navegação?
**Decide:** Lina.

### 19. Leitura pública ou rede fechada?

**Status atual:** o Documento de Requisitos delimita acesso restrito a agentes
públicos (RF-AUT-02); o protótipo, porém, era público para leitura. A base nova
nasce **fechada por padrão**, com `LEITURA_PUBLICA` configurável (specs de
arquitetura, seção 3).

**Pergunta:** visitante sem conta vê algo (fórum? capacitação?) ou nada?
**Decide:** Lina e Laís.

---

## Decididas

| # | Pergunta | Decisão | Data · origem |
|---|---|---|---|
| 4 | Banco de produção | **PostgreSQL**, migrações versionadas, índices desde o início, FKs com política explícita | 27/08/2026 · ADR 0001 |
| 5 | Interface do cadastrador | **Página própria** com papel escopado por órgão (`cadastrador_de`) e aprovação da administração (`CadastroPendente`) | 11/08 (tendência) + 27/08 (espec) · ADR 0003 / specs |
| 11 | Moderação prévia | **Todo tópico entra pendente**, sem exceção por tipo ou papel; fila de curadoria de primeira classe (dono e escala: pergunta 17) | 26/08 (Laís) + 27/08 · ADR 0003 |
| 12 | Onde mora o catálogo de capacitação | **No banco, gerido pela administração** (Curso, Evento, Pilula, FAQ como tabelas). Os três lugares divergentes do legado morrem por construção | 27/08/2026 · specs/modelo-de-dados |
| 13 | `specialist_requests` | **Não nasce.** Concessão por convite da administração; autosserviço, se vier, é decisão futura | 27/08/2026 · ADR 0003 |
| 14 | Papel `especialista` | **Selo, não papel.** Papéis de acesso: usuário, moderador, administrador. Especialidade por macroetapa ou assunto, com o termo específico no selo | 27/08/2026 · ADR 0003 |
| 15 | Categorias do fórum | **Taxonomia da BDLP v9**, três eixos (categoria processual com PCA, assunto, natureza) — desenhada para reuso na Rede | 27/08/2026 · ADR 0003 |
| 16 | Conteúdo de demonstração | **Homologação sobe limpa.** `SEED_DEMO_DATA=0` é o padrão desde 26/08; demo é opt-in de desenvolvimento; na base nova, fixture opt-in | 26/08 (compose) + 27/08 (confirmação de que o banco é descartável) |
