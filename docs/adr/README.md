# ADRs da RECPSP

Registros de Decisão de Arquitetura **desta frente**. Cada decisão com peso estrutural vira um arquivo numerado, com contexto, decisão e consequências, para que daqui a meses se saiba *por que* algo foi feito assim.

## Duas famílias

Esta pasta guarda os ADRs **de repositório** (`000N`), que valem para a RECPSP. Os ADRs **transversais** do laboratório (`ADR-NNN`) vivem na vault, em `SGGD - SEGES - LILP/ADR/`, e valem para todas as frentes. Um pode substituir orientação do outro, sempre com nota cruzada dos dois lados.

A numeração é local: o `0001` daqui não tem relação com o `ADR-001` da vault.

## Registros

| ID | Título | Status | Data |
|---|---|---|---|
| [0001](0001-banco-de-producao.md) | Banco de produção: PostgreSQL | Aceito | 2026-08-27 |
| [0002](0002-reescrita-stack-e-estrangulamento.md) | Reescrita: stack e estratégia de transição | Aceito | 2026-08-27 |
| [0003](0003-papeis-moderacao-e-taxonomia.md) | Papéis, moderação e taxonomia do fórum | Aceito | 2026-08-27 |
| [0004](0004-loopback-em-conteiner.md) | Como o loopback do ADR-004 se realiza em contêiner | Aceito | 2026-08-27 |

## Transversais que restringem esta frente

| ID | O que impõe |
|---|---|
| ADR-001 | A RECPSP é Trilho A: contêineres Docker. |
| ADR-002 | Clone fora do OneDrive; nunca empurrar para o `upstream`. |
| ADR-004 | Nome `lilp-recpsp`; portas 8003, 8004, 5434 e 5173, todas em loopback. **Divergência registrada no [0004](0004-loopback-em-conteiner.md):** em contêiner, o loopback é garantido pela publicação no host, não pela ligação interna do processo. |
| ADR-005 | Limpo para subcaminho; admin isolado. |
| ADR-006 | Dev local sem servidor; homologação só por VPN; sem túnel; corte pela esteira ou por solicitação à TI. |
| ADR-007 | Tokens GESP, piso eMAG 3.1 + WCAG 2.0 AA com critério de aceite. |
| ADR-008 | Ambiente de desenvolvimento em contêiner; Makefile como porta de entrada. |
