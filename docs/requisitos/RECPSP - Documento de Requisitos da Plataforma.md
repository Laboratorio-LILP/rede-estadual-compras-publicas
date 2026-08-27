# RECPSP — Documento de Requisitos da Plataforma Colaborativa Digital

**Rede Estadual de Compras Públicas de São Paulo (RECPSP) — Projeto 3 do Portfólio 2026 do LILP**

| Campo | Valor |
|---|---|
| Versão | 1.1 — minuta para validação da equipe; as-is sincronizado com as rodadas de 26/08 |
| Data | 26/08/2026 |
| Elaboração | Bernardo Galvão — Chefe de Divisão, LILP/SGGD |
| Atende | Meta 3.2 do Portfólio 2026 (especificação técnica da Plataforma Colaborativa) |
| Escopo | Estritamente a plataforma digital; o arcabouço institucional entra apenas como referência normativa |
| Método | Varredura completa de Teams, Outlook, calendário, SharePoint (conector M365), atas e transcrições (tl;dv), vault do LILP, Todoist e repositório oficial; cada requisito tem fonte rastreada |

---

## 1. Resumo

Este documento consolida os requisitos funcionais e não funcionais da plataforma digital da RECPSP, levantados de todas as fontes corporativas disponíveis entre dezembro/2025 e 26/08/2026. A plataforma é o ambiente digital oficial da Rede (o "Portal da RECPSP" da minuta de Resolução): reúne fórum com moderação prévia, centro de capacitação agregador, busca transversal, cadastro escalonado por órgão com autenticação Gov.br e indicadores de uso para a gestão.

O documento parte da base existente — o repositório oficial `Laboratorio-LILP/rede-estadual-compras-publicas`, importado em 26/08/2026 do protótipo do Eduardo Cappia (85 commits) — e especifica o que falta para a primeira versão e para a produção (as-is → to-be). A exigência central de escopo da v1, definida pela Lina em 02/07: **a primeira versão sai com a parte de Capacitação pronta**; o fórum já está desenvolvido e a home agregadora definida.

## 2. Referência normativa e institucional (contexto, fora do escopo)

- **Resolução SGGD nº 38/2024, art. 4º, VI** — competência do LILP de criação e inserção em redes organizacionais (fundamento do projeto).
- **Portfólio 2026 do LILP, Projeto 3** — instituição da RECPSP com plataforma colaborativa digital; metas 3.1 (governança — concluída, minuta), 3.2 (plataforma — este documento + implementação), 3.3 (evento de lançamento — vencida, repactuar), 3.4 (integração de 50% das unidades — Laís/Eduardo).
- **Minuta de Resolução da RECPSP (v3, 05/03/2026)** — institui a Rede, o Comitê Gestor e, no art. 9º, os nove instrumentos; no art. 10, define o **Portal da RECPSP** como ambiente digital de funcionamento, formalização da participação e publicização dos Termos de Participação. **Status: com o Renato para aprovação desde março/2026.**
- **Minuta de Regimento Interno (Lina, 21/01/2026)** — cadastramento simplificado na Plataforma; participação aberta aos servidores de Logística Pública; moderação ativa; código de conduta; confidencialidade; fluxo de apoio técnico (mentoria → especialistas → GTT → Comitê Gestor).
- **Plano de Implementação da RECPSP (mar/2025)** — prevê especificação técnica (requisitos, arquitetura, modelo de dados, interfaces), manual do usuário, testes/homologação com usuários-chave e lançamento beta; indicadores de sucesso e riscos (retomados nas seções 10 e 11).

## 3. Objetivo e escopo da plataforma

**O que é.** Comunidade profissional digital dos gestores de compras do Estado: um lugar único onde o agente público de contratações pergunta (fórum), aprende (capacitação), consulta (modelos, normativos, biblioteca) e se conecta (rede). Papel estratégico declarado: **gerar informação para a gestão** — demanda, interesses, engajamento ("uma das maiores riquezas da rede" — Lina, 03/06 e 15/07).

**O que não é (delimitações decididas):**

- Não é canal de orientação oficial: as respostas do fórum têm cunho conceitual e não servem de base para decisão administrativa (alinhamento com TCE/PGE — Lina, 26/08). O canal oficial segue sendo o Fale Conosco do órgão central.
- Não certifica nem qualifica para cargos: certificação é das escolas de governo; a trilha de formação com certificação de proficiência é projeto próprio do GT de Capacitação (Lina, 08/07).
- Não é aberta ao público: acesso restrito a agentes públicos de órgãos estaduais, com entrada escalonada por órgão; municípios só em fase posterior, via termo de adesão do LicitaCidades (Lina, 26/08).
- Não substitui o órgão central: a relação entre a Rede e as diretrizes do órgão central (SILOG) é ponto de governança **em aberto** (questão do Marcos, 26/08 — seção 12).

## 4. Atores e perfis

| Perfil | Descrição | Origem |
|---|---|---|
| Usuário | Agente público de órgão estadual, cadastrado; lê e participa do fórum e da capacitação | as-is (repo) + Regimento |
| Cadastrador (novo) | Representante indicado pelo órgão (via ofício circular); cadastra os servidores do próprio órgão (nome + CPF) em interface própria | Reunião 11/08 |
| Especialista | Usuário marcado pela administração como especialista por categoria; respostas destacadas | as-is + reuniões 27/07 e 26/08 |
| Moderador | Modera o fórum (aprovação de conteúdo, conduta) | as-is + Regimento |
| Administrador | Equipe LILP: aprova tópicos e cadastros, gere papéis, especialidades, playlists, FAQ e cards | as-is + reuniões 11/08 e 27/07 |
| Instituições colaboradoras / especialistas convidados | Universidades, PGE, TCE — participação por convite (Resolução, art. 7º) | Minuta de Resolução |

## 5. Requisitos funcionais

Prioridade em MoSCoW: **M** (Must — obrigatório na v1), **S** (Should — importante, pode entrar logo após a v1), **C** (Could — fase 2), **W** (Won't — fora do escopo desta versão). Estatuto: **D** = decidido (registro em reunião/documento), **P** = proposto (ideia registrada, sem decisão), **A** = em aberto (depende de decisão — seção 12). As-is: estado na base atual do repositório.

### 5.1 Acesso e cadastro (AUT)

| ID | Requisito | Prior. | Est. | As-is | Fonte |
|---|---|---|---|---|---|
| RF-AUT-01 | Autenticação via **Gov.br**, obrigatória na subida para ambiente PRODESP; o login Gov.br fica associado à camada de administração de usuários | M | D | Em implementação (Bernardo) | Apresentação 26/08 (Eduardo, Bernardo); reunião 11/08 |
| RF-AUT-02 | Acesso **restrito e validado**: somente agentes públicos de órgãos estaduais; entrada escalonada — órgãos indicam representantes (ofício circular) que cadastram os demais servidores do órgão | M | D | Cadastro aberto (login por e-mail/senha) | Apresentação 26/08 (Lina); Regimento art. 1º-2º; ofícios Fase 1 |
| RF-AUT-03 | Perfil **cadastrador**: formulário simples (nome + CPF) dentro da plataforma para o representante cadastrar os servidores do seu órgão, com aprovação final da administração; interface própria, sem expor o painel administrativo genérico | M | D | Não existe (papéis: admin, moderator, user) | Reunião 11/08 (Bernardo, Laís, Eduardo, Marilda) |
| RF-AUT-04 | Importação de cadastros em lote (planilha) como alternativa ao formulário unitário | S | P | Não existe | Reunião 11/08 (Laís, Bernardo) |
| RF-AUT-05 | Aceite de **Termos de Uso e Política de Privacidade** no cadastro + **comunicado de ambiente colaborativo** (opiniões dos participantes não representam o órgão), com nova confirmação | M | D | Implementado (aceite no primeiro acesso, sob teste automatizado) | Apresentação 26/08 (Eduardo); repo |
| RF-AUT-06 | Campo instituição por **seleção** em lista de órgãos (não texto livre) | S | D | Texto livre | Apresentação 26/08 (Eduardo) |
| RF-AUT-07 | Categorias de interesse solicitadas em **pop-up no primeiro uso** do fórum, opcionais | S | D | No formulário de cadastro | Apresentação 26/08 (Eduardo) |
| RF-AUT-08 | Municípios: entrada somente após termo de adesão via LicitaCidades | C | D | Não aplicável | Apresentação 26/08 (Lina) |

### 5.2 Página inicial (HOM)

| ID | Requisito | Prior. | Est. | As-is | Fonte |
|---|---|---|---|---|---|
| RF-HOM-01 | Home agregadora com cards dos serviços: Fórum, Modelos de Documentos (→ ComprasSP, minutas PGE), Vade Mecum (→ link), Capacitação, Portal de Desafios (→ link), Plataforma de Sustentabilidade, Biblioteca Digital (→ link), **Hub de Boas Práticas** (no lugar do card "consultoria executiva/em breve") | M | D | Home com cards; troca do card do Hub pendente | Reunião 27/07 ("as seis definidas + quatro"); Apresentação 26/08 (Eduardo, Lina) |
| RF-HOM-02 | Gestão dos cards pela administração (adicionar, remover, alterar) | S | D | Mockup demonstrado; confirmar no código | Apresentação 26/08 (Eduardo) |

### 5.3 Fórum (FOR)

| ID | Requisito | Prior. | Est. | As-is | Fonte |
|---|---|---|---|---|---|
| RF-FOR-01 | Categorias organizadas pelo **metaprocesso da contratação** (Planejamento da Contratação; Seleção do Fornecedor; Gestão de Contratos) + temas transversais, na mesma lógica do Portal de Compras, com estatísticas por categoria | M | D | 11 categorias temáticas semeadas | DESCRIÇÃO RECPSP (Lina, 31/03); Teams 31/03 |
| RF-FOR-02 | Tags coerentes com as categorias, usadas na busca | M | D | Implementado | DESCRIÇÃO RECPSP |
| RF-FOR-03 | **Moderação prévia**: tópico novo entra pendente e só publica após aprovação (curadoria por qualidade e risco político) | M | D | **Parcial** — só tópicos com imagem ou vídeo entram pendentes; texto puro publica direto (verificado no código em 26/08) | Repo; Apresentação 26/08 (Laís) |
| RF-FOR-04 | Tópico de discussão e de **votação (enquete)**; anexar imagem e vídeo; editor de texto rico | M | D | Implementado | Apresentação 26/08 (Eduardo); repo |
| RF-FOR-05 | Sugestão de tópicos semelhantes na criação (anti-duplicação) e ranqueamento de tópicos relacionados por categoria/palavras-chave | M | D | Demonstrado ao vivo em 26/08 | DESCRIÇÃO RECPSP; Apresentação 26/08 (Eduardo) |
| RF-FOR-06 | Papéis usuário/moderador/administrador + marcação de **especialista por categoria**; resposta de especialista destacada; **resposta verificada** atestada pela administração | M | D | Papéis e especialidades implementados; exibição de "verificada" em fechamento | Reuniões 15/07 e 27/07; Apresentação 26/08 |
| RF-FOR-07 | **Disclaimer permanente** (alinhado com TCE/PGE): respostas têm cunho conceitual/teórico, não são orientação oficial nem base para decisão | M | D | Comunicado no cadastro; reforço no fórum a confirmar | Apresentação 26/08 (Lina); reunião 27/07 |
| RF-FOR-08 | Métricas visíveis por tópico: visualizações, respostas, tempo desde a última resposta | S | D | Demonstrado em 26/08 | Apresentação 26/08 (Eduardo) |
| RF-FOR-09 | Capacitações e vídeos (pílulas) relacionados exibidos junto ao tópico, pelo mesmo ranqueamento temático | S | D | Demonstrado em 26/08 (vídeos fora do ar no período eleitoral) | Apresentação 26/08 (Eduardo, Lina) |
| RF-FOR-10 | Curtidas/descurtidas em respostas | S | D | Implementado | Repo |
| RF-FOR-11 | Mensagens diretas entre membros e notificações | S | D | Implementado | Repo |
| RF-FOR-12 | Encaminhamento de questões pelos moderadores a especialistas cadastrados, com possibilidade de propor mentoria/ajuda entre pares | C | P | Não existe | DESCRIÇÃO RECPSP (Lina) |
| RF-FOR-13 | Campo de lições aprendidas (referência: rede Conexão Inovação Pública/InovaGov) | C | P | Não existe | Teams 21/01 (Lina) |

### 5.4 Capacitação (CAP)

| ID | Requisito | Prior. | Est. | As-is | Fonte |
|---|---|---|---|---|---|
| RF-CAP-01 | Capacitação **nativa na plataforma** — não apenas redirecionar a portal externo | M | D | Página em evolução (era só botão para o portal) | Reunião 03/06 (Lina: "o ideal é que não vá para um portal") |
| RF-CAP-02 | **Agregador de cursos multi-fonte** — EV.G/ENAP, EGESP, TCE/Escola de Contas, PRODESP, MOOC GGTE-UNICAMP, outras escolas de governo — com estados: inscrição aberta, em andamento (ao vivo/síncrono), realizados | M | D | Catálogo em `src/data`; fontes em expansão | Reuniões 03/06 e 26/08; Teams 10/03 (MOOC) |
| RF-CAP-03 | Página "Centro de capacitação": hero, iniciar aprendizagem, explorar catálogo, cursos em destaque, sua trilha, próximos eventos; **sem barra de progresso** de cursos externos (não metrificável — registra-se o clique) | M | D | Layout fechado nas reuniões de julho | Reuniões 27/07 e 15/07 (Eduardo) |
| RF-CAP-04 | Distinção **trilha × agrupamento temático**: trilhas externas (sequência com certificado da escola de origem) linkadas no primeiro nível; agrupamentos internos por tema (ex.: pregoeiro), sem ordem obrigatória; evitar sobreposição de conteúdo | M | D (nome em aberto) | Estrutura de trilha existente; curadoria pendente | Reunião 08/07 (Lina, Bernardo, Laís) |
| RF-CAP-05 | Recomendação de trilha por perfil declarado (ex.: "novo fiscal de contratos") | S | D | Demonstrado em mockup | Apresentação 26/08; reunião 15/07 |
| RF-CAP-06 | Importação de playlists e vídeos do **YouTube** (YouTube Data API), inclusive canais das universidades; pílulas identificáveis por tema | M | D | Implementado (chave exposta — ver RNF-SEG-05) | Repo; reunião 15/07 (Eduardo: "qualquer coisa no YouTube a gente consegue puxar") |
| RF-CAP-07 | **Calendário de eventos** (futuros/realizados, filtros como no fórum, link de acesso e gravação de evento online); agenda de capacitações da SGGD e de outras escolas/órgãos | M | D | Implementado; página dedicada com filtros decidida em 27/07 | Repo; reuniões 27/07 e 26/08 |
| RF-CAP-08 | **Perguntas Frequentes com busca** (conteúdo do Portal de Compras), editáveis por back-end simples; avaliar aproveitamento do conteúdo do Fale Conosco | S | D (FAQ) / P (Fale Conosco) | Interface pronta; falta back-end de edição | Reunião 27/07 (Eduardo); DESCRIÇÃO RECPSP |
| RF-CAP-09 | Conteúdos integrados na capacitação: link da Biblioteca Digital, jogo do laboratório (Trophy Run), Cadernos ODS, Plataforma de Sustentabilidade, materiais de apoio, parcerias/universidades | S | D | Parcial (links em inclusão) | Reunião 15/07 (Lina); reunião 03/06 |
| RF-CAP-10 | Registro de interesse autodeclarado do usuário como insumo gerencial (o que quer aprender/fazer) | S | D | Categorias de interesse no cadastro | Reunião 15/07 (Lina) |
| RF-CAP-11 | "Minha Jornada" (painel pessoal de progresso) — reativação a decidir | C | A | Implementado, desligado por flag (31/07) | Repo (`MINHA_JORNADA_ENABLED = false`) |
| RF-CAP-12 | A plataforma **não certifica** para cargos nem substitui as escolas de governo (delimitação) | W | D | Não aplicável | Reunião 08/07 (Lina, em resposta a Jorge) |

### 5.5 Busca transversal (BUS)

| ID | Requisito | Prior. | Est. | As-is | Fonte |
|---|---|---|---|---|---|
| RF-BUS-01 | Busca única que retorna todo o conteúdo relacionado ao critério: cursos, tópicos do fórum, vídeos, bibliografia/artigos e demais conteúdos | M | D | Demonstrada em 26/08 (cursos + tópicos); rotas de busca no repo | Reunião 03/06 (Lina); DESCRIÇÃO RECPSP; Apresentação 26/08 |
| RF-BUS-02 | Sugestões de conteúdo na busca (vídeos, discussões anteriores, cursos; se possível, artigos da Biblioteca) | S | D | Parcial (ranqueamento temático) | DESCRIÇÃO RECPSP |

### 5.6 Indicadores (IND)

| ID | Requisito | Prior. | Est. | As-is | Fonte |
|---|---|---|---|---|---|
| RF-IND-01 | Indicadores de uso para a gestão: cadastros por órgão, logins (todo acesso gera log), inscrições e interesses, visualizações, tópicos e engajamento — informação que subsidia as ações do laboratório | M | D | Logs de acesso; painel gerencial a construir | Reuniões 03/06, 15/07 e 11/08; Portfólio |
| RF-IND-02 | Dashboard de indicadores de logística pública (instrumento do art. 9º, VIII da Resolução — distinto dos indicadores de uso) | C | D | Não existe | Minuta de Resolução; Portfólio |

### 5.7 Administração (ADM)

| ID | Requisito | Prior. | Est. | As-is | Fonte |
|---|---|---|---|---|---|
| RF-ADM-01 | Painel administrativo: aprovar/rejeitar tópicos, gerir papéis, banir, definir especialidades por categoria, importar playlists; evoluções: aprovar cadastros, interface do cadastrador, edição de FAQ, gestão dos cards da home | M | D | Núcleo implementado (13 rotas admin); evoluções pendentes | Repo; reuniões 11/08 e 27/07 |
| RF-ADM-02 | Atribuição de especialista pela administração após o cadastro (convidados: universidades, PGE; alinhamento com TCE/PGE em curso pela Lina) | M | D | Implementado (mecânica); processo em alinhamento | Reunião 27/07; Apresentação 26/08 (Lina) |

### 5.8 Integrações e governança no portal (INT/GOV)

| ID | Requisito | Prior. | Est. | As-is | Fonte |
|---|---|---|---|---|---|
| RF-INT-01 | Links institucionais: Modelos de Documentos → ComprasSP (minutas aprovadas pela PGE); Vade Mecum; Portal de Desafios; Biblioteca; mapeamento de processos → fluxo do Portal de Compras | M | D | Cards/links na home | Apresentação 26/08 (Lina, Eduardo); DESCRIÇÃO RECPSP |
| RF-INT-02 | Integração com o Hub de Boas Práticas: criar discussão no fórum a partir de uma prática publicada ("um alimenta o outro") | S | D | Em desenho (Hub em construção) | Apresentação 26/08 (Eduardo) |
| RF-INT-03 | APIs de integração entre as plataformas do ecossistema LILP (RECPSP, Hub, Biblioteca, PESCP) | C | P | Não existe | E-mail Necessidades de TI (19/08) |
| RF-GOV-01 | O Portal formaliza a participação das unidades (Termo de Participação disponível) e **publiciza os Termos celebrados** | M* | D | Não existe (*Must quando a Resolução for publicada) | Minuta de Resolução, art. 6º e 10 |
| RF-GOV-02 | Espaço para Grupos Técnicos Temáticos (menu "Grupos temáticos") | C | P | Não existe | DESCRIÇÃO RECPSP; Resolução art. 8º |
| RF-GOV-03 | Página de Regulamentação da RECPSP (Resolução, Regimento, Código de Conduta) | S | D | Não existe | DESCRIÇÃO RECPSP (menu) |

### 5.9 Instrumentos da Resolução (art. 9º) — mapeamento para a plataforma

| Instrumento | Atendimento na plataforma | Fase |
|---|---|---|
| I. Fórum temático | Módulo Fórum (5.3) | v1 |
| II. Repositório de modelos e documentos | Link ComprasSP (RF-INT-01); repositório próprio se demandado | v1 (link) |
| III. Protocolos e procedimentos padronizados | Conteúdo via repositório/modelos | v1 (link) |
| IV. Biblioteca de normativos comentados | Vade Mecum eletrônico (link) | v1 (link) |
| V. Agenda de eventos e capacitações | Calendário + centro de capacitação (5.4) | v1 |
| VI. Plano de desenvolvimento individual (gestão por competências) | Projeto próprio (GT de Competências); integração futura | Fase 2+ |
| VII. Diretório de especialistas por área | Parcial na v1 (especialistas por categoria no fórum); diretório dedicado depois | v1 parcial / fase 2 |
| VIII. Dashboard de indicadores | RF-IND-02 | Fase 2 |
| IX. Sistema de mentoria entre pares | RF-FOR-12; piloto manual já em curso (orientação à Saúde, 03/06) | Fase 2 |

## 6. Requisitos não funcionais

| ID | Requisito | Prior. | As-is | Fonte |
|---|---|---|---|---|
| RNF-SEG-01 | Fluxo de implantação do ADR-006: desenvolvimento local sem acesso a servidor → homologação na VM da SGGD (acesso só por VPN; subida por esteira GitHub Actions) → produção PRODESP; intervenções de servidor pela TI | M | Containerização pronta (compose `lilp-recpsp`); esteira em validação | ADR-006; reunião CTI 30/06; e-mail Necessidades de TI |
| RNF-SEG-02 | Autenticação Gov.br obrigatória em produção (exigência PRODESP) | M | Em implementação | Apresentação 26/08 (Eduardo, Bernardo) |
| RNF-SEG-03 | Segredos somente por variável de ambiente, sem fallback; nenhuma credencial de seed em código; `JWT_SECRET` obrigatório | M | Resolvido em 26/08: `JWT_SECRET` sem fallback (produção recusa subir sem ele); admin de produção com `ADMIN_PASSWORD` ou senha sorteada; demonstração só com `SEED_DEMO_DATA=1` | Padrão LILP (repo-modelo BDLP); CLAUDE.md da frente |
| RNF-SEG-04 | CSP estrita em produção; CORS por ambiente (`ALLOWED_ORIGINS`); rate limit (hoje só na autenticação — estender ao restante da API) | M | CSP estrita (`script-src 'self'`) e CORS por env desde 26/08; rate limit segue só na autenticação | CLAUDE.md da frente |
| RNF-SEG-05 | **Rotacionar a chave do YouTube Data API** exposta no histórico Git herdado (pública desde 14/03/2026) — P1; considerá-la comprometida até lá | M | Pendente | CLAUDE.md da frente; Mapa v2.22 |
| RNF-SEG-06 | Moderação prévia permanente de todo conteúdo público (mitigação de risco político e de qualidade) | M | Parcial: só tópico com mídia entra pendente (ver RF-FOR-03) | Apresentação 26/08 (Laís); Regimento (moderação ativa) |
| RNF-LGPD-01 | LGPD: minimização de dados (nome, CPF, e-mail, órgão, interesses); garantia de não exposição de dados pessoais; Termos de Uso e Política de Privacidade cobrindo plataforma, cadastro, conduta, conteúdo, responsabilidade e limitações | M | Termos implementados; revisão jurídica recomendada | Apresentação 26/08 (Eduardo); e-mail Necessidades de TI (item 7) |
| RNF-LGPD-02 | CPF coletado somente dentro da plataforma (formulário do cadastrador) — sem circulação de planilhas nominais por canais externos | S | Decidido em 11/08; a implementar | Reunião 11/08 |
| RNF-HOSP-01 | Hospedagem no padrão LILP: contêiner Docker (stack `lilp-recpsp`, web em loopback `127.0.0.1:8003`) atrás da borda; produção na PRODESP com domínio/subdomínios institucionais; servidor único com banco compartilhado para as quatro plataformas do laboratório (divisão lógica) | M | Compose e Makefile prontos (26/08) | Apresentação 26/08 (Bernardo); ADR-001/004; e-mail Necessidades de TI |
| RNF-HOSP-02 | "Sub-path clean" (montável sob `/caminho/` num domínio único) e isolamento da administração (idealmente subdomínio próprio) | M | A verificar no front | ADR-005 |
| RNF-HOSP-03 | Desativar a hospedagem de teste externa (`recpsp.onrender.com`) quando a homologação institucional subir — fora do padrão ADR-006; hoje o serviço adormece por inatividade | S | Ativa como teste | CLAUDE.md da frente; reunião 08/07 (comportamento observado) |
| RNF-ESC-01 | Dimensionar para crescimento expressivo de usuários (todas as unidades compradoras do Estado; risco de escala apontado pelo Bernardo em 03/06); avaliar migração SQLite → Postgres antes da produção (padrão LILP) | S | SQLite mono-instância em volume | Reunião 03/06 (Bernardo); CLAUDE.md da frente |
| RNF-DIS-01 | Resiliência ao período eleitoral: conteúdo estadual (portal, YouTube de órgãos) sai do ar; a v1 opera com fontes autônomas (USP/UNESP/UNICAMP), cursos ao vivo, EV.G/ENAP e EGESP; código pronto para reativar o conteúdo estadual após as eleições; vídeos novos com logo neutro; comentários de vídeo fechados quando couber | M | Estratégia definida em 03/06 | Reunião 03/06 (Lina, Laís, Marilda) |
| RNF-DIS-02 | Disponibilidade, backup, monitoramento e recuperação em produção no âmbito do contrato SGGD–PRODESP | M | A contratar/configurar | E-mail Necessidades de TI (itens 6–7); Plano de Implementação |
| RNF-ACE-01 | Acessibilidade eMAG 3.1 + WCAG 2.0 AA, auditada (padrão das demais frentes) | M | Sem auditoria | CLAUDE.md da frente (divergências) |
| RNF-IDV-01 | Identidade visual GESP: tipografia Verdana (manual GESP; o as-is usa Verdana com Montserrat em títulos — manter ou ajustar conforme o manual), paleta institucional com vermelho `#ED1C24` (corrigir `#FF161F`), brasão e assinaturas do Governo de SP; textos em Linguagem Simples (Lei nº 15.263/2025; NBR ISO 24495-1:2024) | M | Parcial: paleta `#ED1C24` aplicada em 26/08; tipografia conforme manual a confirmar | Manual GESP; CLAUDE.md da frente |
| RNF-MAN-01 | Manutenibilidade: CI no GitHub Actions (lint + testes em PR), testes automatizados, mecanismo de migração de schema (hoje só `CREATE TABLE IF NOT EXISTS`), licença MIT, documentação de implantação no repositório da org `Laboratorio-LILP` | M | CI, LICENSE (MIT) e testes de API desde 26/08 (o front já tinha 5); sem migrations | CLAUDE.md da frente |
| RNF-AUD-01 | Logs de autenticação e uso preservados para indicadores e auditoria | S | Logs de acesso previstos | Reunião 11/08 (Bernardo) |
| RNF-SUS-01 | Modelo de sustentação pós-lançamento definido (PRODESP/"time de soluções"), com separação entre desenvolvimento e operação e redução da dependência de pessoas específicas | S | Em definição institucional | E-mail Necessidades de TI (itens 8 e 11) |

## 7. Situação atual (as-is) — base oficial em 26/08/2026

Repositório oficial: `github.com/Laboratorio-LILP/rede-estadual-compras-publicas` (importado em 26/08/2026 de `dudyfarias/RECPSP`, 85 commits, autoria preservada; upstream somente leitura). Monólito Node: React 19 + React Router 7 + TanStack Query 5 (CRA 5/CRACO, Tailwind 3) no front; Express 5 + SQLite (`better-sqlite3`), JWT + bcrypt, helmet, cors e rate limit no back; `server/index.js` (~1.900 linhas) serve API (57 rotas em `/api`) e o build do React; 18 tabelas; papéis `admin`/`moderator`/`user` + especialidades por categoria.

**Funcional hoje:** fórum com moderação prévia parcial (só tópico com mídia), mensagens diretas, notificações, enquetes, trilha de capacitação com importação de playlists do YouTube, calendário de eventos, aceite de termos no primeiro acesso. "Minha Jornada" desligada por flag. Containerização no padrão LILP concluída em 26/08 (compose `lilp-recpsp`, loopback 8003, Makefile; `JWT_SECRET` obrigatório na via canônica; `ALLOWED_ORIGINS` por env).

**Divergências herdadas em aberto** (trabalho de entrada da frente): sem auditoria de acessibilidade; sem migrations; hospedagem de teste externa; SQLite mono-instância; chave do YouTube no histórico (rotacionar — P1). As rodadas de 26/08 fecharam credenciais de seed, CSP, CI, paleta e LICENSE — placar vivo em `docs/CHECKLIST-MODELO.md`.

**Achados da leitura integral do código (26/08), que ajustam o as-is:** a moderação prévia cobre hoje apenas tópicos com mídia (RF-FOR-03); o catálogo de capacitação vive em três lugares que não coincidem (dado estático no front, seed em `resources` e a lista fixa que valida progresso), o que precede RF-CAP-02; a concessão de especialista grava um quarto valor de papel (`especialista`) fora do conjunto validado pela API; a tabela `specialist_requests` existe sem nenhuma rota que a use; não há índice algum no schema; e as rotinas de exclusão de tópico e de resposta não limpavam curtidas de resposta, o que fazia a exclusão falhar e deixar o tópico parcialmente destruído — a inferência foi confirmada em execução e corrigida em 26/08, em transação, com regressão em `server/test/exclusao.test.js`. Detalhe em `docs/ARCHITECTURE.md`, `docs/MODELO_DE_DADOS.md` e `docs/QUESTIONS.md` do repositório.

**Leituras de status na equipe (26/08):** "a rede já está praticamente pronta, só faltam poucos ajustes" (Lina) × "ainda está em desenvolvimento" (Eduardo) × "infraestrutura, banco de dados, login Gov e algumas funcionalidades — já está bem avançado" (Bernardo). Registro do Todoist (02/07): a afirmação "o Fórum está funcional" é da Lina e a validação técnica da base construída com IA era condição antes de construir em cima — em grande parte cumprida com a importação, a containerização e o inventário de divergências de 26/08; os débitos remanescentes estão listados acima e na seção 6.

## 8. Priorização da v1 (escopo mínimo decidido)

1. **Capacitação pronta** — exigência explícita da Lina (02/07) para a primeira versão, com a estratégia eleitoral da seção RNF-DIS-01 (lançar "alguma coisa" mesmo no período eleitoral — reunião 03/06).
2. **Fórum** operacional com moderação prévia, papéis, especialista/verificada e disclaimer TCE/PGE.
3. **Home agregadora** com os cards decididos (incluindo o Hub).
4. **Cadastro escalonado** (cadastrador + aprovação) e **Gov.br** pronto para a exigência da PRODESP.
5. **Indicadores mínimos** de uso (cadastros, acessos, interesses).
6. Débitos de segurança fechados: chave YouTube rotacionada, seed sem credenciais, CSP ligada, CI mínimo.

Sequência acordada (03/06, reafirmada no Mapa): Biblioteca primeiro; a Rede é a prioridade seguinte, "primeira versão mesmo que simplificada". Papéis: Bernardo implementa; Eduardo e Laís cuidam de front, estética e escopo funcional; Laís lidera cadastramento/comunicação (meta 3.4 não é do Bernardo).

## 9. Modelo de dados e interfaces (visão de especificação)

- **Entidades atuais (18 tabelas):** users, topics, posts, categories, tags, messages, notifications, resources, enquetes, curtidas, progresso de curso, especialidades — base suficiente para a v1; evoluções: entidade de órgão/unidade (para RF-AUT-02/06 e indicadores por órgão), cadastros pendentes (RF-AUT-03), FAQ (RF-CAP-08), termos de participação (RF-GOV-01).
- **Interfaces externas:** Gov.br (autenticação); YouTube Data API (playlists); links institucionais (ComprasSP, Vade Mecum, Biblioteca, Portal de Desafios); futura API interna do ecossistema LILP (RF-INT-03).
- **Manual do usuário** (meta 3.2 inclui): tutorial de navegação, guia das funcionalidades, FAQ e canais de suporte — produzir com a v1 (Plano de Implementação, item 4.2).

## 10. Indicadores de sucesso (do Plano de Implementação, a pactuar)

Processo: % de unidades compradoras cadastradas (meta original 100%; meta 3.4 do Portfólio: 50%), servidores ativos, taxa de engajamento (acessos/contribuições), diversidade de órgãos. Resultado: práticas padronizadas, documentos/modelos compartilhados, redução do tempo médio de processos, redução de impugnações, satisfação dos participantes.

## 11. Riscos

A tabela combina os riscos do Plano de Implementação (2025) com riscos atuais identificados nesta varredura. Probabilidade e impacto dos riscos novos são avaliação técnica desta consolidação, a validar pela equipe.

| Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|
| Baixa adesão das unidades | Média | Alto | Campanhas dirigidas; apoio da alta administração; ofícios de indicação (18 órgãos até 30/03 — cobrar os demais) |
| Conteúdo público em período eleitoral | Alta | Alto | Moderação prévia; fontes autônomas; logo neutro; estratégia RNF-DIS-01 |
| Escala de usuários acima da infraestrutura | Média | Alto | RNF-ESC-01 (Postgres; dimensionamento com a TI/PRODESP) |
| Governança da ferramenta em aberto (laboratório × órgão central/SILOG) | Média | Médio | Levar ao Comitê Gestor/chefia — decisão pendente (26/08) |
| Resolução não publicada trava o lançamento institucional | Média | Alto | Cobrar aprovação (com o Renato desde março) |
| Chave de API comprometida no histórico | Certa | Médio | Rotação imediata (P1) |
| Capacidade de engenharia concentrada (Bernardo; equipe de 3) | Alta | Alto | Institucionalização (e-mail Necessidades de TI); sequenciamento Biblioteca → Rede |
| Dependências de TI/PRODESP (homologação, produção, domínio, Gov.br) | Média | Alto | Fluxo ADR-006; solicitações formais; contrato PRODESP |
| Qualidade das contribuições no fórum | Média | Médio | Moderação ativa; especialistas; respostas verificadas |
| Descontinuidade por mudança de gestão | Média | Alto | Institucionalização formal (Resolução); documentação e repositório na org |

## 12. Pontos em aberto — decisões necessárias

1. **Governança da ferramenta:** instrumento permanente do laboratório ou solução ofertada ao órgão central (SILOG)? (Marcos Toffoli, 26/08 — sem resposta; potencial conflito com o papel normativo do órgão central.)
2. **Banco de dados de produção:** manter SQLite ou migrar para Postgres (padrão LILP) antes da subida — decisão técnica com impacto de escala.
3. **Nomenclatura** "trilha" × "agrupamento temático" (08/07).
4. **Vídeos de treinamento:** publicar na Biblioteca ou na página de capacitação do fórum? (20/08 — Lina em dúvida.)
5. **Interface do cadastrador:** página própria na plataforma (mais seguro) × acesso restrito ao admin genérico (11/08 — tendência: página própria).
6. **Reativar "Minha Jornada"** e critérios de progresso.
7. **Importação em lote** de cadastros (planilha) — implementar já ou fase 2.
8. **Transmissão/hospedagem de cursos pelo canal da Unicamp** — consulta da Lina em andamento (03/06); verificar vedações eleitorais (Secom).
9. **Data de lançamento** — prazo de meados de julho vencido; leitura de 03/06: conteúdo completo "só em novembro" (pós-eleição), mas soltar a plataforma antes com o que não cai; repactuar com a chefia.
10. **Aprovação da Resolução** e publicação do Regimento (90 dias após) — condicionam RF-GOV-01 e o lançamento institucional.

## 13. Rastreabilidade — fontes consultadas

| Fonte | Data | Tipo | Onde |
|---|---|---|---|
| Portfólio 2026 (VERSÃO FINAL) | fev/2026 | Compromisso formal | SharePoint DIGEP / conhecimento do projeto |
| Minuta de Resolução RECPSP v3 | 05/03/2026 | Normativo (minuta) | SharePoint · PROJETO 3 / NORMATIZAÇÃO RECPSP |
| Minuta de Regimento Interno (Lina) | 21/01/2026 | Normativo (minuta) | SharePoint · NORMATIZAÇÃO RECPSP / versões |
| DESCRIÇÃO RECPSP.docx (Lina) | 31/03/2026 | Especificação funcional | SharePoint · PROJETO 3 |
| Formulário RECPSP (levantamento aos órgãos) | jan/2026 | Diagnóstico | SharePoint · NORMATIZAÇÃO RECPSP / versões |
| Plano de Implementação RECPSP | mar/2025 | Planejamento | SharePoint · NORMATIZAÇÃO RECPSP / versões |
| Relatório Benchmarking — Redes de Compras | fev/2026 | Estudo | SharePoint · PROJETO 3 / Relatório Benchmarking |
| Reunião semanal do Laboratório (escopo da Rede) | 03/06/2026 | Transcrição tl;dv | tldv.io/app/meetings/6a206492a82d630013f67217 |
| Reunião semanal (trilhas × agrupamentos; demo da rede) | 08/07/2026 | Transcrição tl;dv | tldv.io/app/meetings/6a4e890b285def00132c9454 |
| Reunião semanal (capacitação; papéis do fórum; YouTube) | 15/07/2026 | Transcrição tl;dv | tldv.io/app/meetings/6a57c3873cccda00133c5dd0 |
| Apresentação dos Sistemas (6 cards; centro de capacitação) | 27/07/2026 | Transcrição tl;dv | tldv.io/app/meetings/6a67aac053055e0013e7dcab |
| Reunião semanal (cadastrador; CPF; admin; Gov.br) | 11/08/2026 | Transcrição tl;dv | tldv.io/app/meetings/6a7b7137bf1c3500130ba312 |
| Reunião semanal (vídeos: biblioteca × capacitação) | 20/08/2026 | Transcrição tl;dv | tldv.io/app/meetings/6a87396db94104001376d10e |
| Apresentação Plataformas LILP (demo completa; Gov.br; TCE/PGE; governança) | 26/08/2026 | Transcrição tl;dv | tldv.io/app/meetings/6a8ed5387d95ad00133d4bcb |
| Thread "Agendamento de reunião - normatização" (Lina: "o que precisamos para construir a Plataforma") | 12–20/02/2026 | E-mail | Outlook |
| E-mail "Necessidades de TI - Laboratório" (Bernardo) | 19/08/2026 | Diagnóstico de TI | Outlook |
| Teams — grupo do Laboratório (testes 11/03; procurador 30/03; UASGs 04/02; MOOC 10/03; lições aprendidas 21/01) | jan–mar/2026 | Mensagens | Teams |
| Repositório oficial (README + CLAUDE.md) | 26/08/2026 | Código/as-is | github.com/Laboratorio-LILP/rede-estadual-compras-publicas |
| Mapa de Contexto Operacional v2.22 | 26/08/2026 | Estado do trabalho | Vault LILP |
| Todoist — sub-projeto RECPSP (4 tarefas abertas; instrução da Lina de 02/07) | ago/2026 | Tarefas | Todoist |
| ADR-001/002/004/005/006 | 2026 | Padrões e segurança | Vault LILP |

**Lacunas conhecidas:** a reunião "Ideias RECPSP" (04/02) e as reuniões de fevereiro/março não têm gravação no tl;dv (cobertura começa em 29/05); o conteúdo delas chega por via documental (DESCRIÇÃO RECPSP, e-mails, Teams). As respostas do formulário aos órgãos (planilha de 27/02) não foram analisadas neste documento — insumo para dimensionamento e priorização de capacitação.

## 14. Próxima ação

Validar este documento com a equipe (reunião semanal de 27/08 ou seguinte), decidir os pontos da seção 12 — em especial governança da ferramenta e banco de produção — e usar a seção 8 como plano de fechamento da v1.
