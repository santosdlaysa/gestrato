# Módulo de Fluxo de Caixa (Tesouraria)

Substitui as planilhas de controle financeiro (`CONTROLE FINANCEIRO REAL.xlsx` e
`Controle Financeiro Orçamentário.xlsx`) por telas no sistema: saldos por banco,
recebíveis, aportes de sócios, despesas por empreendimento e comparativo
**orçado × realizado**.

A cobrança (contratos, parcelas, régua, WhatsApp) **já existia** — este módulo é o
controle de caixa que faltava em volta dela.

## Decisões de escopo

- Entrega **em fases** (cada fase é verificável antes da próxima).
- Mantém **orçado e realizado** (as duas planilhas).
- **Recebíveis de venda** entram no painel como **total do mês, sem separar por
  banco** — o sistema já os deriva das parcelas/baixas; não se redigita.
- Bancos e sócios são **fixos** (não genéricos), vindos das planilhas.

## Fases

| Fase | Entrega | Estado |
| --- | --- | --- |
| **0** | Cadastros-base: contas bancárias, sócios, empreendimentos, categorias | **Concluída** |
| 1 | Lançamentos realizados (despesas/aportes/transferências) + extrato por conta | Pendente |
| 2 | Orçamento previsto (grade mensal por categoria/empreendimento) | Pendente |
| 3 | Painel consolidado (meses × rubricas, por banco, orçado × real) | Pendente |

Na Fase 3 as telas hoje marcadas como *"módulo indisponível"* (Caixa,
Movimentações, Fluxo de caixa) passam a ter dados reais.

## Fase 0 — o que foi entregue

### Modelo de dados (`api/prisma/schema.prisma`)

Quatro tabelas novas + dois enums (migration `20260731080000_fluxo_de_caixa_cadastros`):

- `contas_bancarias` — `{ nome, instituicao, agencia, numero, saldoInicialCentavos, ativa }`.
  O saldo corrente **não** é gravado: nasce do saldo inicial + lançamentos (mesma
  decisão de "estado derivado" das parcelas/inadimplência).
- `socios_aportadores` — `{ nome, documento, ativo }`.
- `empreendimentos_financeiros` — `{ nome, loteamentoId?, ativo }` (centro de custo;
  `loteamentoId` liga opcionalmente a um loteamento existente).
- `categorias_financeiras` — `{ nome, tipo, natureza, ordem, ativa }` (plano de rubricas).
  - `TipoLancamentoFinanceiro`: `ENTRADA | SAIDA`.
  - `NaturezaFinanceira`: `RECEBIVEL_VENDA | APORTE | TRANSFERENCIA | DESPESA_FIXA |
    DESPESA_VARIAVEL | CUSTO_OBRA | OUTRO`.

### API

Rotas em `api/src/interfaces/http/rotas/fluxo-de-caixa.rotas.ts` (padrão enxuto, igual
a contas-a-pagar). Contrato completo em [`contrato-da-api.md`](./contrato-da-api.md)
→ seção **Fluxo de caixa (tesouraria)**.

### Front-end

`web/src/paginas/FluxoDeCaixa.tsx` — um componente genérico `CadastroFinanceiro` e
quatro telas (listar, criar, editar, ativar/desativar). Menu em **Financeiro → Fluxo
de caixa**.

### Seed

`npm run seed:fluxo` popula **só** estes cadastros (idempotente, id determinístico):
3 contas (Sicoob, Sicredi RR, Sicredi Dracena), 4 sócios (Portres Urbanismo, Poyales,
Anne 1506, MBS), 5 empreendimentos (Roraima Habitacional — Sede; Eldorado I/II/do
Norte; Residencial Eldorado III) e 59 categorias.

> **Importante:** `npm run seed` (completo) injeta massa de demonstração e **não deve**
> rodar contra um banco com dados reais. Use `npm run seed:fluxo`. A lógica e os dados
> ficam em `api/prisma/dados/fluxo-de-caixa.ts` (fonte única, chamada pelos dois seeds).

## Operação — banco de dados

O `api/.env` aponta o `DATABASE_URL` para um **Postgres remoto no Render** (base
`nextlote`, com dados reais), não para o Docker local. Portanto:

- migrations: **sempre** `npm run prisma:deploy` (`migrate deploy`) — nunca
  `migrate dev` (pode pedir reset e apagar dados);
- seed: **sempre** o isolado (`npm run seed:fluxo`);
- o build do Render gera o Prisma Client via `postinstall`/`build` do `api/package.json`.
