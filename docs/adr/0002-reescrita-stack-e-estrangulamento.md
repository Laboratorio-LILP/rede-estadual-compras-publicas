# ADR 0002 — Reescrita: stack e estratégia de transição

- **Status:** Aceito (2026-08-27).
- **Família:** ADR de repositório da RECPSP.
- **Contexto:** o repositório foi importado em 26/08/2026 do protótipo de Eduardo Cappia, com os 85 commits originais e autoria preservada. O que ele entrega é um protótipo funcional, não uma base de produção. O front está sobre Create React App, que o time do React encerrou oficialmente em 14/02/2025; a cadeia de desenvolvimento carrega duas vulnerabilidades críticas sem correção não destrutiva. O back é um arquivo único de 1.937 linhas com SQL embutido nas rotas, que impede trabalho paralelo por construção. A auditoria de 26 e 27/08 mediu o custo de manter o front por cópia: 268 cores escritas à mão, 22 botões primários em 15 formas, zero tratamento de teclado em 8.215 linhas. E a restrição central do laboratório é a capacidade de engenharia concentrada numa pessoa — manter duas stacks (Node e Python) é o risco número um do próprio Documento de Requisitos.

## Decisão

**Reescrever a plataforma**, com a stack alinhada à Biblioteca Digital:

- **Back:** Django + PostgreSQL, organizado em aplicações por domínio.
- **Front:** React + Vite + TypeScript, sobre o design system do ADR-007 transversal.
- **Ambiente:** contêiner, conforme o ADR-008 transversal.

**O que se preserva do trabalho do Eduardo:** o conceito, o layout, a hierarquia das telas e os fluxos validados pela equipe — a home agregadora com os cards decididos em 27/07, o centro de capacitação, o comportamento do fórum demonstrado em 26/08 — e os ativos institucionais de `public/`. Cor e tipografia seguem o ADR-007, que corrige o contraste sem mudar a identidade. **A reescrita é da fundação técnica, não do produto.**

**O que se descarta:** o código, a ferramenta de build e o banco (ADR 0001).

**Transição por construção ao lado, com corte único:**

- A base herdada continua no ar como demonstração enquanto a nova é construída.
- Enquanto convivem, cada geração ocupa seu próprio subcaminho (ADR-005 transversal, atualização de 27/08).
- O corte é único, quando a equipe validar. Não há migração de dados a fazer.
- Ordem de construção: **Capacitação primeiro**, por ser a exigência da v1 (seção 8 do Documento de Requisitos).

## Conformidade com o ADR-006 transversal

O regime de segurança da CTI não admite exceção e a reescrita não pede nenhuma:

1. Desenvolvimento local, sem acesso a servidor — a stack inteira roda em contêiner na máquina.
2. A demonstração e a versão nova vivem **na homologação, acessíveis só por VPN**. Nenhum túnel, nenhuma exposição alternativa, em nenhuma hipótese.
3. Subida por esteira GitHub Actions; a cadência de uma vez ao dia ou por semana é o teto do ciclo de teste.
4. Repositório na org `Laboratorio-LILP`; migração para o Git corporativo quando existir.
5. **O corte único é operação no servidor** — passo da esteira ou solicitação formal à TI. Não é executável pelo desenvolvedor.
6. Sem PowerShell.
7. A vedação de usar IA para contornar barreira de segurança vale para toda sessão de agente neste repositório.
8. Produção pela PRODESP.

## Consequências

- Uma stack a manter no lugar de duas, atacando a restrição central do laboratório.
- As duas vulnerabilidades críticas da cadeia do Create React App desaparecem com ele.
- O back modular destrava trabalho paralelo, que o arquivo único impedia (`ARCHITECTURE.md`, seção 10).
- Custo político: para quem viu a demonstração de 26/08, "vamos reescrever" lê como andar para trás. O plano precisa deixar explícito que o produto validado se mantém.
- Custo técnico: o bug conhecido de Django atrás do roteador `index.php` no ambiente on-premise passa a bloquear duas frentes (ADR-001 transversal, atualização de 27/08). Tratá-lo antes da primeira subida.
- A rotação da chave do YouTube exposta **não** é resolvida pela reescrita: o histórico importado é preservado. Segue como pendência P1.
- Os 44 testes atuais deixam de ser portão de corte e passam a valer como registro das regras de negócio, a traduzir para o modelo novo.
