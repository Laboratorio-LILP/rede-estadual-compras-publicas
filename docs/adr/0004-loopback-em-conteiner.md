# ADR 0004 — Como o loopback do ADR-004 se realiza em contêiner

- **Status:** Aceito (2026-08-27).
- **Família:** ADR de repositório da RECPSP. Registra uma **divergência consciente** entre a letra do ADR-004 transversal (atualização de 27/08) e a implementação da etapa 0. Pede nota cruzada no ADR-004 da vault.
- **Contexto:** o ADR-004 transversal determina que toda porta seja publicada em loopback e acrescenta, sobre o servidor de front:

  > "O padrão de fábrica do Vite em contêiner é publicar em `0.0.0.0` (…). É preciso desligar isso explicitamente na configuração — **não basta mapear a porta para loopback no Compose, porque o processo continua escutando em todas as interfaces dentro da rede do Compose**."

  A execução da etapa 0 mostrou que a segunda metade dessa frase não é realizável para um processo **containerizado**, e que a primeira, se aplicada ao pé da letra, quebra o ambiente.

## O fato técnico

O encaminhamento de porta do Docker entrega a conexão pela **interface de rede do contêiner** (`eth0`), não pelo loopback dele. Um processo preso a `127.0.0.1` *dentro* do contêiner só aceita conexões originadas no próprio contêiner: a publicação `127.0.0.1:5173:5173` deixa de alcançá-lo e a porta responde recusa de conexão. Vale igualmente para o `runserver` do Django e para qualquer servidor em contêiner — não é peculiaridade do Vite.

A prescrição do ADR-004 descreve corretamente o risco do Vite rodando **direto no host**, onde `host: true` o expõe à rede local. Containerizado, o risco muda de lugar.

## Decisão

**A garantia de loopback é a publicação no host; a ligação dentro do contêiner é `0.0.0.0`, declarada explicitamente e comentada.**

1. Toda porta é publicada como `127.0.0.1:<porta>:<porta>` no `docker/docker-compose.dev.yml`. É esta linha — e só ela — que impede alcance pela rede.
2. O padrão do `vite.config.ts` é `127.0.0.1`, para quem rodar o Vite fora de contêiner. O Compose o troca por `0.0.0.0` por variável de ambiente (`RECPSP_WEB_HOST`), com o motivo escrito ao lado.
3. Nenhum serviço da base nova é alcançável pela rede local. Verificação de aceite, executada em 27/08 e repetível:

   ```
   docker ps --format '{{.Names}}\t{{.Ports}}'   # tudo com prefixo 127.0.0.1
   netstat -an -p tcp | grep -E '\.(8004|5434|5173)\b' | grep LISTEN
   ```

   A segunda linha precisa mostrar `127.0.0.1.<porta>` — nunca `*.<porta>`.

## Sobre o resíduo que o ADR-004 aponta

Sobra o que a frase do ADR-004 de fato descreve: dentro da rede do Compose, um contêiner alcança o outro. Isso é **inerente** ao Compose e é o que faz o repasse `/api` do Vite para o Django funcionar. A rede é privada ao projeto, só sobem nela os três serviços da própria frente, e nada dela é alcançável de fora sem publicação. O risco residual é de outro serviço **do mesmo projeto** falar com o servidor de front — o que é precisamente o desenho pretendido.

Se um dia for preciso fechar também esse caminho, o mecanismo é `internal: true` numa rede separada, não a ligação em `127.0.0.1`.

## Por que não as alternativas

- **Prender o Vite a `127.0.0.1` dentro do contêiner e não publicar a porta** cumpre a letra do ADR e entrega um ambiente que ninguém consegue abrir no navegador.
- **`network_mode: host`** faria a ligação em `127.0.0.1` valer para o host, mas não existe no Docker Desktop do macOS, que é a máquina principal (ADR-002), e exporia todas as portas do contêiner de uma vez.
- **Reescrever o ADR-004 transversal aqui** seria decidir por fora do escopo: a correção pertence à vault e vai como proposta, não como fato consumado.

## Consequências

- A intenção do ADR-004 — nada da frente alcançável pela rede — está cumprida e é **verificável por comando**, não por declaração.
- A letra do ADR-004 precisa de correção. Fica a proposta de nota na atualização de 27/08 do ADR-004 da vault, substituindo a frase citada por: *"toda porta publicada em `127.0.0.1`; em contêiner, a ligação interna é `0.0.0.0` por necessidade do encaminhamento de porta, e é a publicação que garante o loopback"*.
- Quem ler só o ADR-004 e for conferir o `vite.config.ts` vai achar que a regra foi ignorada. Este registro existe para responder a essa leitura.
- O mesmo raciocínio vale para o `runserver` do Django em `0.0.0.0:8004` e valerá para BDLP e PESCP quando migrarem para o ADR-008.

## Critério de revisão

Reavaliar se:

- O ADR-004 transversal for corrigido — então este registro vira remissão e pode encolher.
- O ambiente de desenvolvimento deixar de ser containerizado (revogação do ADR-008), quando a prescrição original volta a valer literalmente.
- Passar a existir mais de uma frente na mesma rede do Compose, quando o risco residual acima deixa de ser teórico e a rede `internal` entra em pauta.
