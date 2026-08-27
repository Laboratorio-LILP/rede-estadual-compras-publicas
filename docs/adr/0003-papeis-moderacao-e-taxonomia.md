# ADR 0003 — Papéis, moderação e taxonomia do fórum

- **Status:** Aceito (2026-08-27), com dois pontos a confirmar com a coordenação da Rede (marcados abaixo).
- **Família:** ADR de repositório da RECPSP.
- **Contexto:** três incoerências do protótipo precisam de resposta antes do modelo de dados novo, porque cada uma é um campo que se cria ou não se cria. **Moderação:** o código só coloca em fila os tópicos com imagem ou vídeo; texto puro publica direto — enquanto a decisão registrada em 26/08 (Laís) é que todo tópico passe por curadoria. **Papel de especialista:** conceder especialidade grava `role = 'especialista'`, um quarto valor que a API não valida e que não concede permissão nenhuma; existe ainda a tabela `specialist_requests`, com fluxo completo de solicitação e nenhuma rota que a use. **Categorias:** o seed cria 11 categorias planas, enquanto o RF-FOR-01 e o documento "DESCRIÇÃO RECPSP" (Lina, 31/03) pedem organização pelo metaprocesso da contratação, na mesma lógica do Portal de Compras. Sem dado real para reclassificar, mudar agora é barato; depois do lançamento vira migração.

## Decisão

### 1. Moderação prévia total

Todo tópico novo nasce pendente e só se torna público após aprovação, independentemente de ter mídia e de quem o criou. Atende ao RF-FOR-03 e ao RNF-SEG-06.

A fila de curadoria é funcionalidade de primeira classe do painel, não um canto do admin: precisa de contagem visível, ordenação por espera e ação em lote.

> **A confirmar com a coordenação:** moderação total cria carga diária. Sem dono nomeado e escala definida, uma fila que ninguém esvazia mata o fórum mais rápido que qualquer defeito.

### 2. Especialista é selo, não papel de acesso

- **Papel de acesso** continua com três valores: `usuário`, `moderador`, `administrador`. O valor `especialista` sai do enum de papel.
- **Especialidade** é atributo separado, concedido por ato da administração, e se vincula a **duas coisas**: uma macroetapa do processo, ou um assunto transversal.
- O selo exibe o **termo específico** — "Especialista em Seleção do Fornecedor", "Especialista em Sustentabilidade e ODS" — nunca o rótulo genérico do grupo.
- **`specialist_requests` não nasce.** A concessão é por convite. Se houver autosserviço no futuro, ele entra como decisão própria.

### 3. Taxonomia herdada da Biblioteca Digital

A taxonomia da BDLP foi desenhada para reuso na Rede. São **três eixos independentes**, e um tópico pode ser classificado nos três.

**Eixo 1 — Categoria processual** (fonte: `docker/postgres/init/07-categories.sql` da BDLP, taxonomia v9). Seis macroetapas, com até três níveis:

| Macroetapa | Subcategoria | Microcategoria |
|---|---|---|
| Plano de Contratações Anual (PCA) | — | — |
| Ciclo Completo da Contratação | — | — |
| Planejamento/Fase Preparatória | ETP · TR · Gestão de Riscos · Pesquisa de Preços | *(sob Gestão de Riscos)* Mapa de Riscos · Matriz de Alocação de Riscos |
| Seleção do Fornecedor | Licitação · Contratação Direta · Procedimentos Auxiliares | *(sob Licitação)* Concorrência · Pregão · Leilão · Diálogo Competitivo — *(sob Contratação Direta)* Inexigibilidade · Emergência - Inciso VIII · Dispensa por Valor (Art 75 - incisos I e II) · Contratação Direta outros incisos — *(sob Procedimentos Auxiliares)* Credenciamento · Registro de Preços (RP) · Pré-qualificação · PMI · Registro Cadastral |
| Gestão Contratual | Gestão de Contratos · Fiscalização de Contratos | — |
| Conteúdos Transversais | — | — |

São **30 termos**: 6 macroetapas, 9 subcategorias e 15 microcategorias.

A ordem segue a Lei 14.133/2021: o PCA abre o ciclo anual (art. 12, VII), depois a fase preparatória (art. 18), a seleção (arts. 17, 28 e 72 a 78) e a gestão contratual (art. 117 e seguintes).

> **Correção de 27/08/2026 (execução da etapa 1).** A versão original desta tabela omitia as cinco microcategorias de *Procedimentos Auxiliares* e não dizia sob qual subcategoria cada microcategoria fica. O critério de pronto da etapa 1 é "os três eixos **idênticos aos da BDLP**", e a fonte canônica (`07-categories.sql`) as tem — então elas entram, e a tabela foi corrigida na mesma sessão, conforme a regra do `CLAUDE.md`. A implementação está em `apps/taxonomia/management/commands/seed_taxonomia.py`, com a lista canônica escrita uma segunda vez, à mão, em `backend/tests/test_taxonomia.py`.
>
> **Capitalização.** Na BDLP o eixo processual vem em caixa alta, herança da interface do Nou-Rau. Na RECPSP os termos usam a grafia desta tabela, que é a que vai para a tela. A identidade com a Biblioteca é preservada e **provada por teste**: `nome.upper() == termo_da_bdlp.upper()`, para os 30 termos. Assunto e natureza vão verbatim, inclusive "Catálogo eletrônico de Padronização" e "Compras Centralizadas/compartilhadas", que são assim na origem.

**Eixo 2 — Assunto.** Os 14 da BDLP: Aspectos Jurídicos e Regulatórios · Catálogo Eletrônico de Padronização · Compras Centralizadas/Compartilhadas · Controle, Auditoria e Combate à Corrupção · Gestão de Competências · Governança · Inovação e Tecnologia · Integridade · Logística e Gestão de Suprimentos · Micro e Pequenas Empresas · Sanções Administrativas · Sustentabilidade e ODS · Transparência · Uso de Sistemas.

Mais os termos pedidos diretamente pela Lina na DESCRIÇÃO RECPSP e sem equivalente na BDLP: **Metaprocesso · Fluxo · Mapeamento de Processos · Documentação · Modelos**.

> **Observação para a coordenação, não recusa:** cinco desses termos descrevem tipo de material (Documentação, Modelos) ou a própria navegação (Metaprocesso, Fluxo, Mapeamento de Processos), e não assunto. É a mesma dúvida que a Lina registrou no documento de origem — "veja a proposta de Tags, se fica coerente com as categorias… Não sei bem a diferença". Entram como assunto; se a coordenação preferir tratá-los como tag ou como seção de navegação, a mudança é barata enquanto não houver conteúdo real.

**Eixo 3 — Natureza.** Cinco valores da BDLP: Contratação de Materiais · Contratação de Obras e Serviços de Engenharia · Contratação de Serviços · Contratação de TIC · Não se aplica.

É neste eixo que "Obras Públicas" — categoria do protótipo e item da lista da Lina — encontra lugar, como *Contratação de Obras e Serviços de Engenharia*. Não é assunto: é o que está sendo contratado.

## Consequências

- O modelo de papéis passa a dizer a mesma coisa que o código faz. A incoerência dos quatro valores desaparece.
- A especialidade ganha significado navegável: quem procura ajuda sobre pregão encontra quem é especialista em Seleção do Fornecedor.
- A taxonomia é a mesma da Biblioteca, então busca, recomendação e integração entre as duas plataformas passam a ser possíveis sem tradução (RF-BUS-01, RF-INT-03).
- O formulário de criação de tópico fica mais longo: três eixos em vez de uma lista. Mitigar com valor sugerido e preenchimento progressivo — a categoria processual é obrigatória, assunto e natureza são opcionais.
- Hierarquia de três níveis exige governança de vocabulário. Sem dono, em um ano há sessenta categorias e ninguém acha nada.
- As perguntas 11, 13, 14, 15 e 16 do `docs/QUESTIONS.md` ficam decididas por este ADR e migram para a seção "Decididas".
