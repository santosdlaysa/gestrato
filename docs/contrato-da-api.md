# Contrato da API — Gestrato

Fonte de verdade compartilhada entre a API (`api/`) e o front-end (`web/`).

## Convenções

- Base: `http://localhost:3333/api`
- Autenticação: `Authorization: Bearer <token>` em tudo, exceto `POST /auth/login` e `POST /webhooks/*`.
- **Dinheiro**: sempre inteiro em centavos, em campos com sufixo `Centavos`. Nunca float.
- **Datas de negócio** (vencimento, pagamento, assinatura): string `"AAAA-MM-DD"`.
- **Carimbos de auditoria** (`criadaEm`, `enviadaEm`): ISO 8601 completo em UTC.
- Paginação: `?pagina=1&porPagina=25` → `{ itens: [...], total, pagina, porPagina, totalDePaginas }`.
- Erro: HTTP 4xx/5xx com corpo `{ "erro": { "tipo": "ErroDeValidacao", "mensagem": "...", "detalhes": [...] } }`.
  - `ErroDeValidacao` → 422 · `ErroDeRegraDeNegocio` → 409 · `ErroNaoEncontrado` → 404
  - `ErroDeConflito` → 409 · `ErroDeAutorizacao` → 403 · não autenticado → 401

## Papéis

`ADMINISTRADOR` (tudo) · `FINANCEIRO` (cobrança, baixa, régua) · `VENDEDOR` (cadastros e contratos, sem baixa) · `CONSULTA` (somente leitura).

## Autenticação

| Método | Rota | Corpo / Resposta |
| --- | --- | --- |
| POST | `/auth/login` | `{ email, senha }` → `{ token, usuario: { id, nome, email, papel } }` |
| GET | `/auth/eu` | → `{ id, nome, email, papel }` |

## Cadastros de suporte

| Método | Rota | Observação |
| --- | --- | --- |
| GET/POST | `/clientes` | filtros `?busca=&ativo=` |
| GET/PUT | `/clientes/:id` | |
| GET/POST | `/loteamentos` | |
| GET/POST | `/loteamentos/:id/quadras` | |
| GET/POST | `/lotes` | filtros `?loteamentoId=&quadraId=&situacao=` |
| GET/PUT | `/lotes/:id` | |
| GET/POST | `/corretores` | |

`Cliente`: `{ id, nome, documento, documentoFormatado, tipoPessoa, email, telefone, whatsapp, dataNascimento, endereco: { logradouro, numero, complemento, bairro, cidade, uf, cep }, observacoes, ativo }`

`Lote`: `{ id, quadraId, quadra, loteamentoId, loteamento, numero, areaEmMetrosQuadrados, valorDeTabelaCentavos, situacao, descricao }`

## Contratos

| Método | Rota | Descrição |
| --- | --- | --- |
| POST | `/contratos/simular` | Prévia do plano **sem salvar**. Mesmo corpo do POST `/contratos`. |
| POST | `/contratos` | Cria o contrato e **gera todas as parcelas** na mesma transação. |
| GET | `/contratos` | `?busca=&status=&situacao=&clienteId=&loteamentoId=&pagina=&porPagina=` |
| GET | `/contratos/:id` | Contrato + cliente + lote + `posicao`. |
| GET | `/contratos/:id/extrato` | `?data=` — parcelas com situação e demonstrativo atualizado. |
| PATCH | `/contratos/:id` | `{ observacoes?, politicaDeEncargos? }` |
| POST | `/contratos/:id/quitar` | Só se não houver parcela em aberto. |
| POST | `/contratos/:id/cancelar` | Libera o lote. |
| POST | `/contratos/:id/distratar` | Libera o lote. |
| POST | `/contratos/:id/reajuste` | `{ indice, percentual, aPartirDe }` → aplica nas parcelas futuras. |
| POST | `/contratos/:id/renegociar` | ver abaixo |

Corpo de criação:

```json
{
  "numero": "2026/0001",
  "clienteId": "uuid",
  "loteId": "uuid",
  "corretorId": null,
  "valorTotalCentavos": 12000000,
  "valorEntradaCentavos": 2000000,
  "dataEntrada": "2026-08-05",
  "formaPagamentoEntrada": "PIX",
  "quantidadeDeParcelas": 120,
  "valorDaParcelaCentavos": null,
  "primeiroVencimento": "2026-09-10",
  "periodicidade": "MENSAL",
  "multaPorAtrasoPercentual": 2,
  "jurosAoMesPercentual": 1,
  "diasDeCarencia": 0,
  "indiceReajuste": "IGPM",
  "dataAssinatura": "2026-08-01",
  "observacoes": null
}
```

`posicao` (retornada em `/contratos/:id` e no extrato):

```json
{
  "valorTotalCentavos": 12000000,
  "totalRecebidoCentavos": 2500000,
  "saldoDevedorCentavos": 9500000,
  "totalVencidoCentavos": 180000,
  "totalAVencerCentavos": 9320000,
  "encargosAcumuladosCentavos": 4200,
  "parcelasPagas": 3,
  "parcelasEmAberto": 118,
  "parcelasVencidas": 2,
  "proximoVencimento": "2026-11-10",
  "diasDeAtrasoMaximo": 37,
  "situacao": "INADIMPLENTE"
}
```

### Situação do contrato

`situacao` é **derivada**, nunca gravada, e tem **7 valores** (eram 5 antes da escala de inadimplência):

`EM_DIA` · `EM_ATRASO` · `INADIMPLENTE` · `SUJEITO_A_RETOMADA` · `QUITADO` · `CANCELADO` · `DISTRATADO`

Os três últimos vêm do `status` persistido. Os quatro primeiros saem da **escala de inadimplência** aplicada ao `diasDeAtrasoMaximo` — o maior atraso entre as parcelas em aberto do contrato (vale sempre o pior caso: um contrato com uma parcela de 100 dias e outra de 2 está sujeito a retomada).

Os limiares ficam na tabela de linha única `politica_de_inadimplencia`; sem linha gravada valem 8 e 90.

| Maior atraso | Situação |
| --- | --- |
| 0 | `EM_DIA` |
| 1 até `diasParaInadimplencia - 1` | `EM_ATRASO` |
| `diasParaInadimplencia` até `diasParaRetomadaDoLote - 1` | `INADIMPLENTE` |
| `>= diasParaRetomadaDoLote` | `SUJEITO_A_RETOMADA` |

Separar `EM_ATRASO` de `INADIMPLENTE` não é preciosismo: quem esqueceu o boleto por três dias não pode entrar na mesma lista de quem parou de pagar.

`Parcela` no extrato:

```json
{
  "id": "uuid",
  "numero": 12,
  "tipo": "FINANCIAMENTO",
  "descricao": "Parcela 12/120",
  "valorOriginalCentavos": 83334,
  "vencimento": "2026-09-10",
  "status": "PENDENTE",
  "situacao": "VENCIDA",
  "valorPagoCentavos": 0,
  "demonstrativo": {
    "saldoPrincipalCentavos": 83334,
    "multaCentavos": 1667,
    "jurosCentavos": 1028,
    "totalCentavos": 86029,
    "diasDeAtraso": 37,
    "diasCobrados": 37
  },
  "documentoVigente": { "id": "uuid", "tipo": "BOLETO_COM_PIX", "linhaDigitavel": "...", "pixCopiaECola": "...", "urlDoDocumento": "...", "status": "EMITIDO" }
}
```

## Cobrança — o núcleo

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/parcelas` | `?situacao=VENCIDA|VENCE_HOJE|A_VENCER&de=&ate=&contratoId=&clienteId=&loteamentoId=&pagina=` |
| GET | `/parcelas/:id` | Parcela + contrato + cliente + demonstrativo. |
| POST | `/parcelas/:id/baixa` | Baixa manual — aceita parcial. |
| POST | `/parcelas/:id/estorno` | Desfaz as baixas da parcela. |
| POST | `/parcelas/:id/documentos` | `{ tipo: "BOLETO"|"PIX"|"BOLETO_COM_PIX" }` — emite. |
| POST | `/parcelas/:id/documentos/reemitir` | Cancela o vigente e emite outro com valor atualizado. |
| GET | `/parcelas/:id/documentos` | Histórico de emissões. |
| POST | `/parcelas/:id/cobrar` | `{ canais?: Canal[], modelo?, data? }` — envia cobrança avulsa agora. |
| GET | `/cobrancas` | `?contratoId=&parcelaId=&clienteId=&status=&de=&ate=&pagina=` — histórico de envios. |

Baixa manual:

```json
{
  "valorPrincipalCentavos": 83334,
  "valorJurosCentavos": 1028,
  "valorMultaCentavos": 1667,
  "valorDescontoCentavos": 0,
  "pagoEm": "2026-10-17",
  "formaPagamento": "PIX",
  "observacoes": "Comprovante enviado no WhatsApp"
}
```

Envio avulso (`POST /parcelas/:id/cobrar`) — o corpo aceita `canais` (lista; ex.: `["WHATSAPP"]`), `modelo` (chave do modelo) e `data`; todos opcionais. Sem `canais`, usa o canal padrão do cliente. A resposta indica o desfecho:

- **`201`** `{ "situacao": "ENVIADA", "cobranca": { id, canal, destino, enviadaEm, ... } }` — mensagem saiu.
- **`502`** `{ "situacao": "FALHA", "cobranca": {...}, "motivo": "..." }` — registrada, mas o canal não entregou; `motivo` traz a razão.
- **`422`** `{ "erro": { "tipo": "ErroDeRegraDeNegocio", "mensagem": "..." } }` — cliente sem canal de contato para o(s) canal(is) pedido(s).

## Régua de cobrança

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/regua` | Etapas configuradas. |
| PUT | `/regua` | `{ eventos: [{ gatilho, dias, canais, modelo, emitirDocumento, tipoDeDocumento, ativo }] }` — substitui todas. |
| POST | `/regua/executar` | `{ data?, simular? }` — roda a régua. `simular: true` não envia nada. |
| GET | `/modelos-de-mensagem` | |
| PUT | `/modelos-de-mensagem/:chave` | `{ assunto?, corpo }` |

Resultado de `/regua/executar`:

```json
{
  "data": "2026-07-28",
  "simulado": false,
  "avaliadas": 412,
  "disparosProgramados": 37,
  "enviadas": 35,
  "documentosEmitidos": 28,
  "ignoradasPorDuplicidade": 1,
  "falhas": 1,
  "semCanal": 0,
  "detalhes": [{ "parcelaId": "uuid", "contrato": "2026/0001", "cliente": "Fulano", "evento": "APOS_O_VENCIMENTO:5", "canal": "WHATSAPP", "resultado": "ENVIADA" }]
}
```

Cada etapa da régua tem dois campos que controlam o meio de pagamento:

| Campo | Padrão | Efeito |
| --- | --- | --- |
| `emitirDocumento` | `true` | Antes de enviar a mensagem, garante que exista boleto/Pix com o **valor atualizado** daquele dia. É o que faz `{{linhaDigitavel}}` e `{{pix}}` chegarem preenchidos. Desligado, a cobrança sai sem meio de pagamento. |
| `tipoDeDocumento` | `"BOLETO_COM_PIX"` | `BOLETO`, `PIX` ou `BOLETO_COM_PIX`. |

A comparação é por **valor**, não por existência: um documento emitido antes do vencimento cobra a menos depois que a mora começa a correr, então a régua reemite quando o valor muda. Como as etapas disparam em dias específicos, isso não vira reemissão diária. Falha na emissão não cancela o envio — a mensagem sai sem o boleto, e o erro fica no log.

`GET /regua` devolve os dois campos em cada evento, junto de `chave` e `descricao`.

Variáveis disponíveis nos modelos de mensagem:
`{{cliente}}` `{{primeiroNome}}` `{{contrato}}` `{{loteamento}}` `{{quadra}}` `{{lote}}` `{{parcela}}` `{{totalDeParcelas}}` `{{vencimento}}` `{{diasDeAtraso}}` `{{valor}}` `{{valorAtualizado}}` `{{multa}}` `{{juros}}` `{{linhaDigitavel}}` `{{pix}}` `{{link}}` `{{empresa}}`

## Renegociação

`POST /contratos/:id/renegociar`

```json
{
  "parcelaIds": ["uuid", "uuid"],
  "incluirEncargos": true,
  "descontoCentavos": 0,
  "entradaCentavos": 50000,
  "dataEntrada": "2026-08-10",
  "quantidadeDeParcelas": 12,
  "primeiroVencimento": "2026-09-10",
  "periodicidade": "MENSAL",
  "acordadoEm": "2026-08-05",
  "motivo": "Acordo por telefone"
}
```

Marca as parcelas escolhidas como `RENEGOCIADA` e cria as novas com `tipo: "RENEGOCIACAO"`.
`GET /contratos/:id/renegociacoes` lista os acordos.

## Anexos

Arquivos enviados pela equipe: contrato assinado, aditivo, RG do cliente, comprovante.

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/clientes/:id/anexos` | Lista + categorias disponíveis + limite de tamanho |
| POST | `/clientes/:id/anexos` | `multipart/form-data` — exige `ANEXAR_ARQUIVO` |
| GET | `/contratos/:id/anexos` | idem |
| POST | `/contratos/:id/anexos` | idem |
| GET | `/anexos/:id/conteudo` | Binário do arquivo |
| DELETE | `/anexos/:id` | `204` — exige `REMOVER_ANEXO` |

Envio: `multipart/form-data` com os campos `arquivo` (o binário), `categoria` e `descricao` (opcional).

**Limites:** 10 MB (`10485760` bytes) e apenas `application/pdf`, `image/jpeg`, `image/png`, `image/webp`. Fora disso → **422**; arquivo grande demais → **413**.

**Categorias por escopo** — a categoria precisa combinar com o escopo, senão **422**:

- **Cliente:** `RG` · `CPF` · `COMPROVANTE_RESIDENCIA` · `COMPROVANTE_RENDA` · `CERTIDAO` · `OUTRO`
- **Contrato:** `CONTRATO_ASSINADO` · `ADITIVO` · `TERMO_DE_RENEGOCIACAO` · `DISTRATO` · `TERMO_DE_QUITACAO` · `COMPROVANTE_PAGAMENTO` · `OUTRO`

```json
{
  "id": "uuid",
  "escopo": "CONTRATO",
  "donoId": "uuid",
  "categoria": "CONTRATO_ASSINADO",
  "categoriaRotulo": "Contrato assinado",
  "nomeOriginal": "contrato-2026-0001.pdf",
  "tipoMime": "application/pdf",
  "tamanhoBytes": 482113,
  "tamanhoLegivel": "470.8 KB",
  "descricao": null,
  "enviadoPor": "admin@gestrato.local",
  "enviadoEm": "2026-07-29T12:00:00.000Z"
}
```

A listagem devolve `{ itens, categoriasDisponiveis: [{ valor, rotulo }], tamanhoMaximoBytes }`.

`GET /anexos/:id/conteudo` responde com `Content-Type` do arquivo e `Content-Disposition: inline`, para o navegador exibir PDF e imagem numa aba. **Exige token como qualquer outra rota** — documento de cliente não fica em URL adivinhável, então o front precisa buscar por `fetch` e não por `<a href>`.

## Webhook de conciliação

`POST /webhooks/cobranca/:provedor` — sem JWT. Grava o evento cru e dá baixa automática na parcela correspondente. Responde `200 { "recebido": true }` mesmo para evento repetido (idempotente).

## Fluxo de caixa (tesouraria)

Cadastros-base do controle de fluxo de caixa que substitui as planilhas financeiras (Fase 0). Todos paginados, com filtros `?busca=&ativo=true|false`. Leitura para qualquer autenticado; escrita (`POST`/`PUT`) exige a permissão `CADASTRAR`.

| Método | Rota | Observação |
| --- | --- | --- |
| GET/POST | `/contas-bancarias` | contas da empresa (Sicoob, Sicredi…) |
| PUT | `/contas-bancarias/:id` | |
| GET/POST | `/socios-aportadores` | sócios que aportam capital |
| PUT | `/socios-aportadores/:id` | |
| GET/POST | `/empreendimentos-financeiros` | centros de custo; aceita `loteamentoId` opcional |
| PUT | `/empreendimentos-financeiros/:id` | |
| GET/POST | `/categorias-financeiras` | plano de rubricas; filtros extra `?tipo=ENTRADA|SAIDA&natureza=` |
| PUT | `/categorias-financeiras/:id` | |

`ContaBancaria`: `{ id, nome, instituicao, agencia, numero, saldoInicialCentavos, ativa, observacoes }`

`SocioAportador`: `{ id, nome, documento, ativo, observacoes }`

`EmpreendimentoFinanceiro`: `{ id, nome, loteamentoId, loteamento: { id, nome } | null, ativo, observacoes }`

`CategoriaFinanceira`: `{ id, nome, tipo, natureza, ordem, ativa, observacoes }`
- `tipo`: `ENTRADA | SAIDA` — decorre da `natureza` (recebível/aporte = `ENTRADA`; demais = `SAIDA`).
- `natureza`: `RECEBIVEL_VENDA | APORTE | TRANSFERENCIA | DESPESA_FIXA | DESPESA_VARIAVEL | CUSTO_OBRA | OUTRO`.

Os cadastros iniciais saem do seed isolado `npm run seed:fluxo` (3 contas, 4 sócios, 5 empreendimentos, 59 categorias). Diferente de `npm run seed`, ele **não** injeta massa de demonstração — é seguro contra um banco com dados reais.

## Dashboard

`GET /dashboard?data=AAAA-MM-DD`

`data` é opcional; sem ela a referência é hoje.

Contagens pela escala de inadimplência (ver [Situação do contrato](#situação-do-contrato)) — todas sobre contratos `ATIVO`, classificados pelo maior atraso entre suas parcelas em aberto:

- `contratosEmAtraso` — atraso de 1 dia até `diasParaInadimplencia - 1`.
- `contratosInadimplentes` — **mudou de significado**: até a escala existir, contava qualquer contrato com ao menos um dia de atraso; agora só entra a partir de `diasParaInadimplencia`. Um contrato com 3 dias de atraso deixou de aparecer aqui e passou para `contratosEmAtraso`. Inclui os sujeitos a retomada.
- `contratosSujeitosARetomada` — subconjunto do anterior, com atraso `>= diasParaRetomadaDoLote`.
- `clientesInadimplentes` — clientes **distintos** com ao menos um contrato `INADIMPLENTE` ou `SUJEITO_A_RETOMADA`, ou seja, o mesmo limiar novo.
- `lotesARetomar` — lotes distintos sujeitos a retomada e o vencido atualizado correspondente.
- `politicaDeInadimplencia` — os limiares vigentes, ecoados junto para o front rotular as telas ("8 dias") sem uma segunda chamada.

`percentualDeInadimplencia` e `taxaDeRecuperacao` **não** mudaram de base: são razões financeiras sobre valor, não contagem por degrau.

Campos monetários da posição:

- `totalAReceberCentavos` — saldo principal de **todas** as parcelas em aberto (`PENDENTE` ou `PAGA_PARCIAL`) de contratos não cancelados nem distratados. Só principal, sem mora.
- `totalVencidoCentavos` — das parcelas em aberto já vencidas, saldo principal **mais multa e juros** na data de referência. É o valor de cobrança.
- `percentualDeInadimplencia` — fatia vencida da carteira, **principal contra principal**, com uma casa decimal:

  ```
  percentualDeInadimplencia = principal em aberto e vencido
                            / principal em aberto (vencido + a vencer)
                            × 100
  ```

  Multa e juros ficam fora dos dois lados: com mora só no numerador, o indicador subiria sozinho a cada dia de atraso mesmo sem nenhuma parcela nova vencer. Como as duas grandezas usam a mesma base, o resultado fica sempre entre 0 e 100. Denominador zero devolve `0`.

  No exemplo abaixo o principal vencido é 3.075.000 (os 3.180.000 de `totalVencidoCentavos` menos 105.000 de multa e juros), logo `3075000 / 184500000 × 100 = 1,7`.

- `taxaDeRecuperacao` — eficácia da cobrança sobre uma coorte fechada, com uma casa decimal:

  ```
  taxaDeRecuperacao = SUM(valorPagoCentavos)
                    / SUM(valorOriginalCentavos)
                    × 100
  ```

  Das parcelas que **venceram** na janela de 30 dias encerrada na data de referência, o percentual do valor original já recebido de principal. Entram as parcelas com `vencimento` na janela, excluindo `CANCELADA` e `RENEGOCIADA`, de contratos que não estejam `CANCELADO`/`DISTRATADO`. Só principal, sem mora — pelo mesmo motivo do percentual de inadimplência. Numerador e denominador olham a mesma coorte, então o indicador não mistura estoque com fluxo. Denominador zero devolve `0`.

- `cobrancasEnviadas` — volume da régua, contado na tabela de cobranças pela `dataDeReferencia` do envio:
  - `hoje` — registros com `status = "ENVIADA"` e `dataDeReferencia` igual à data de referência;
  - `ultimos30Dias` — `status = "ENVIADA"` na janela;
  - `falhasUltimos30Dias` — `status = "FALHA"` na mesma janela.

A **janela de 30 dias** usada nos dois campos acima é fechada nas duas pontas e termina na data de referência: `[data - 29 dias, data]`, ou seja trinta datas, não trinta e uma.

```json
{
  "data": "2026-07-28",
  "contratosAtivos": 318,
  "contratosQuitados": 42,
  "contratosEmAtraso": 24,
  "contratosInadimplentes": 57,
  "contratosSujeitosARetomada": 9,
  "clientesInadimplentes": 51,
  "lotesARetomar": { "quantidade": 9, "valorVencidoCentavos": 1120000 },
  "politicaDeInadimplencia": { "diasParaInadimplencia": 8, "diasParaRetomadaDoLote": 90 },
  "totalAReceberCentavos": 184500000,
  "totalRecebidoNoMesCentavos": 4210000,
  "totalVencidoCentavos": 3180000,
  "percentualDeInadimplencia": 1.7,
  "taxaDeRecuperacao": 82.4,
  "parcelasQueVencemHoje": { "quantidade": 12, "valorCentavos": 980000 },
  "parcelasVencidas": { "quantidade": 87, "valorCentavos": 3180000 },
  "proximos7Dias": { "quantidade": 41, "valorCentavos": 3350000 },
  "cobrancasEnviadas": { "hoje": 12, "ultimos30Dias": 348, "falhasUltimos30Dias": 7 },
  "recebimentosPorMes": [{ "competencia": "2026-07", "valorCentavos": 4210000 }],
  "aging": [
    { "faixa": "1-5", "quantidade": 14, "valorCentavos": 210000 },
    { "faixa": "6-15", "quantidade": 22, "valorCentavos": 480000 },
    { "faixa": "16-30", "quantidade": 19, "valorCentavos": 620000 },
    { "faixa": "31-60", "quantidade": 17, "valorCentavos": 810000 },
    { "faixa": "61-90", "quantidade": 8, "valorCentavos": 430000 },
    { "faixa": "90+", "quantidade": 7, "valorCentavos": 630000 }
  ]
}
```

Invariantes que o exemplo respeita e a implementação garante:

- `parcelasVencidas.valorCentavos` == `totalVencidoCentavos` (3.180.000) — são o mesmo conjunto.
- As quantidades do `aging` somam `parcelasVencidas.quantidade` (14+22+19+17+8+7 = 87) e os valores somam `totalVencidoCentavos` (210.000+480.000+620.000+810.000+430.000+630.000 = 3.180.000). Toda parcela vencida cai em exatamente uma faixa.
- `totalRecebidoNoMesCentavos` == a entrada de `recebimentosPorMes` cuja competência é a de `data` (4.210.000 em `2026-07`).
- `recebimentosPorMes` traz sempre 12 meses, do mais antigo ao mais recente, incluindo meses sem recebimento (`valorCentavos: 0`) — o exemplo mostra só um item por brevidade.
- `parcelasQueVencemHoje`, `parcelasVencidas` e `proximos7Dias` são conjuntos disjuntos e `valorCentavos` só carrega mora no vencido; os outros dois são principal puro.
- `aging` vem sempre com as seis faixas, mesmo zeradas.
- `taxaDeRecuperacao` **não** é derivável dos demais campos: ela olha uma coorte diferente (parcelas que venceram nos últimos 30 dias), enquanto os totais de posição olham o estoque em aberto na data.
- `contratosSujeitosARetomada` está **contido** em `contratosInadimplentes` (9 dos 57); `contratosEmAtraso` é disjunto dos dois. `lotesARetomar.quantidade` acompanha `contratosSujeitosARetomada` — só difere se dois contratos ativos apontarem para o mesmo lote.
- As contagens por degrau olham só contratos `ATIVO`; `parcelasVencidas`, `totalVencidoCentavos` e `aging` continuam cobrindo todo o vencido a partir de um dia de atraso, porque são grandezas de parcela e não passam pela escala.

## Relatórios

| Rota | Parâmetros |
| --- | --- |
| `GET /relatorios/inadimplencia` | `?loteamentoId=&data=` — agrupado por loteamento, com aging e quebra por situação |
| `GET /relatorios/lotes-a-retomar` | `?loteamentoId=&data=` — contratos `SUJEITO_A_RETOMADA`, para o jurídico |
| `GET /relatorios/recebimentos` | `?de=&ate=` — por competência, com forma de pagamento |
| `GET /relatorios/fluxo-previsto` | `?meses=12` — a receber por competência |
| `GET /relatorios/clientes-em-atraso` | `?diasMinimos=1` |
| `GET /relatorios/contratos` | `?status=` |
| `GET /relatorios/comissoes` | `?de=&ate=` |
| `GET /relatorios/cobrancas` | `?de=&ate=&canal=&status=` — envios da régua no período, filtrados pela `dataDeReferencia`; resumo geral, quebra por canal e por evento da régua, mais os itens detalhados |

Todos aceitam `?formato=csv` para exportação. No CSV vai a lista de itens do relatório, não os blocos de totais.

### `GET /relatorios/inadimplencia`

Além do `aging` por faixa de dias, cada loteamento e o `total` trazem `porSituacao` — a quebra pelos três degraus da escala, sempre com as três linhas mesmo zeradas:

```json
"porSituacao": [
  { "situacao": "EM_ATRASO", "contratos": 24, "clientes": 22, "valorVencidoCentavos": 210000 },
  { "situacao": "INADIMPLENTE", "contratos": 48, "clientes": 44, "valorVencidoCentavos": 1850000 },
  { "situacao": "SUJEITO_A_RETOMADA", "contratos": 9, "clientes": 9, "valorVencidoCentavos": 1120000 }
]
```

O relatório também ecoa `politicaDeInadimplencia` na raiz. `contratosInadimplentes` e `clientesInadimplentes` seguem o mesmo limiar do dashboard (`INADIMPLENTE` + `SUJEITO_A_RETOMADA`); `parcelasVencidas`, `valorVencidoCentavos` e `aging` continuam cobrindo todo o vencido. Os totais de `clientes` não são a soma dos loteamentos: quem tem lote em dois loteamentos seria contado duas vezes, então a contagem distinta vem do banco.

### `GET /relatorios/lotes-a-retomar`

Contratos cujo maior atraso já alcançou `diasParaRetomadaDoLote` — a lista que o jurídico usa. Ordenado por dias de atraso decrescente. Cada item traz contrato e data de assinatura, cliente com documento e contatos (e-mail, telefone, WhatsApp), loteamento/quadra/lote, `diasDeAtrasoMaximo`, `valorVencidoCentavos` (saldo principal + multa + juros) e `saldoDevedorCentavos` (principal de todas as parcelas em aberto). A raiz traz `data`, `politicaDeInadimplencia`, `totalDeContratos`, `valorVencidoCentavos` e `saldoDevedorCentavos`.

### `GET /relatorios/cobrancas`

Envios da régua no período, recortados pela `dataDeReferencia` do envio (o dia que a régua mirou), não pelo carimbo de criação da linha. `de` e `ate` são inclusivos e, se omitidos, valem o mês corrente. `canal` e `status` são filtros opcionais.

Chaves da resposta — `resumo`, `porCanal`, `porEvento` e `itens`, além do envelope `de`/`ate`:

```json
{
  "de": "2026-07-01",
  "ate": "2026-07-31",
  "canal": null,
  "status": null,
  "resumo": {
    "envios": 348,
    "enviadas": 335,
    "falhas": 7,
    "canceladas": 6,
    "valorCobradoCentavos": 4210000,
    "clientesAlcancados": 211
  },
  "porCanal": [
    { "canal": "WHATSAPP", "enviadas": 200, "falhas": 2, "valorCobradoCentavos": 2500000 }
  ],
  "porEvento": [
    { "evento": "APOS_O_VENCIMENTO:5", "gatilho": "APOS_O_VENCIMENTO", "dias": 5, "enviadas": 100, "falhas": 4, "valorCobradoCentavos": 1400000 }
  ],
  "itens": [
    {
      "cobrancaId": "uuid",
      "dataDeReferencia": "2026-07-28",
      "enviadaEm": "2026-07-28T18:30:00.000Z",
      "clienteId": "uuid",
      "cliente": "Fulano",
      "contratoId": "uuid",
      "contrato": "2026/0001",
      "parcelaId": "uuid",
      "parcela": 12,
      "canal": "WHATSAPP",
      "destino": "+5595999990000",
      "evento": "APOS_O_VENCIMENTO:5",
      "status": "ENVIADA",
      "valorCobradoCentavos": 86029,
      "ultimoErro": null
    }
  ]
}
```

- `canal` e `status` no topo apenas ecoam os filtros aplicados; são `null` quando não informados.
- `resumo.envios` conta todos os registros do período, qualquer status; `enviadas`, `falhas` e `canceladas` são recortes dele. `clientesAlcancados` são clientes **distintos**.
- `porCanal` sai na ordem `WHATSAPP`, `SMS`, `EMAIL` e traz só os canais com envio no período.
- `porEvento` identifica a etapa da régua como `GATILHO:dias`, o mesmo formato de `/regua/executar`, ordenada pela linha do tempo: antes do vencimento, no vencimento, depois do vencimento — e, dentro de cada gatilho, por `dias` crescente.
- `enviadaEm` é carimbo de auditoria em ISO 8601 UTC e vem `null` enquanto a cobrança não saiu. No CSV ele é convertido para `DD/MM/AAAA HH:MM` no fuso `America/Sao_Paulo`.
- `itens` é a lista que vai para o CSV, ordenada por `dataDeReferencia` decrescente.
