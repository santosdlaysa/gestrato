# Mapeamento do Módulo Financeiro do Sienge

> **Objetivo:** documentar as telas, campos, fluxos e conceitos do módulo **Financeiro** do ERP Sienge (usado pela Roraima / instância `roraima.sienge.com.br`), como referência para o time e para o módulo de **Fluxo de Caixa** do Gestrato.
>
> **Método e escopo:** este mapa foi construído a partir da **documentação oficial pública** do Sienge (Central de Ajuda `ajuda.sienge.com.br`, blog `sienge.com.br/blog` e doc de API `api.sienge.com.br/docs`). **Não** reflete configurações específicas da instância Roraima (plano financeiro, centros de custo, formas de pagamento, bancos e layouts cadastrados variam por cliente). Onde a documentação pública não detalha algo, isso está sinalizado como _"não documentado publicamente"_.
>
> **Como refinar:** complementar com prints das telas da instância Roraima nos pontos que dependem de configuração local (ver seção 12).
>
> _Data do levantamento: agosto/2026._

---

## Sumário

1. [Visão geral e mapa do menu](#1-visão-geral-e-mapa-do-menu)
2. [Plano Financeiro / Apropriação (a espinha dorsal)](#2-plano-financeiro--apropriação)
3. [Contas a Pagar](#3-contas-a-pagar)
4. [Contas a Receber (títulos, cobrança e inadimplência)](#4-contas-a-receber)
5. [Tesouraria / Caixa e Bancos](#5-tesouraria--caixa-e-bancos)
6. [Comissões](#6-comissões)
7. [Impostos / Tributos](#7-impostos--tributos)
8. [Fluxo de Caixa (relatórios gerenciais)](#8-fluxo-de-caixa)
9. [Integração Bancária (CNAB / boletos / pagamentos)](#9-integração-bancária)
10. [Integração Contábil](#10-integração-contábil)
11. [API financeira do Sienge](#11-api-financeira-do-sienge)
12. [Relação com o Gestrato e próximos passos](#12-relação-com-o-gestrato-e-próximos-passos)

---

## 1. Visão geral e mapa do menu

O módulo **Financeiro** do Sienge se organiza nos seguintes submódulos (caminho-raiz `Financeiro › …`), apoiado por cadastros do módulo **Apoio** e por relatórios gerenciais no módulo **Suporte à Decisão**:

| Submódulo | Papel | Seção |
|-----------|-------|-------|
| **Contas a Pagar** | Títulos a pagar, autorização, baixa, pagamento escritural | §3 |
| **Contas a Receber** | Títulos a receber, cobrança escritural (boletos), baixa, reajuste, inadimplência | §4 |
| **Caixa e Bancos (Tesouraria)** | Contas correntes, operações, cheques, conciliação bancária | §5 |
| **Apoio › Planos Financeiros** | Plano de contas de apropriação (natureza de receita/despesa) | §2 |
| **Comercial › Vendas › Comissões** | Comissões de corretores (gera título a pagar) | §6 |
| **Apoio › Impostos** | Cadastro de tributos e retenções → guias no Contas a Pagar | §7 |
| **Suporte à Decisão › Gerencial Financeiro** | Fluxo de Caixa (Analítico, Sintético, por Plano de Contas) | §8 |
| **Contabilidade/Fiscal** | Integração contábil dos lançamentos financeiros | §10 |
| **API REST + Bulk Data** | Integração externa (relevante p/ Gestrato) | §11 |

**Conceito central:** cada valor financeiro é classificado por duas dimensões — **Plano Financeiro** (a _natureza_: "o que é" a receita/despesa) e **Centro de Custo** (o _onde_: obra/departamento). O **título/movimento** é o fato; a **baixa** define a temporalidade (realizado × a realizar). Essa combinação alimenta todos os relatórios gerenciais. Entender o §2 é pré-requisito para entender os demais.

---

## 2. Plano Financeiro / Apropriação

**Caminho:** `Apoio › Planos Financeiros`.

### 2.1 O que é
Cadastro de contas usado para **apropriar (classificar) receitas e despesas**. A apropriação ocorre em vários pontos: **cadastro de títulos** (a pagar e a receber), **movimentações de Caixa e Bancos** e **cadastro de insumos**.

### 2.2 Estrutura hierárquica
Contas em níveis com numeração encadeada automática (ex.: `1.01.01`):
- **Mesmo nível (irmãs):** `1.01.02`, `1.01.03`…
- **Subnível (filhas):** a partir de `1.01.01` → `1.01.01.02`…

### 2.3 Tipos de conta
| Tipo | Definição | Aceita apropriação direta? |
|------|-----------|----------------------------|
| **Resultado** | Movimentações com entrada/saída **efetiva** de dinheiro (receitas, despesas) | Sim |
| **Movimento** | Contas **transitórias** sem resultado efetivo (transferências, retenções) | Sim (sem impacto no resultado) |
| **Totalizadora** | Agrupa contas de Resultado/Movimento para consolidar | **Não** |

Campos do cadastro: Conta (código automático), Descrição, Tipo, Redutora, Ativa (inativa bloqueia novas apropriações mas segue em relatórios), Adiantamento, Referência de imposto. **Não é possível excluir conta com apropriações** — inativa-se.

### 2.4 Rateio de apropriação
No cadastro do título ou movimentação, o valor pode ser rateado entre várias contas e centros de custo. Por linha: **Centro de custo + Conta do Plano Financeiro + Valor ou %**. Usando percentuais, o total **deve fechar em 100%**.

### 2.5 Controle de visibilidade — Parâmetro 665
- **665 = "Não":** todos os planos financeiros aparecem para apropriação.
- **665 = "Sim":** só aparecem as contas associadas ao centro de custo (aba **Plano Financeiro** no cadastro do centro de custo).

### 2.6 Visão do Plano Financeiro
Cadastro paralelo que **reagrupa** as contas para relatórios gerenciais (sem alterar o plano operacional), permitindo formato **DRE** (lucro/prejuízo). Estrutura: Totalizadoras → Estruturas de resultado → Total nível 1. Selecionável em relatórios (ex.: Fluxo de Caixa por Plano de Contas).

**Fontes:** [Estruturar Plano Financeiro](https://ajuda.sienge.com.br/support/solutions/articles/153000200536) · [Conta Resultado/Movimento](https://ajuda.sienge.com.br/support/solutions/articles/153000200534) · [Rateio financeiro](https://ajuda.sienge.com.br/support/solutions/articles/153000200183) · [Parâmetro 665](https://ajuda.sienge.com.br/support/solutions/articles/153000199942) · [Contas do plano p/ centro de custo](https://ajuda.sienge.com.br/support/solutions/articles/153000200588) · [Visão do Plano Financeiro](https://ajuda.sienge.com.br/support/solutions/articles/153000198899)

---

## 3. Contas a Pagar

**Caminho-raiz:** `Financeiro › Contas a Pagar`.

### 3.1 Estrutura de menu
Títulos · Consulta de Títulos · Consulta de Parcelas · Baixas (Inclusão/Estorno) · Autorização de Pagamento (+ Alçadas) · Pagamento Escritural (Programação/Gerações de Arquivo/Cancelamentos de Lote) · Relatórios.

### 3.2 Cadastro de Título (`Títulos`)
Número sequencial automático ao salvar. Campos/recursos:
- **Data de competência** (com parâmetro 84).
- **Contabilizar apenas a baixa** — envia à contabilidade só as baixas, não a provisão da despesa.
- **Apropriação de Despesas por Centro de Custo** — vários centros de custo × várias contas do plano financeiro (valor ou %).
- **Aba Parcelas** — inclusão de **1 parcela por vez**; total recalculado ao salvar.
- **Impostos/Retenções** — com opção "Recolhimento por centro de custo".

Ações de segurança: 1604/1605/1607/1608 (cadastro), 1606 (exclusão). O detalhamento campo a campo (credor, documento, forma de pagamento) **não está num único artigo público**.

### 3.3 Consulta de Títulos (nova tela)
Grade com +30 colunas selecionáveis, filtros amplos (Título, Empresa, Centro de Custo, Credor, Documento, Situação, Emissão, Vencimento, "Mais filtros" → obra/departamento/projeto/UF/município), **visões personalizadas**, exportação **CSV/XLSX**, e ações de **edição e duplicação** de títulos.

### 3.4 Consulta de Parcelas
Grade unificada de **Contas a Pagar / Contas Pagas / Movimentos de Caixa e Bancos**, com "Tipo de apresentação", personalização de colunas, exportação e visões salvas.

### 3.5 Baixa Manual (`Baixas › Inclusão`)
Registro do pagamento. Campos: Data da baixa, Tipo de baixa, Empresa Pagadora, Conta Corrente, acréscimos/descontos. Pré-requisito: parcela **em aberto e autorizada**.

### 3.6 Estorno de Baixa (`Baixas › Estorno`)
Reverte pagamento recusado/estornado pelo banco; parcela volta a **NP (Não Paga)**. Aceita apenas valor integral; não estorna adiantamentos de pedido/contrato; se em lote escritural, remover do lote antes.

### 3.7 Pagamento Escritural (lote/CNAB)
Programação do lote (parcelas autorizadas) → **Gerações de Arquivo** (remessa bancária) → download ou transmissão automática. **Cancelamento de Lote** para retirar parcelas. Parâmetro 341 controla baixa manual de parcela já enviada. Ações 1909/1910.

### 3.8 Exclusão de Título — regra das origens
Contas a Pagar é **módulo "fim"** (recebe títulos de vários módulos). Excluíveis aqui: **CP, FP, GI, SE, RA**. Só no módulo de origem: **AC, CO, ME, DV, LO**. Botão desabilitado se houver baixas, lote escritural ou associações (ex.: impostos retidos).

### 3.9 Autorização de Pagamento e Alçadas
- **Campo "Autorizado" = Sim** libera a parcela para baixa (portão de aprovação).
- **Alçadas** (`Autorização de Pagamento › Alçadas`): níveis hierárquicos por **faixa de valor** (parâmetro 743 = "Valor"), com quantidade de aprovações por faixa; usuários atribuídos a níveis em Segurança. Há notificação e relatório de autorização.

### 3.10 Situação e status
- **Situação da parcela:** NP (Não Paga) · PC (Parcialmente Paga) · PG (Paga).
- **Status do título:** Completo · Em Inclusão · Incompleto (uma vez Completo, nunca volta a "Em Inclusão").

### 3.11 Anexos e documentos restritos
Anexo pode ser tornado **obrigatório**; há download de anexos. Tipos de documento podem ser **acesso restrito** (fornecedores/corretores/funcionários), invisíveis a usuários sem autorização.

### 3.12 Fluxo padrão
1. Cadastro do título (apropriação + parcelas + impostos) → 2. Autorização (manual/alçadas) → 3. Pagamento (baixa manual **ou** pagamento escritural) → 4. Correções (estorno/cancelamento de lote) → 5. Movimenta Caixa e Bancos → 6. Integração contábil (provisão + baixa).

**Fontes:** [Criar título a pagar](https://ajuda.sienge.com.br/support/solutions/articles/153000200123) · [Incluir parcelas](https://ajuda.sienge.com.br/support/solutions/articles/153000199994) · [Consulta de Títulos](https://ajuda.sienge.com.br/support/solutions/articles/153000221218) · [Consulta de Parcelas](https://ajuda.sienge.com.br/support/solutions/articles/153000200260) · [Baixa manual](https://ajuda.sienge.com.br/support/solutions/articles/153000200157) · [Estorno de baixa](https://ajuda.sienge.com.br/support/solutions/articles/153000200042) · [Lote pagamento escritural](https://ajuda.sienge.com.br/support/solutions/articles/153000200070) · [Excluir título / origens](https://ajuda.sienge.com.br/support/solutions/articles/153000200240) · [Alçadas de autorização](https://ajuda.sienge.com.br/support/solutions/articles/153000199944) · [Situação e Autorizado](https://ajuda.sienge.com.br/support/solutions/articles/153000199934) · [Status do título](https://ajuda.sienge.com.br/support/solutions/articles/153000200244) · [Relatório configurável](https://ajuda.sienge.com.br/support/solutions/articles/153000200061)

---

## 4. Contas a Receber

**Caminho-raiz:** `Financeiro › Contas a Receber`. Típico de construtoras: os títulos nascem dos **contratos de venda** (Comercial).

### 4.1 Conceitos de base
- **Título** (registro-mãe do recebível) e **Parcela** (cada vencimento, com tipo, indexador, data-base e condição de pagamento).
- **Indexadores / correção monetária:** cadastrados em `Apoio › Indexadores`. Cada parcela pode ser corrigida por indexador, com **data base** (referência) e **data cálculo** (até quando corrige). É possível alterar o tipo de correção de um título já emitido.
- **Condição de pagamento:** classifica a parcela (mensais, anuais/balão), serve de filtro e pode restringir notificação de cobrança.

### 4.2 Geração dos títulos (Vendas → Financeiro)
Contrato em `Comercial › Vendas › Contratos` → fluxo Aguardando Autorização → Aguardando Emissão → **Emitir Contrato** → gera automaticamente **título + parcelas** no Contas a Receber. Também há **importação de títulos** (avulsos vinculados ao contrato).

### 4.3 Consulta de Parcelas e Extrato de Cliente
- **Consulta de Parcelas:** grade unificada (a receber + recebidas); filtros por título/empresa/centro de custo/cliente/datas; colunas de valores (original, corrigido, atualizado, devido), **negativação Serasa**; exportação CSV/XLSX; visões salvas.
- **Extrato de Cliente:** consolida recebíveis do cliente com cálculo dinâmico de correção, juros e multa; dias em atraso; útil para cobrança.

### 4.4 Baixa (recebimento) — 11 tipos
Baixa parcial ou total. Manual (consulta → seleção → acréscimo/desconto → efetuar) ou **em lote**; existe baixa **sem movimentação na conta corrente**. Tipos pré-definidos (não customizáveis):
1. Recebimento · 2. Adiantamento · 3. Abatimento de Adiantamento · 4. Cancelamento · 5. Reparcelamento · 6. Por Bens · 7. Promoção · 8. Bonificação · 9. Sorteio · 10. Substituição · 11. Outros / Outros com Resíduo.

### 4.5 Repactuação (reajuste anual)
`Contas a Receber › Outras Funções › Repactuações`. Para títulos com **correção aniversário** (a cada 12 meses); **manual**. Opções: usar indexador do contrato, percentual informado, ou não cobrar indexador; e tratamento de **resíduo**.

### 4.6 Reparcelamento (renegociação de dívida)
`Contas a Receber › Reparcelamento › Inclusão`. Faz baixa por "Reparcelamento" das parcelas selecionadas e gera **novas parcelas futuras**. Regra: não se pode baixar a nova parcela com data anterior à do reparcelamento.

### 4.7 Descontos, juros e multa
Descontos em `Contas a Receber › Títulos` (tipos: Fixo, Diário, Mensal, Anual — sempre em **percentual**). Juros/multa parametrizados na configuração da cobrança escritural da conta corrente.

### 4.8 Cobrança bancária / Cobrança Escritural (boletos e carnê)
- **Remessa** (`Cobrança Escritural › Geração de Arquivo Remessa`): seleciona parcelas e envia ao banco p/ registro dos boletos.
- **Retorno** (`Cobrança Escritural › Leitura`): baixa automática pelas ocorrências; campo Status indica registro.
- Pré-requisitos: título ativo com parcelas em aberto; conta corrente cadastrada com aba **Cobrança Escritural** (juros/multa/desconto/protesto); **layout de boleto** configurado (homologado por banco).
- Recursos: **Recebimentos Instantâneos/PIX** (ex.: Banco do Brasil), tratamento de "boleto não registrado". **Carnê** aparece como saída da geração de boletos (sem artigo público dedicado).

### 4.9 Inadimplência (régua de cobrança)
- Ativar agendador em `Segurança › Agendador de Tarefas` (flags "notificação de cobrança" e "controle de títulos inadimplentes").
- Régua em `Contas a Receber › Cobrança Escritural › Controle de Notificação de Inadimplência` (regras por dias relativos ao vencimento).
- Escopo por centro de custo em `Contas a Receber › Controle de Inadimplência › Configuração`.
- **Canais:** e-mail e/ou SMS. Classificação do cliente: **Normal · Cobrança · Inadimplente · Sub judice**; negativação Serasa por parcela.

### 4.10 Dashboard de Contas a Receber
Cards de valores (a receber no prazo/vencido, recebido no prazo/vencido) e de parcelas; gráficos (análise por vencimento, recebido × a receber, distribuição, clientes por situação, inadimplência). **Inadimplência (%) = valores em atraso ÷ (atraso + no prazo) × 100.** Filtros: empresa e período obrigatórios.

**Fontes:** [Consulta de Parcelas](https://ajuda.sienge.com.br/support/solutions/articles/153000199454) · [Extrato de Cliente](https://ajuda.sienge.com.br/support/solutions/articles/153000199923) · [Baixa de título a receber](https://ajuda.sienge.com.br/support/solutions/articles/153000199689) · [Tipos de baixa](https://ajuda.sienge.com.br/support/solutions/articles/153000199820) · [Repactuação anual](https://ajuda.sienge.com.br/support/solutions/articles/153000199727) · [Data base / data cálculo](https://ajuda.sienge.com.br/support/solutions/articles/153000199780) · [Cobrança escritural](https://ajuda.sienge.com.br/support/solutions/articles/153000199775) · [Geração de boletos](https://ajuda.sienge.com.br/support/solutions/articles/153000224410) · [Notificação de cobrança](https://ajuda.sienge.com.br/support/solutions/articles/153000199649) · [Dashboard Contas a Receber](https://ajuda.sienge.com.br/support/solutions/articles/153000247541) · [Contrato de venda](https://ajuda.sienge.com.br/support/solutions/articles/153000201178)

---

## 5. Tesouraria / Caixa e Bancos

**Caminho-raiz:** `Financeiro › Caixa e Bancos` (cadastros em `Apoio › Contas Correntes`).

### 5.1 Cadastro de Contas Correntes / Caixas
`Apoio › Contas Correntes › Cadastros`. Campos: Conta, Nome, Máscara, Tipo, Banco, Agência/Dígito. Tipos: **Bancária, Investimento, Mútuo** (conta espelho entre empresas), **Caixa** (dinheiro físico).

### 5.2 Movimentações — operações
`Caixa e Bancos › Movimentações` — lançamentos **sem vínculo obrigatório** com Contas a Pagar/Receber. Operações: **Recebimento, Pagamento, Depósito** (Caixa→Bancária), **Saque** (Bancária→Caixa), **Transferência (op. 4)** entre contas sem apropriação, **Transferência entre Empresas (op. 30)** com apropriação (plano de saída + entrada), Devolução de Cheque/Adiantamento, Abatimento Custo Obra.

### 5.3 Cheques
`Caixa e Bancos › Cheques › Emissão de Cheques` — cheques avulsos (Saque com cheque ou Transferência bancária). Há **controle de cheques recebidos** (custódia de terceiros).

### 5.4 Consulta de Movimentos
`Caixa e Bancos › Consultas › Movimentos`. Filtros: empresa, período, conta, operação, documento, valor. **Filtro de Origem:** Todos / Caixa e Bancos (BC) / Contas a Pagar (CP) / Contas a Receber (CR). Exporta PDF/XLS.

### 5.5 Fechamento de Caixa
`Caixa e Bancos › Fechamento de Caixa` — bloqueia novos movimentos durante a conciliação (integridade de saldo). Abertura/fechamento/reabertura.

### 5.6 Conciliação Bancária
Três abordagens:
- **Manual** — sem extrato digital; alerta que saldos/movimentos anteriores à data serão considerados conciliados.
- **Digital por importação de extrato** — importa extrato do banco; só aparecem bancos com **layout configurado**; mapeia conta do extrato → conta Sienge.
- **Digital por Regra** — cruza automaticamente movimentos por data/valor/operação; não identificados vão p/ conciliação manual. Há **Conferência de Conciliação Digital**.
Utilitários: criar lançamento a partir do extrato; remover conciliação.

### 5.7 Relatórios
- **Extrato de Contas** — lançamentos por conta com saldo atualizado; colunas: Conta, Data, Origem (BC/CP/CR), Histórico, Documento, Saídas, Entradas, Saldo, Conciliação.
- **Extrato Conciliado** — valida lançamentos × extrato bancário.

### 5.8 Integrações
Toda **baixa** gera automaticamente movimento em Caixa e Bancos (pagamento = saída origem CP; recebimento = entrada origem CR). Operações entre empresas (op. 30) usam contas **Mútuo** e são contabilizáveis.

**Fontes:** [Operações de caixa e bancos](https://ajuda.sienge.com.br/support/solutions/articles/153000200797) · [Consultar movimentos](https://ajuda.sienge.com.br/support/solutions/articles/153000235327) · [Cadastro de conta corrente](https://ajuda.sienge.com.br/support/solutions/articles/153000200581) · [Transferência entre empresas (op. 30)](https://ajuda.sienge.com.br/support/solutions/articles/153000200756) · [Emissão de cheque avulso](https://ajuda.sienge.com.br/support/solutions/articles/153000200774) · [Conciliação manual](https://ajuda.sienge.com.br/support/solutions/articles/153000200096) · [Importação de extrato](https://ajuda.sienge.com.br/support/solutions/articles/153000200090) · [Conciliação por regra](https://ajuda.sienge.com.br/support/solutions/articles/153000200783) · [Extrato de Contas](https://ajuda.sienge.com.br/support/solutions/articles/153000200826)

---

## 6. Comissões

**Caminho:** `Comercial › Vendas › Comissões` — integra ao **Contas a Pagar** (gera o título de pagamento ao corretor).

### 6.1 Fluxo (3 etapas)
1. **Previsão de Comissão** — vincula comissão a contrato/corretor.
2. **Autorização de Previsões** — validação (quando exigido por permissão).
3. **Liberação de Comissões** — informa documento, número e vencimento → **gera o título a pagar** (anexo de NF possível).

### 6.2 Telas
- **Controle de Comissões › Previsão de Comissão** — cadastro por contrato/corretor (%, valor, parcelas).
- **Análise de Comissões (novo)** — abas **Por Contrato** e **Por Corretor**; status: 1 Aguardando emissão, 2 Emitido, 3 Distratado. Permissão: ação **9107**.
- **Novo Comissões** — integrado ao CV CRM; regras por empreendimento, edição por parcela, exportação `.xls`/`.csv`, relatórios PDF.

**Fontes:** [Novo Comissões](https://ajuda.sienge.com.br/support/solutions/articles/153000221320) · [Cadastrar comissão de contrato](https://ajuda.sienge.com.br/support/solutions/articles/153000201197) · [Tela de Análise de Comissões](https://ajuda.sienge.com.br/support/solutions/articles/153000201337)

---

## 7. Impostos / Tributos

**Caminho:** cadastro em `Apoio › Impostos`; retenções aplicadas nos títulos; guias geradas no **Contas a Pagar**.

### 7.1 Cadastro de Imposto
`Apoio › Impostos › Cadastros`. Tipos: **INSS, ISS, IR (IRRF)**; também **PIS, COFINS, CSLL** (apuração própria). Campos: Código, Tipo, Nome, Percentual padrão, Período de apuração (decendial/quinzenal/mensal/trimestral/anual), Abrangência, Recolhimento por (emissão/contábil/vencimento/pagamento), Valor mínimo p/ guia, Valor de isenção (Lei 10.833). Contas financeiras: uma p/ Contas a Pagar e outra p/ Contas a Receber. Flags: gerar DIRF/DCTF/informe, imposto como custo de obra, recolhimento por centro de custo, acúmulo até mínimo. **Retenção ocorre na primeira baixa da primeira parcela.**

### 7.2 Retenção e geração de guia (Contas a Pagar)
Aba **Impostos** no título. **Parâmetro 270** controla obrigatoriedade de gerar guia (Não / Sim / Apresentar sendo obrigatório — senão título fica "Incompleto"). Guia emitida em `Contas a Pagar › Relatórios › Impostos › Emissão de Guias`. **Parâmetro 264** controla obrigatoriedade de apropriação de obra na guia. Guia é título origem **GI**.

### 7.3 Apuração PIS/COFINS
`Contabilidade/Fiscal › Obrigações Fiscais › Apuração de Impostos › PIS/COFINS` → detalhamento por código de receita → **Gerar título da guia** (DARF).

**Fontes:** [Cadastrar imposto](https://ajuda.sienge.com.br/support/solutions/articles/153000200665) · [Parâmetro 270 (guias)](https://ajuda.sienge.com.br/support/solutions/articles/153000200084) · [Parâmetro 264 (apropriação obra)](https://ajuda.sienge.com.br/support/solutions/articles/153000200247) · [Apuração PIS/COFINS / DARF](https://ajuda.sienge.com.br/support/solutions/articles/153000200313) · [Identificar título-guia](https://ajuda.sienge.com.br/support/solutions/articles/153000200092)

---

## 8. Fluxo de Caixa

**Caminho:** `Suporte à Decisão › Gerencial Financeiro`. Quatro relatórios; todos com **Tipo de análise**:
- **Realizado** — só parcelas **baixadas** (caixa efetivo).
- **A realizar** — só parcelas **em aberto** (previsão/projeção).
- **Comprometido** — baixadas + em aberto.

> O "previsto/projetado" corresponde ao tipo **A realizar**. O "orçado × realizado" é obtido comparando A realizar/Comprometido contra Realizado (não há tela única rotulada "orçado × realizado").

### 8.1 Fluxo de Caixa Analítico (ação 498)
Máximo detalhe (lançamento a lançamento). Filtros: agrupar por (holding/empresa/obra/centro de custo…), período, documentos, tipo de análise, **conta corrente**, indexador. Colunas: Data, Documento, Título/Parcela, Origem, Cliente/Fornecedor, **Entradas, Saídas, Saldo**.

### 8.2 Fluxo de Caixa Sintético (ação 484)
Consolidado por período; saída em **relatório ou gráfico**; periodicidade diário/mensal; colunas Entradas, Saídas, **Diferença**, **Saldo** acumulado.

### 8.3 Fluxo de Caixa por Plano de Contas (ação 516)
Organiza o fluxo **por conta do Plano Financeiro**. Filtros: período, plano financeiro, tipo de análise, tipo de conta (Resultado/Movimento/Geral), periodicidade, conta corrente, **Visão do plano financeiro**, documentos de previsão, inadimplentes, descontar impostos. Colunas: Código/Conta, Tipo, Acumulado Anterior, Total Período, Total Geral, **%**, Diferença, Saldo, **Disponível**.

### 8.4 Composição do "Realizado"
Só compõe o realizado por conta corrente o lançamento **apropriado E baixado**. Títulos em aberto alimentam **A realizar/Comprometido**; ao baixar, migram p/ Realizado. **Documentos de previsão** reforçam a projeção.

**Fontes:** [Fluxo de Caixa Analítico](https://ajuda.sienge.com.br/support/solutions/articles/153000200876) · [Sintético](https://ajuda.sienge.com.br/support/solutions/articles/153000200873) · [Por Plano de Contas](https://ajuda.sienge.com.br/support/solutions/articles/153000198891) · [Filtro por conta corrente](https://ajuda.sienge.com.br/support/solutions/articles/153000200839)

---

## 9. Integração Bancária

Padrão brasileiro **CNAB** (remessa/retorno), layouts 240 e 400.

- **Cobrança Escritural (Contas a Receber):** remessa registra boletos no banco; retorno dá baixa automática; PIX/recebimentos instantâneos. (ver §4.8)
- **Pagamento Escritural (Contas a Pagar):** lote → remessa → download/transmissão; retorno confirma pagamentos. Ações 1909/1910. (ver §3.7)
- **Conciliação Bancária Digital:** importa extrato; só bancos com layout configurado. (ver §5.6)

**Limites públicos:** lista nominal de bancos homologados e catálogo completo de códigos de ocorrência CNAB **não** são publicados (dependem do layout contratado).

**Fontes:** [Cobrança escritural](https://ajuda.sienge.com.br/support/solutions/articles/153000199775) · [Gerar boletos](https://ajuda.sienge.com.br/support/solutions/articles/153000199739) · [Lote pagamento escritural](https://ajuda.sienge.com.br/support/solutions/articles/153000200070) · [Conciliação digital](https://ajuda.sienge.com.br/support/solutions/articles/153000200090)

---

## 10. Integração Contábil

O Sienge tem Contabilidade própria e transforma a movimentação financeira em **lançamentos contábeis** (com exportação p/ sistemas terceiros). Fluxo:
1. **Parametrizações** (Associações Contábeis, Geração de Lançamentos; regras de provisão: sempre / só na baixa / conforme título).
2. **Plano Contábil** (cadastro/importação).
3. **Associações Contábeis (DE-PARA)** — contas correntes/origens → contas contábeis; validação por **Relatório de Inconsistências**.
4. **Geração do Lote** — agrupa lançamentos; falha se houver inconsistência.
5. **Exportação** p/ sistema contábil externo no layout definido.
Recursos: contabilização **por parcela** (Contas a Receber), relatório **Livro Razão**.

**Fontes:** [Integração contábil](https://ajuda.sienge.com.br/support/solutions/articles/153000200327) · [Configurar contabilidade](https://ajuda.sienge.com.br/support/solutions/articles/153000200423) · [Contabilizar por parcela](https://ajuda.sienge.com.br/support/solutions/articles/153000198866)

---

## 11. API financeira do Sienge

Doc oficial: **https://api.sienge.com.br/docs/** (atualizada diariamente). **Disponível apenas para clientes cloud/DC.**

- **Técnico:** REST, JSON, respostas **paginadas**, **rate limit 200 req/min**, versionamento por recurso (`creditor-v1`). Autenticação: por convenção, credencial de API por subdomínio da empresa — **método exato não confirmado nas páginas públicas** (validar na doc/suporte antes de integrar).
- **Recursos REST financeiros:** Títulos do Contas a Pagar (POST inclusive via NF-e; consulta/alteração), Títulos do Contas a Receber (+ saldo devedor, extrato por e-mail, cobrança de vencidos), **Credores** (`creditor-v1`, GET/POST/PATCH dados bancários), **Clientes**, **Contas-Correntes** (+ GET Saldo), **Planos Financeiros / Centros de Custo / Condições de pagamento**.
- **Bulk Data (consulta em massa + Webhooks):** Parcelas do Contas a Pagar, Movimentos de Caixa e Bancos, Parcelas/receitas do Contas a Receber e inadimplentes, saldos por conta/centro de custo.

**Fontes:** [Doc API](https://api.sienge.com.br/docs/) · [API REST — Credores](https://ajuda.sienge.com.br/support/solutions/articles/153000200200) · [Bulk Data parcelas CP](https://ajuda.sienge.com.br/support/solutions/articles/153000201306) · [Bulk Data movimentos Caixa e Bancos](https://ajuda.sienge.com.br/support/solutions/articles/153000200830)

---

## 12. Relação com o Gestrato e próximos passos

Este mapa serve de referência para o módulo de **Fluxo de Caixa** do Gestrato (que substitui as planilhas financeiras). Correspondências úteis:

| Conceito Sienge | Equivalente / uso no Gestrato |
|-----------------|-------------------------------|
| **Plano Financeiro** (Resultado/Movimento/Totalizadora) | Estrutura de categorias de receita/despesa; base do orçado × realizado |
| **Apropriação/Rateio** (plano + centro de custo, 100%) | Classificação de lançamentos por categoria e centro de custo |
| **Tipo de análise** (Realizado / A realizar / Comprometido) | Realizado × previsto no fluxo de caixa |
| **Título/Parcela + Baixa** | Lançamentos previstos e sua efetivação |
| **Cobrança escritural + régua de inadimplência** | Já espelhado no módulo de cobrança WhatsApp/Twilio e na tela de inadimplentes |
| **API Bulk Data (parcelas CP/CR, movimentos, inadimplentes)** | Fonte potencial para **importar dados reais do Sienge** ao Gestrato |

### Próximos passos sugeridos
1. **Refinar com a instância Roraima:** enviar prints de (a) estrutura do Plano Financeiro cadastrado, (b) centros de custo/obras, (c) contas correntes e bancos configurados, (d) telas de Fluxo de Caixa por Plano de Contas. Esses pontos variam por cliente e não vêm da doc pública.
2. **Avaliar a API para integração:** confirmar com o suporte Sienge se a instância Roraima é **cloud/DC** (pré-requisito da API) e obter as credenciais/autenticação. Se sim, a **Bulk Data** de parcelas e movimentos é o caminho para alimentar o Fluxo de Caixa do Gestrato automaticamente.
3. **Definir o recorte do Gestrato:** decidir quais partes do financeiro o Gestrato replica (fluxo de caixa gerencial, orçado × real) e quais permanecem no Sienge (contas a pagar/receber operacionais, cobrança, contábil).

---

*Documento gerado a partir da documentação pública oficial do Sienge. Cada seção lista suas fontes. Para dúvidas específicas de configuração da instância Roraima, complementar com prints conforme §12.*
