# Gestrato

Sistema de **gestão de cobrança** para loteadoras e incorporadoras que vendem lotes parcelados
diretamente ao comprador, sem financiamento bancário.

Quem vende lote parcelado não tem um problema de contrato: tem um problema de **recebimento**.
São centenas de parcelas mensais, cada uma com vencimento próprio, multa, juros, carência,
reajuste anual e acordos no meio do caminho — e uma planilha não avisa ninguém que a parcela
venceu ontem. O Gestrato existe para responder, todo dia, três perguntas:

1. **Quem vence hoje?**
2. **Quem está em atraso, há quantos dias e quanto deve, já atualizado?**
3. **Quem já foi avisado, por qual canal e quando?**

Em volta disso ficam os cadastros mínimos (loteamento, quadra, lote, cliente, contrato), a baixa
de pagamentos, a emissão de boleto/Pix, a renegociação de saldo em atraso e os relatórios de
inadimplência, recebimentos e fluxo previsto.

**Não é** um CRM de vendas, nem um ERP de obra, nem um sistema de assinatura de contrato.

---

## Sumário

- [Arquitetura](#arquitetura)
- [Decisões de modelagem](#decisões-de-modelagem)
- [Como rodar](#como-rodar)
- [Testes](#testes)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Gateway de cobrança](#gateway-de-cobrança-boletopix)
- [Estado atual](#estado-atual)

---

## Arquitetura

Monorepo simples, sem ferramenta de workspace:

```
gestrato/
├── docker-compose.yml      Postgres para desenvolvimento
├── api/                    Node.js + TypeScript (Express + Prisma)
│   ├── prisma/
│   │   ├── schema.prisma   modelo de dados
│   │   └── seed.ts         massa de demonstração idempotente
│   └── src/
│       ├── domain/         regras de negócio puras
│       ├── application/    casos de uso + portas
│       ├── infrastructure/ Prisma, gateway de boleto/Pix, mensageria, segurança
│       └── interfaces/http/ Express: rotas, controllers, apresentadores, middlewares
├── web/                    React + Vite + TypeScript
└── docs/contrato-da-api.md contrato REST — fonte de verdade entre api/ e web/
```

### As quatro camadas da API

**`domain/`** — o coração. Entidades (`Contrato`, `Parcela`, `Cobranca`, `Renegociacao`) e
objetos de valor (`Dinheiro`, `DataCivil`, `CpfCnpj`, `Percentual`, `PoliticaDeEncargos`).
Não importa Express, não importa Prisma, não importa `process.env`, não sabe o que é HTTP nem
o que é uma tabela. É onde vive o cálculo de multa e juros, a geração do plano de parcelas, a
decisão de quando uma parcela está vencida e as regras da régua de cobrança.

**`application/`** — um caso de uso por arquivo (`criar-contrato`, `registrar-baixa`,
`executar-regua`, `renegociar-contrato`...). Orquestra entidades e fala com o mundo externo
**apenas por interfaces** declaradas em `application/ports/`: `RepositorioDeContratos`,
`GatewayDeCobranca`, `Mensageria`, `Relogio`, `UnidadeDeTrabalho`. Nenhum caso de uso conhece
Prisma ou o nome de um banco.

**`infrastructure/`** — as implementações concretas dessas portas: repositórios Prisma e
*mappers* que traduzem linha de tabela ⇄ entidade, o adaptador de boleto/Pix, a mensageria, o
hash de senha e o JWT, o relógio do sistema, a leitura de variáveis de ambiente.

**`interfaces/http/`** — a borda. Express, validação de entrada com Zod, autenticação por JWT,
autorização por papel, tradução de erro de domínio para status HTTP e apresentadores que montam
o JSON exatamente como o contrato descreve.

### A regra de dependência

As setas apontam sempre para dentro:

```
interfaces/http  →  application  →  domain
                        ↑
                 infrastructure
```

`domain` não depende de ninguém. `application` depende só de `domain` e das próprias portas.
`infrastructure` e `interfaces` dependem de `application` e `domain` — nunca o contrário.
A inversão acontece nas portas: quem define a interface é quem a usa (o caso de uso), não quem
a implementa (o Prisma).

**Por que isso importa aqui, concretamente:** a loteadora ainda não escolheu com qual banco
vai emitir boleto. Quando escolher — Asaas, Cora, Banco Inter, Sicredi —, entra uma classe nova
em `infrastructure/gateways/` implementando `GatewayDeCobranca` e troca-se uma linha na
composição. O cálculo de mora, o extrato do contrato, a régua de cobrança e os testes de domínio
não mudam **uma linha**. O mesmo vale para trocar Postgres por outro banco, ou o console de
mensagens por Twilio/Meta Cloud API.

O front-end é organizado por assunto (`paginas/`, `componentes/<área>/`, `ganchos/`,
`lib/api/`), fala com a API pelo cliente HTTP em `web/src/lib/http.ts` e não guarda regra de
cálculo financeiro: valor atualizado, situação da parcela e posição do contrato vêm prontos da
API, para não existirem duas verdades sobre o mesmo número.

---

## Decisões de modelagem

Coisas que parecem detalhe e não são:

**Dinheiro em centavos inteiros.** Todo valor monetário é `Int` com sufixo `Centavos`, nunca
`Float`/`Decimal` de ponto flutuante. `0.1 + 0.2 !== 0.3` é engraçado num tutorial e é prejuízo
num sistema de cobrança. Toda a aritmética passa pelo objeto de valor `Dinheiro`, com
arredondamento *half-up* (a convenção brasileira). O rateio (`Dinheiro.ratear`) garante que a
soma das parcelas seja **exatamente** o valor financiado: os centavos que sobram são
distribuídos nas últimas parcelas, nunca descartados.

**Datas de negócio sem fuso.** "Vence dia 10" é um fato do calendário, não um instante no tempo.
Se guardássemos `DateTime`, um servidor em UTC exibiria dia 09 para um cliente em
`America/Sao_Paulo`. Por isso vencimento, data de pagamento, data de assinatura e afins usam
`@db.Date` no Prisma e o objeto de valor `DataCivil` (ano/mês/dia) no domínio — materializado
como `Date` em meia-noite **UTC** só na borda da persistência. Já carimbos de auditoria
(`criadoEm`, `enviadaEm`) são instantes de verdade e continuam `DateTime`.

**"Vencida" e "inadimplente" são derivados, não gravados.** Não existe coluna `vencida` na
tabela de parcelas, nem `inadimplente` no contrato. Uma parcela está vencida quando está em
aberto e o vencimento é anterior à data de referência — ponto. Gravar esse estado exigiria um
job varrendo o banco à meia-noite, e qualquer falha desse job produziria dados mentindo sobre a
carteira. O que se grava é o que foi **decidido** (valor, vencimento) e o que **aconteceu**
(baixas); a situação é calculada sob demanda, sempre em relação a uma data explícita — por isso
quase toda consulta aceita `?data=`, o que também torna o comportamento testável.

**Chave de idempotência na régua de cobrança.** Cada cobrança enviada grava
`chaveDeIdempotencia = parcelaId:GATILHO:dias`, com índice único. Se a régua rodar duas vezes no
mesmo dia — cron duplicado, retry, execução manual depois da automática —, a segunda tentativa
esbarra na chave e não reenvia. O cliente inadimplente já está estressado; receber a mesma
mensagem quatro vezes destrói a relação. O mesmo princípio vale na emissão de documentos (a
chave vai para o provedor) e no webhook de conciliação (evento repetido responde `200` e não
dá baixa duas vezes).

**Histórico de cobrança é prova.** A tabela `cobrancas` guarda o texto exato enviado, o canal, o
destino, o valor cobrado e o carimbo de envio. Em discussão de rescisão, a pergunta "vocês me
avisaram?" precisa de resposta documentada.

---

## Como rodar

Pré-requisitos: **Node.js 20+**, **npm** e **Docker** (só para o Postgres).

### 1. Banco de dados

Na raiz do projeto:

```bash
docker compose up -d
```

Sobe um Postgres 16 em `localhost:5432` (usuário `gestrato`, senha `gestrato`, base `gestrato`),
com volume nomeado — os dados sobrevivem a `docker compose down`. Para apagar tudo e recomeçar:
`docker compose down -v`.

Se você já tem um Postgres ocupando a 5432, mude o mapeamento no `docker-compose.yml` para
`"5433:5432"` e ajuste a porta no `DATABASE_URL`.

### 2. API

```bash
cd api
cp .env.example .env      # no Windows: copy .env.example .env
npm install
npx prisma migrate dev    # cria o schema no banco (e a pasta prisma/migrations na 1ª vez)
npm run seed              # popula com a régua padrão, modelos de mensagem e massa de demonstração
npm run dev               # sobe a API em http://localhost:3333
```

> Na primeira execução ainda não existe `api/prisma/migrations/`: o `prisma migrate dev` cria a
> migração inicial a partir do `schema.prisma` e a aplica. Da segunda vez em diante ela é só
> aplicada. Em servidor, use `npm run prisma:deploy` (`prisma migrate deploy`), que aplica
> migrações já versionadas sem gerar nada novo.

### 3. Front-end

Em outro terminal:

```bash
cd web
npm install
npm run dev               # http://localhost:5173
```

O Vite faz proxy de `/api` para `http://localhost:3333`, então não há URL de API para configurar
em desenvolvimento.

### 4. Entrar

O seed cria um usuário por papel. Credenciais de desenvolvimento (**troque em produção**):

| Papel | E-mail | Senha |
| --- | --- | --- |
| `ADMINISTRADOR` | `admin@gestrato.local` | `admin123` |
| `FINANCEIRO` | `financeiro@gestrato.local` | `financeiro123` |
| `VENDEDOR` | `vendas@gestrato.local` | `vendas123` |
| `CONSULTA` | `consulta@gestrato.local` | `consulta123` |

O e-mail e a senha do administrador saem de `SEED_ADMIN_EMAIL` / `SEED_ADMIN_SENHA`.

### O que o seed cria

`npm run seed` é **idempotente**: todo registro tem id derivado da chave de negócio e todo insert
é `upsert`. Rodar duas vezes não duplica nada.

- 4 usuários (um por papel);
- a **régua de cobrança padrão**: 5 e 1 dia antes do vencimento, no vencimento, 1, 5, 10 e 30 dias
  depois, cada etapa com seus canais;
- 4 **modelos de mensagem** (`lembrete`, `vencimento`, `atraso`, `atraso_grave`) em português,
  com as variáveis do contrato da API (`{{primeiroNome}}`, `{{valorAtualizado}}`, `{{pix}}`...);
- 2 loteamentos (Marília/SP e Rio Verde/GO), 3 quadras cada, 10 lotes por quadra;
- 12 clientes com CPF válido (dígitos verificadores calculados), 2 corretores;
- 10 contratos assinados nos últimos 24 meses, com entrada e de 24 a 120 parcelas mensais, com
  **todas** as parcelas geradas e a soma batendo exatamente com o valor do contrato;
- um cenário de cobrança de verdade: a maior parte das parcelas vencidas já baixada (com o
  `Pagamento` correspondente) e **3 contratos inadimplentes** com atrasos de ~3, ~20 e ~75 dias,
  além de duas parcelas vencendo na data de referência — assim o dashboard, o relatório de aging
  e a régua já nascem com dados para exercitar.

A data de referência do cenário é fixa (`2026-07-28`, ajustável por `SEED_DATA_REFERENCIA`),
justamente para os atrasos serem sempre os mesmos e o seed continuar determinístico.

---

## Testes

```bash
cd api
npm test          # tsx --test test/**/*.test.ts (runner nativo do Node)
npm run check     # tsc --noEmit: checagem de tipos de toda a API
```

Os testes cobrem o domínio — que é onde mora o risco financeiro: aritmética de `Dinheiro`,
`DataCivil`, validação de CPF/CNPJ, geração do plano de parcelas, cálculo de multa e juros,
transições de estado da parcela e do contrato e a decisão da régua de cobrança. São testes
puros, sem banco e sem HTTP: rodam em milissegundos porque o domínio não depende de nada.

No front-end:

```bash
cd web
npm run checar-tipos
```

---

## Variáveis de ambiente

Todas da API, lidas uma única vez na subida por `src/infrastructure/config/ambiente.ts` — a
aplicação falha imediatamente se faltar alguma obrigatória, em vez de descobrir no meio de um
ciclo de cobrança. Copie de `api/.env.example`.

| Variável | Padrão | Para que serve |
| --- | --- | --- |
| `DATABASE_URL` | — (**obrigatória**) | Conexão do Postgres. Precisa casar com o `docker-compose.yml`. |
| `JWT_SECRET` | `desenvolvimento-inseguro` | Segredo de assinatura do token. **Troque em produção.** |
| `JWT_EXPIRES_IN` | `8h` | Validade do token — uma jornada de trabalho. |
| `PORT` | `3333` | Porta da API. |
| `CORS_ORIGIN` | `http://localhost:5173` | Origem liberada para o front-end. |
| `COBRANCA_GATEWAY` | `fake` | Adaptador de boleto/Pix. Hoje só existe `fake`. |
| `MENSAGERIA_PROVIDER` | `console` | Canal de envio. Hoje só existe `console`. |
| `TZ_NEGOCIO` | `America/Sao_Paulo` | Fuso usado para decidir que dia é "hoje" na régua. |
| `NOME_DA_EMPRESA` | `Gestrato Loteamentos` | Preenche `{{empresa}}` nas mensagens e o recebedor do Pix. |
| `URL_PUBLICA` | `http://localhost:5173` | Base do `{{link}}` de segunda via nas mensagens. |
| `EMAILS_DA_EQUIPE` | vazio | Quem recebe o resumo do ciclo diário, separados por vírgula. Vazio desliga o alerta. |
| `NODE_ENV` | `development` | Ambiente de execução. |
| `SEED_ADMIN_EMAIL` | `admin@gestrato.local` | E-mail do administrador criado pelo seed. |
| `SEED_ADMIN_SENHA` | `admin123` | Senha do administrador criado pelo seed. |
| `SEED_DATA_REFERENCIA` | `2026-07-28` | Data-base do cenário de demonstração do seed. |

O front-end não precisa de variável de ambiente em desenvolvimento (o proxy do Vite resolve).

---

## Gateway de cobrança (boleto/Pix)

**A loteadora ainda não escolheu o banco nem o gateway.** Essa decisão é comercial (tarifa por
boleto, convênio, prazo de repasse) e não estava tomada quando este sistema foi construído — e o
sistema foi desenhado para não ficar refém dela.

Hoje roda `COBRANCA_GATEWAY=fake`, o adaptador em
`api/src/infrastructure/gateways/gateway-fake.ts`. Ele mantém o fluxo inteiro exercitável de
ponta a ponta: emite documento com **linha digitável estruturalmente válida** (campos e dígitos
FEBRABAN) e **Pix copia-e-cola no formato BR Code**, aceita reemissão com valor atualizado,
cancelamento e interpretação de webhook de teste. O código do banco é `999` e a chave Pix é
`gestrato@exemplo.invalido`, exatamente para ficar evidente que **não é cobrança pagável**: nada
disso chega a um banco de verdade.

Para plugar um provedor real (Asaas, Cora, Banco Inter, Sicredi...):

1. crie uma classe em `api/src/infrastructure/gateways/` implementando a porta
   `GatewayDeCobranca` (`emitir`, `cancelar`, `consultar`, `interpretarWebhook`);
2. registre-a na composição, associada ao valor de `COBRANCA_GATEWAY`;
3. aponte o webhook do provedor para `POST /api/webhooks/cobranca/:provedor`.

**Nenhuma entidade, caso de uso ou teste de domínio muda.** O mesmo desenho vale para a
mensageria: `MENSAGERIA_PROVIDER=console` apenas registra a mensagem no terminal (o histórico
de cobrança é gravado normalmente, sem gastar crédito de WhatsApp nem mandar teste para cliente
de verdade); um provedor real é uma classe implementando a porta `Mensageria`.

---

## Estado atual

Projeto em desenvolvimento, versão `0.1.0`. Sendo honesto sobre o que existe:

### Pronto

- Domínio completo e testado: dinheiro, datas civis, CPF/CNPJ, plano de parcelas, política de
  encargos (multa, juros pro rata, carência), estados de parcela e contrato, régua de cobrança.
- Modelo de dados completo no Prisma, com os índices que sustentam os painéis de inadimplência.
- Casos de uso de cadastro, contrato (simulação, criação com geração de parcelas, extrato,
  reajuste, renegociação, quitação/cancelamento/distrato), baixa e estorno de parcela, emissão de
  documento, execução da régua, processamento de webhook e consultas de painel/relatórios.
- Camada HTTP com autenticação JWT, autorização por papel e tradução de erros de domínio para
  status HTTP.
- Front-end React com dashboard, lotes, clientes, contratos, parcelas, cobranças, régua e
  relatórios.
- Seed idempotente com massa de demonstração realista.
- Postgres em Docker para desenvolvimento.

### Em construção

A camada HTTP está sendo fechada: no momento em que este README foi escrito, existiam os
middlewares de autenticação e de tratamento de erros, os controllers de autenticação, cadastros e
contratos e as rotas de cadastros. As rotas restantes (parcelas, cobranças, régua, relatórios e
webhooks), o *bootstrap* com a composição de dependências (`src/index.ts`, usado por
`npm run dev`) e o job agendável da régua (`npm run job:cobranca`) ainda estavam sendo
finalizados. Confira o diretório `api/src/interfaces/http/rotas/` para o estado real antes de
apontar um cliente para um endpoint.

### Não existe (não prometemos o que não foi feito)

- **Integração bancária real.** Nenhum boleto emitido aqui é pagável; nenhum Pix cai em conta.
  Só o adaptador `fake` está implementado — ver a seção anterior.
- **Envio real de WhatsApp, SMS ou e-mail.** `MENSAGERIA_PROVIDER=console` escreve no terminal.
  Não há integração com Meta Cloud API, Twilio, Zenvia ou SES.
- **Conciliação bancária automática por CNAB/OFX.** A baixa é manual (ou por webhook do gateway
  fake). Não há leitura de arquivo de retorno.
- **Área do cliente.** O comprador não tem login, não vê o próprio extrato nem emite segunda via
  sozinho. Tudo passa pelo time interno da loteadora.
- **Emissão de documento fiscal, contabilidade, comissão paga a corretor.** O corretor é apenas
  cadastro e base do relatório de comissões; não há fluxo de pagamento.
- **Reajuste automático por índice.** O percentual do IGPM/IPCA/INCC é informado manualmente ao
  aplicar o reajuste; não há consulta a fonte oficial.
- **Assinatura eletrônica de contrato e geração de PDF do instrumento.**
- **Multi-empresa.** A instalação atende uma loteadora; não há separação por *tenant*.
- **Deploy.** Não há Dockerfile de produção, pipeline de CI nem infraestrutura provisionada. O
  `docker-compose.yml` sobe apenas o banco de desenvolvimento.
