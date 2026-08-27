# Plano de implementação da base nova

> A ordem de execução da reescrita (ADR 0002), com critério de pronto por etapa.
> Escopo da v1: **seção 8 do Documento de Requisitos**. Cada etapa fecha com o
> laço de verificação verde (`make test` + `make lint`; a partir da etapa 1,
> também `make a11y-check` nas páginas existentes) e cabe em uma ou poucas
> sessões de trabalho, com commit ao fim — nada fica preso em worktree.

| | |
|---|---|
| Versão | 1.0 |
| Data | 27/08/2026 |
| Regra | O legado (8003) está **congelado**: nenhuma funcionalidade nova nele, só correção de segurança crítica. Todo trabalho novo é na base nova. |

---

## Etapa 0 — Fundação

**Entra:** esqueleto do repositório (`backend/` Django com as sete apps vazias,
`frontend/` Vite + TypeScript); `docker/docker-compose.dev.yml` (app 8004,
Postgres 5434, Vite 5173 — **tudo publicado em loopback no host**, o que em
contêiner é o que de fato garante o loopback: [ADR 0004](../adr/0004-loopback-em-conteiner.md)); `.devcontainer/` apontando para o serviço de dev (ADR-008);
Makefile com os verbos novos (`up · down · test · lint · a11y-check · shell ·
logs`) e os do legado sob prefixo `demo-`; settings por ambiente com segredos
fail-loud; CSP estrita; pre-commit (ruff, mypy, ESLint, tsc); CI nova (lint →
testes → builds → axe → auditoria de dependências → build da imagem).

**Pronto quando:** `make up` sobe os três serviços em contêiner; `make test`
roda pytest e Vitest **de dentro do contêiner** (o que esta sessão provou ser
impossível no legado); a página raiz responde com CSP estrita; CI verde no
GitHub.

## Etapa 1 — Design system e taxonomia

**Entra:** tokens (`design-system.md`), fontes hospedadas localmente, layout raiz
(landmarks, skip link, `<h1>`), os componentes de base (`Botao`, `Campo`,
`Cartao`, `Selo`, `Alerta`, `Toast`, `Modal`, `MenuSuspenso`, `Carregando`,
`EstadoVazio`); app `taxonomia` com modelos, migração inicial e
`seed_taxonomia` da BDLP v9; página de amostra dos componentes.

**Pronto quando:** todo componente com teste de teclado e rótulo; axe zero na
amostra; o seed cria os três eixos idênticos aos da BDLP (teste compara com a
lista canônica); nenhum hexadecimal fora do arquivo de tokens (lint prova).

## Etapa 2 — Capacitação (a exigência da v1)

**Entra:** app `capacitacao` completa (Curso, Instituicao, Agrupamento, Evento,
Pilula, PerguntaFrequente, ProgressoCurso) com gestão pelo admin; páginas Centro
de Capacitação e Calendário de Eventos fiéis ao layout fechado em julho; FAQ com
busca; registro de clique em curso; importação de playlists **somente depois da
rotação da chave do YouTube** (P1 — pré-condição dura desta etapa).

**Pronto quando:** RF-CAP-01, 02, 03, 04, 06, 07, 08 e 10 atendidos com conteúdo
gerido pelo admin (o problema dos três catálogos está morto por construção);
estratégia eleitoral aplicável por dados (RNF-DIS-01: desativar fonte estadual é
edição, não deploy); paridade visual com o mockup validada pela equipe.

## Etapa 3 — Contas e acesso

**Entra:** app `contas` (Usuario, Orgao, Unidade, CadastroPendente,
Especialidade, conta sentinela); autenticação por sessão; cadastro escalonado com
a página própria do cadastrador e aprovação; aceite de termos + comunicado;
interesses em pop-up no primeiro uso; rede fechada com `LEITURA_PUBLICA`
configurável; admin Django sob caminho próprio. **Trilho paralelo:** integração
Gov.br OIDC — abre com a solicitação à TI/PRODESP e entra quando as credenciais
existirem, sem bloquear as etapas seguintes.

**Pronto quando:** os testes de autorização, banimento, anonimização e sentinela
(traduzidos do legado) passam; um cadastrador consegue cadastrar e a
administração aprovar de ponta a ponta; CPF cifrado e mascarado, fora de log.

## Etapa 4 — Fórum

**Entra:** app `forum` completa com moderação total (fila de curadoria de
primeira classe: contagem, espera, motivo, lote), classificação nos três eixos
(categoria obrigatória; assunto e natureza opcionais), respostas com melhor
resposta e resposta verificada, reações, enquetes, tags, disclaimer permanente
TCE/PGE (RF-FOR-07), tópicos relacionados por taxonomia, selo de especialidade.

**Pronto quando:** as regras de visibilidade dos testes legados passam
(traduzidas para moderação total); criar → moderar → publicar → responder →
verificar funciona de ponta a ponta; RF-FOR-01 a 11 atendidos.

## Etapa 5 — Mensagens, notificações, home e indicadores

**Entra:** app `mensagens` (toda notificação navega — os 3 tipos mortos do
legado não se repetem); app `portal` (home agregadora com cards geridos,
RF-HOM-01/02; páginas de regulamentação, RF-GOV-03); busca transversal
(tópicos + cursos + pílulas + FAQ — RF-BUS-01); app `indicadores` com EventoUso
e o painel mínimo (cadastros por órgão, acessos, interesses — RF-IND-01).

**Pronto quando:** a busca única devolve os quatro tipos de conteúdo; o painel
responde às três perguntas mínimas da gestão; toda notificação clicada navega.

## Etapa 6 — Corte

**Entra:** validação de paridade com a equipe (roteiro por tela); `make
a11y-check` verde em todas as páginas; `DEPLOY.md`; varredura final de segredos;
a nova assume o lugar da demonstração; remoção do código legado da árvore
(permanece no histórico); desativação do `recpsp.onrender.com` (RNF-HOSP-03);
atualização de toda a documentação da frente.

**Pronto quando:** o corte em homologação está executado **pela esteira ou por
solicitação formal à TI** (ADR-006 — nunca pelo desenvolvedor); a demonstração
saiu do ar; o checklist da frente reflete o estado real.

---

## Fora da v1 (explícito)

Importação de cadastros em lote (RF-AUT-04 — decisão da Laís); municípios via
LicitaCidades (RF-AUT-08); encaminhamento a especialistas e mentoria (RF-FOR-12);
lições aprendidas (RF-FOR-13); recomendação por perfil (RF-CAP-05); Minha
Jornada (RF-CAP-11 — decisão pendente de Eduardo/Laís); dashboard de indicadores
do art. 9º (RF-IND-02); APIs do ecossistema (RF-INT-03); Termo de Participação
(RF-GOV-01 — **condicionado à publicação da Resolução**); GTTs (RF-GOV-02).

## Dependências externas — quem destrava o quê

| Dependência | Dono | Bloqueia |
|---|---|---|
| Rotação da chave do YouTube (P1, vencida) | Bernardo, no Google Cloud | importação de pílulas (etapa 2) |
| Dono e escala da moderação diária | Laís/Lina (reunião) | operação do fórum (etapa 4 entrega a fila; alguém precisa esvaziá-la) |
| Credenciais Gov.br | TI/PRODESP | trilho paralelo da etapa 3 |
| Lista de órgãos e representantes | Laís (ofícios Fase 1) | conteúdo do cadastro escalonado |
| Esteira GitHub Actions → homologação | TI (em validação) | etapa 6 |
| Confirmações de taxonomia (perguntas 8, 18, 19) | Lina | nomes de interface; classificação dos 5 termos; leitura pública |

## Riscos do plano

| Risco | Mitigação |
|---|---|
| Reescrita lida como retrocesso pela equipe | ADR 0002 explicita o que se preserva; a demo continua no ar até o corte; paridade validada tela a tela |
| Bug do Django atrás do `index.php` (bloqueia BDLP e agora duas frentes) | tratar antes da primeira subida à homologação (ADR-001 transversal, 27/08) |
| Fila de moderação sem dono mata o fórum | pergunta 17 na reunião; a v1 não lança fórum sem dono nomeado |
| Escopo crescer durante a reescrita | "Fora da v1" é contrato; entrada nova exige sair algo |
| Capacidade concentrada numa pessoa | etapas curtas com commit ao fim; nada preso em worktree (lição de 26/08) |
