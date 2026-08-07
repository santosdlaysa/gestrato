# Mapeamento do Módulo Financeiro — Instância Roraima (`roraima.sienge.com.br`)

> **Escopo:** árvore **real** de telas do módulo **Financeiro** da instância da **RORAIMA HABITACIONAL LTDA**, levantada navegando o sistema logado (Sienge Plataforma).
> **Instância:** Base RORAIMA HABITACIONAL LTDA · Código 10607/1 · Versão 9.0.4-73.
> **Data:** agosto/2026.
> **Complementa** o documento de referência [`mapeamento-financeiro-sienge.md`](./mapeamento-financeiro-sienge.md) (baseado na documentação oficial). Aqui está o que **realmente existe no menu** desta instância — que difere em alguns pontos do padrão documentado (ex.: submódulos **Integração Folha de Pagamento**, **Gestão de Crédito**, **Cessão de Direitos**, **Condomínios**).

O módulo é acessado pelo ícone **FIN** na barra lateral. Estrutura de topo:

1. Contas a Receber
2. Contas a Pagar
3. Caixa e Bancos
4. Integração Folha de Pagamento
5. Gestão de Crédito
6. Apoio (cadastros/parametrizações do próprio Financeiro)

> Os cadastros globais **Plano Financeiro, Contas Correntes, Indexadores, Impostos, Centros de Custo, Credores, Clientes** ficam no módulo **Apoio global** (menu de módulos → "Apoio", fora do FIN), mas são a base do financeiro. O Financeiro › Apoio traz apenas as parametrizações operacionais e as **Tabelas de Equivalência** (DE-PARA) que referenciam esses cadastros. Esses cadastros-base estão detalhados na §7.

> **Empresas da instância:** há duas empresas ativas — **0001 – Roraima Habitacional Ltda** e **0002 – Loteamento Eldorado II SPE LTDA**.

---

## 1. Contas a Receber

- **Dashboard** *(novo)*
- **Títulos**
- **Consulta de parcelas** *(novo)*
- **Baixa**
  - Inclusão
  - Alteração/Exclusão
  - *Leitura CIELO:* Identificação de Parcelas · Leitura
  - *Baixa por Importação de Arquivos:* Identificação de Contratos · Leitura do Arquivo – Crédito Associativo
- **Reparcelamentos**
  - Reparcelamento *(novo)* · Inclusão · Exclusão · Relatório · Relatório *(novo)* · Gestão de Simulações
- **Reajuste Programado**
  - Inclusão · Exclusão
- **Outras Funções**
  - Acompanhamento Correção Monetária · Alocação de Parcelas · Alteração na Taxa Administrativa · Distratos · Importação de Títulos · Entrega de Chaves · Quitações · Repactuações · Substituições · Reenvio de E-mail
- **Cobrança Escritural**
  - Geração de Arquivo Remessa · Impressão de 2ª Via · Leitura *(novo)* · Situação das Parcelas · Rateio de Crédito · Download de Arquivo Remessa · Notificação de Cobrança · Configuração
- **Controle de Inadimplência**
  - Inadimplência · Títulos em Cobrança · Configuração · Configuração de Notificação de Inadimplência
  - *Integração Serasa:* Configuração · Exportação PEFIN · Remessa Informacional · Leitura PEFIN
- **Condomínios**
  - Títulos · Geração de Parcelas
- **Cessão de Direitos**
  - Solicitação · Aprovação
- **Controle de Cheques Recebidos**
  - Operação com Cheques · *Relatórios:* Situação dos Cheques · Recibo de Resgate
- **Verificação de Alterações**
- **Consultas de Títulos**
- **Relatórios**
  - Contas a Receber · Contas Recebidas · Extratos ▸ · Contratos Anuais ▸ · Condomínios ▸ · Seguros ▸ · Saldo de Adiantamento ▸ · Cobrança ▸ · Outros ▸
- **Relatórios Configuráveis**
  - Contas a Receber · Contas Recebidas

---

## 2. Contas a Pagar

- **Títulos**
- **Consulta de parcelas** *(novo)*
- **Alteração de Títulos/Parcelas**
- **Substituição de Previsão Financeira**
- **Documentos Enviados**
- **Rateio Padrão**
- **Aprovação de Títulos por Orçamento**
- **Financiamento Bancário**
  - Financiamento Bancário · Juros Pós-fixado · *Relatórios:* Financiamento Bancário
- **Autorização de Pagamento**
  - Alçadas de Autorização de Pagamento · Ciência de Títulos · Autorização de Pagamento · *Relatórios:* Autorizações da Parcela
- **Baixas**
  - Inclusão · Alteração/Exclusão · *Estorno:* Inclusão · Exclusão
- **Pagamento Escritural**
  - Alçada · Configuração · Transferências Bancárias · Programações de Pagamento · Autorização de Pagamento · Gerações de Arquivo · Leitura de Arquivo de Retorno · Leitura de Arquivo DDA · Cancelamentos de Lote · Relatórios ▸
- **Administração de Obra**
  - Cobrança · Importação de Títulos · *Relatórios:* Análise do Comprometido da Obra
- **Consultas**
  - Títulos · Parcelas
- **Relatórios**
  - Contas a Pagar · Contas Pagas · Extrato do Credor · Ficha de Compromisso · Autorização de Pagamento · Demonstrativo de Pagamento · Saldos de Credores · Títulos por Data · Documentos por Fornecedor · Totais por Fornecedor · Emissão de Mala Direta · Fiscal · Baixas sem Cheques · Administração de Obras – Contas a Pagar · Documentos com Numeração Repetida · Impostos ▸ · Adiantamentos ▸
- **Relatórios Configuráveis**
  - Contas a Pagar · Contas Pagas

---

## 3. Caixa e Bancos

- **Inicialização de Saldos**
- **Movimentações**
- **Conciliação Bancária**
  - Manual · Extrato OFX
  - *Digital:* Importação do Extrato · Exclusão de Extrato · Conciliação por Regra · Conciliação por Usuário · Conferência de Conciliação *(novo)*
- **Abertura de Caixa**
- **Reabertura de Caixa**
- **Fechamento de Caixa**
- **Cheques**
  - Lotes de Cheques · Emissão de Cheques · Reemissão de Cheques · Operações com Cheques · *Estorno de Cheques:* Inclusão · Exclusão
- **Consultas**
  - Movimentos · Saldos
- **Relatórios**
  - Extrato de Contas · Extrato de Contas *(novo)* · Posição de Saldos · Comprometido com Pagamento Escritural · Mapa de Contas Correntes · Resumo de Movimentações · Movimentos de Caixa · Extrato Conciliado · Extrato Conciliado *(novo)* · Saldos Conciliados · Cheques Emitidos · Cheques Pré-Datados · Cheques não Conciliados · Lotes de Cheques · Saldo Sienge X Conciliado · Saldo Sienge X Conciliação Digital · Carta de Transferência

---

## 4. Integração Folha de Pagamento

- **Importação Folha de Pagamento** — importa a folha e gera títulos a pagar. Campos da tela: Competência*, Arquivo para importação* (ESCOLHER ARQUIVO), Data emissão*, opção "Agrupar apropriação de obra"; grade de resultado com Verba, Centro de custo, Credor, Nome, Valor, Vencimento, Obra, Unidade construtiva, Item do orçamento, Departamento.
- **Verbas**
- **Configuração com Serviço para Integração**

---

## 5. Gestão de Crédito

- **Dashboard** *(novo)*
- **Cronograma de Obras** *(novo)*

---

## 6. Apoio (parametrizações do Financeiro)

- **Contas a Receber**
  - Operações de Cobranças · Portadores · *Aditivos:* Modelos · Parâmetros · *Cartão de Crédito/Débito:* Bandeiras · Configuração
- **Contas a Pagar**
  - Intervalo de Vencimento · Calendário de Vencimentos · Download de Anexos de Títulos · Formas de Pagamento · Locais · *Emissão de Guias:* Modelos · Parâmetros
- **Caixa e Bancos**
  - Parâmetros para Lançamentos do Extrato · Modelos de Cheque · Configuração Integração AppCheque · Configuração Extrato Digital
- **Adiantamentos**
  - Inicialização de Saldos de Clientes · Inicialização de Saldos de Credores · Realocação de Saldo de Credor
- **Mala Direta**
  - Modelo · Parâmetros
- **Tabelas de Equivalência** *(DE-PARA para integrações)*
  - Credor · Município · Indexador · Imposto · Centro de Custo · Plano Financeiro · Documentos
- **Folgas/Feriados**
- **Configurações de Autorização**
- **Parâmetros do Plano Financeiro**
- **Serviços**

---

## 7. Cadastros-base e telas reais (módulo Apoio global)

Acesso: menu de módulos (ícone **⋯ / Mais opções** na barra lateral) → **Apoio**. O módulo Apoio contém: LGPD · Documentos · **Planos Financeiros** · Logomarcas · Pessoas · Obras/Centros de Custo · Empresas · Departamentos · **Contas Correntes** · **Indexadores** · **Impostos** · Localidades · Insumos · Modelos · Produtos/Serviços · Fiscal · Certificados Digitais · Relatórios · Relatórios Configuráveis.

### 7.1 Plano Financeiro (`Apoio › Planos Financeiros` — `#/common/page/1022`)

Tela **Cadastro de Plano Financeiro**: grade hierárquica com colunas **Conta · Descrição · Tipo (Totalizadora/Resultado/Movimento) · Redut. (redutora) · Ativa · Adiant. · Ref. Imp.**, campo **Localizar**, link **Substituição de Contas Financeiras** e botão **Salvar**. Ícones por linha: excluir, inserir e adicionar conta-filha.

**Árvore real cadastrada (resumo):**

- **1 — ENTRADAS/RECEITAS** *(Totalizadora)*
  - **1.01 Receita Operacional Líquida**
    - 1.01.01 Receita Operacional Bruta: Receitas de Serviços · Receitas de Vendas de Lotes · Receitas de Projetos e Desenvolvimentos · Receitas de Locações de geradores e veículos · Receitas de Administração · Recebimento Aluguel Brazil Farm · (-) Cancelamentos
    - 1.01.02 (-) Impostos Diretos sobre Faturamento: (-) ISS s/ Serviços · (-) PIS s/ Faturamento · …
  - **1.02 (Ingressos financeiros/operações)**
    - 1.02.02 Empréstimos e Financiamentos: Financiamento para Construção · Financiamento de Capital de Giro Sicredi RR · Adiantamento de Clientes · Recbto Empréstimo – Fluxo de Caixa – Brazil Farm · Financiamento de Capital de Giro Sicredi Dracena · Crédito Rotativo · (-) Devolução de Empréstimo · (-) Anulação de Receitas de Empréstimos
    - 1.02.03 Repasses: Seguros · Condomínio · IPTU · …
    - 1.02.04 …: Aluguel de veículos · …
  - **1.03 Ingressos Não Operacionais**
    - 1.03.01 Receitas Financeiras: Restituições de Tarifas e Estornos Bancários · Rendimentos de Conta-Corrente · Rendimentos de Conta-Poupança · Receita de Aplicações Financeiras · (-) Anulação de Receitas
    - 1.03.02 Inversões: Resgate de Aplicações · Desbloqueios Judiciais · Ações Judiciais
    - 1.03.03 Variações Financeiras: Multas e Acréscimos Recebidos · …
  - **1.09 Retenções (ativas)**
    - 1.09.01: IRRF PF · IRRF PJ · INSS · …
    - 1.09.02 Outras Retenções Ativas: Caução de Serviços de Fornecedores · Sinal Recebido de Clientes · Retenção por Permutas
- **2 — SAÍDAS/CUSTOS/DESPESAS** *(Totalizadora)*
  - **2.01 Custos/Despesas Operacionais**
    - 2.01.01 Materiais e Insumos Aplicados nas Obras e Projetos: Aquisição de Bens Imóveis – Terrenos · Mão de Obra Contratada · Insumos · …
    - 2.01.03 Outros Gastos com Mão de Obra Própria: Adiantamento e Vales · Alimentação · Transporte · Custeio de Treinamento · Estagiários · Assistência Médica · Assistência Odontológica · Seguros · Uniformes e EPIs · Medicina Ocupacional · Custo de Rescisões
    - 2.01.06 … Segurança
    - 2.01.07 Administração: Material de Escritório · Material de Copa e Limpeza · Assinatura de Periódicos · Anúncios e Publicações · Despesas Postais · Móveis e Utensílios · Manutenção de Móveis e Utensílios · Despesas com Cartórios e Legalizações · Traslados e Deslocamentos · Doações · Confraternização
    - 2.01.10 …: Verba de Representação · Mídia Impressa · Brindes · Feiras e Exposições · Comissão de Venda · Comissão Corretores (Smart, JP Serviços e Valmir)
  - **2.02 Despesas da Sociedade**
    - 2.02.01 Retirada dos Sócios: Pró-Labore · Gratificações · Dividendos · Retirada Adm Sr Paulo Porteiro · Devolução Pix Clientes · (-) Reembolso Diversos
  - **2.03 Custos/Despesas Financeiras**
    - 2.03.01: Taxa de Aquisição de Crédito · Juros sobre Empréstimos · Pagamento Cartão de Crédito – SICOOB · Pagamento Cartão de Crédito – SICREDI DRACENA · Taxa de Crédito Rotativo
    - 2.03.02 Inversões: Aplicações Financeiras · Adiantamento a Fornecedores · (-) Devolução de Adiantamento a Fornecedores
    - 2.03.03 Variações Financeiras: Multas e Acréscimos · Descontos Cedidos · Variações Monetárias Passivas
  - **2.04 Operações Financeiras / Tributárias**
    - 2.04.06 Operações Financeiras: IOF
    - 2.04.07 Autuações e Infrações: Multas e Correções por Atraso no Pagamento · Autuações Fiscais · Infrações de Trânsito · Infrações Ambientais (ruído, limpeza, licenças)
  - **2.09 Retenções (passivas)** *(Totalizadora)*
    - 2.09.01 Impostos Retidos por Clientes: PIS/COFINS/CSLL · PIS · COFINS · ISS · IRRF PF · IRRF PJ · INSS
    - 2.09.02 Outras Retenções Passivas: Caução de Serviços para Clientes · Sinal pago a Fornecedores · Retenção por Permutas

> As contas marcadas com "(-)" são **redutoras**. O plano tem **2 grupos** (1 Entradas/Receitas e 2 Saídas/Custos/Despesas). **Este plano é o mapa direto das categorias de receita/despesa a espelhar no Fluxo de Caixa do Gestrato.**

### 7.2 Contas Correntes (`Apoio › Contas Correntes › Cadastros` — `#/common/page/943`)

Tela de consulta (filtros: Conta · Nome · Banco · Empresa · "Apresentar somente contas ativas"). Colunas: **Conta · Nome · Banco · Agência · Empresa · Tipo da conta · Ativa**. Submenu: **Cadastros** e **Bancos**.

**Contas cadastradas (reais):**

| Conta | Nome | Banco | Agência | Empresa | Tipo |
|-------|------|-------|---------|---------|------|
| 0000000001 | Mútuo1 | — | — | 0001 Roraima Habitacional | Mútuo |
| 0000003022 | Sicredi Dracena Cartão de Crédito | Sicredi | 003022 | 0001 | Bancária |
| 0000099834 | Itaú – Roraima Habitacional LTDA | Banco Itaú Unibanco | 000445 | 0001 | Bancária |
| 0000231155 | Sicredi Celeiro MT | Sicredi | 000812 | 0001 | Bancária |
| 0000416339 | Sicoob – Roraima Habitacional LTDA | Bancoob | 003315 | 0001 | Bancária |
| 3315-1 | Conta Cartão de Crédito | Bancoob | 003315 | 0001 | Bancária |
| 93023-1 | Sicredi Dracena | Sicredi | 003022 | 0001 | Bancária |
| CAIXA | CAIXA | — | — | 0001 | Caixa |
| EMISSAOCHQ | EMISSAOCHQ | — | — | 0001 | Cheque |
| 0000000002 | Mútuo2 | — | — | 0002 Loteamento Eldorado II SPE | Mútuo |

Bancos utilizados: **Sicredi, Itaú, Sicoob/Bancoob**.

### 7.3 Indexadores (`Apoio › Indexadores`)

Submenu: **Cadastros** e **Valores dos Indexadores**. Tela **Cadastro de Indexadores** com colunas: Código · Nome · Código da Série BCB · Sigla da moeda · Retroatividade Receitas · Retroatividade Despesas · Modo de correção · Periodicidade · Ativo · Atualização automática. *(Apenas indexadores com modo de correção "Percentual" têm atualização automática.)*

**Indexadores cadastrados (reais):**

| Cód | Nome | Série BCB | Modo de correção | Periodicidade | Ativo | Atualiz. automática |
|-----|------|-----------|------------------|---------------|-------|---------------------|
| 0 | REAL | — | Valor | Mensal | Sim | — |
| 1 | IPCA | 433 | Percentual | Mensal | Sim | Sim |
| 2 | IPCA2 | 433 | Percentual | Mensal | Sim | Sim |
| 3 | INCC | — | Percentual | Mensal | Sim | Não |

### 7.4 Impostos (`Apoio › Impostos`)

Submenu: **Cadastros** · **Tabela do Imposto de Renda** · **Vincula Impostos com Orçamento**. Tela **Impostos** com filtros Código · Nome · Tipo · Abrangência (Municipal/Estadual/Federal) e flags de uso em NFS-e (recepção/emissão).

**Impostos cadastrados (reais):** CAUCAO (Caução) · COFINS · CSLL · CSRF (Contribuições Sociais Retidas na Fonte) · ICMS · INSS · INSS 2% (CPRB) · INSS 2100 (s/ Folha) · INSS 2631 (11% Terceiros) · INSS PRO (s/ Pró-labore) · INSS RPA (s/ Autônomo) · IR (Imposto de Renda) · IR 0561 (s/ Salário e Pró-labore) · IR 0588 (Retido s/ RPA) · ISS · PIS — todos de abrangência **Federal**; tipos INSS/IRRF/COFINS/CSLL/CSRF/ICMS/CPREV/OUTROS.

---

## 8. Telas operacionais e gerenciais reais capturadas

- **Consulta de títulos a pagar** *(nova tela — `#/financeiro/contas-pagar/titulos`)*
  - Filtros: Título · Empresa · Centro de custo · Credor · Nº documento · Situação do título · Valor original inicial/final · Emissão inicial/final · Vencimento inicial/final · **Mais filtros** · Limpar · Consultar.
  - Abas **Sintético / Analítico**; barra: Colunas · Filtros · Densidade · Visões Salvas · Salvar Visão · **Gerar Relatório**.
  - Colunas: Título · Cód empresa · Nº documento · Data emissão · Credor · Origem · Criado por IA · Valor original (soma) · Valor líquido (soma) · Ações (editar/duplicar).
  - **Ações de Cadastro** → **Novo título** e **Novo título com IA** (preenche dados automaticamente).

- **Cadastro de Títulos a Pagar** *(`#/common/page/1608`)* — campos:
  - *Cabeçalho:* Título (auto) · Consistência do registro (ex.: "Em inclusão") · **Documento*** · **Número do documento*** · **Empresa*** · **Credor*** · **Data de emissão*** · Observação · **Valor total*** · **Parcelas*** · Valor do desconto.
  - *Informações para a Contabilidade:* **Data contábil*** · Conta contábil · **Contabilizar apenas a baixa** (checkbox).
  - *Informações para Geração das Parcelas:* **Indexador*** (0 REAL) · **Data base*** · **Data 1º vencimento***.
  - *Apropriação de Despesas por Centro de Custo:* grade **Centro de custo · Plano financeiro · Valor · Percentual** + botões **Rateio Padrão** e **Adicionar**.
  - *Informações de Controle:* Cadastrado por · Alterado por · Data de cadastramento · Data da última alteração · Origem · Valor total (+) · Valor desconto (−) · Impostos retidos (−) · Valor líquido (=).

- **Consulta de Títulos a Receber** *(nova tela — `#/financeiro/contas-receber/titulos/consultas`)* — na Roraima os títulos a receber são **gerados pelos contratos de venda** (origem **CO**, observações de quadra/lote, ex.: "QD 25 LT 99"). Filtros: Título · Empresa · Centro de Custo · Cliente · Documento · Nº documento · Situação do título · Emissão início/fim. Colunas: Título · Cód. empresa · Empresa · Documento · Nº documento · Data emissão · Cód. cliente · Cliente · Valor total (soma) · Origem · Observação · Ações. Botão **NOVO TÍTULO**. Existe também a **Consulta de parcelas** a receber (`#/financeiro/contas-receber/consulta-parcelas`) com coluna extra de **negativação/Status da parcela**.

- **Cadastro de Títulos a Receber** *(`#/common/page/1223`)* — análogo ao a pagar, com diferenças:
  - *Cabeçalho:* Título (auto) · **Empresa*** · **Cliente*** · **Documento*** · **Número do documento*** · **Data de emissão*** · Observação · **Valor total*** · **Parcelas*** · ☐ **Solicitar nota fiscal** · ☑ **Permitir envio de boleto por e-mail**.
  - *Contabilidade:* Contabilizar apenas a baixa · Data contábil* · Conta contábil.
  - *Geração das Parcelas:* Indexador* · Data base* · Data 1º vencimento*.
  - *Apropriação de **Receitas** por Centro de Custo* (grade com plano financeiro).

- **Relatório de Fluxo de Caixa por Plano de Contas** *(`Suporte à Decisão › Gerencial Financeiro` — `#/common/page/516`)* — filtros reais:
  - **Agrupar por*** · Documentos · **Plano financeiro** · **Período*** · **Nível de apresentação** (5) · **Indexador de correção*** (REAL) · Apresentação em (REAL) · Correção até · Portador · Operação de cobrança · Disponível em · **Conta corrente** · **Visão do plano**.
  - **Tipo de análise:** Realizado · Comprometido · **A realizar** *(padrão)*.
  - **Periodicidade:** Diário · **Mensal** *(padrão)*.
  - **Tipo de conta:** Resultado · Movimento · **Geral** *(padrão)*.
  - Opções: Calcular somatório anterior ao período · **Considerar documentos de previsão** *(✓)* · Incluir títulos inadimplentes · **Considerar disponível** *(✓)* · Considerar no disponível as contas do tipo caixa *(✓)* · Considerar no disponível as contas do tipo investimento *(✓)*.
- **Fluxo de Caixa Analítico** *(`#/common/page/499`)* — máximo detalhe (lançamento a lançamento). Mesmos filtros do "por Plano de Contas" + **Ordenar por** (Título/Parcela) e ☐ **Apresentar observações dos títulos**. Botões: Visualizar · Opções · Agendar · Limpar.

- **Fluxo de Caixa Sintético** *(`#/common/page/484`)* — consolidado. Distintivos: **Formato de saída** (Relatório / Gráfico) · **Seleção por** (Data de vencimento/pagamento) · **Periodicidade** (Diário / Mensal).

- **Fluxo de Caixa Conciliado** *(`#/common/page/5129`)* — Distintivos: **Forma de apresentação** (Sintético / Analítico) · ☑ **Considerar cheque pré-datado não conciliado como movimento a realizar**.

  > Versões dos relatórios de fluxo também existem em **Orçamento Empresarial › Relatórios** (Sintético, por Plano de Contas).

- **Inicialização de Saldos** (Caixa e Bancos — `#/common/page/1048`): parâmetros Empresa* e Conta corrente*.
- **Importação Folha de Pagamento** (`#/common/page/2920`): ver §4.

---

## Diferenças notáveis vs. documentação oficial

- A instância tem **Integração Folha de Pagamento** e **Gestão de Crédito** como submódulos do Financeiro (não aparecem no mapa genérico).
- Contas a Receber inclui **Cessão de Direitos** e **Condomínios** (perfil de incorporadora/loteadora).
- Conciliação Bancária oferece **Extrato OFX** e **Conciliação por Regra/por Usuário** além do manual.
- Cobrança/Inadimplência tem **Integração Serasa (PEFIN)** configurada no menu.
- Vários itens marcados *(novo)* indicam telas recém-atualizadas da plataforma (Dashboard CR, Consulta de parcelas, Extrato de Contas, Extrato Conciliado, Conferência de Conciliação, Reparcelamento).

---

## Cobertura

Mapeamento **completo** da instância:
- **Menu do Financeiro** — todos os submódulos e telas (§§1–6).
- **Cadastros-base** (Apoio global, §7) — Plano Financeiro (árvore real completa, grupos 1 e 2), Contas Correntes (10 contas reais), Indexadores (REAL/IPCA/IPCA2/INCC), Impostos (lista real).
- **Telas operacionais e gerenciais** (§8) — Consulta e Cadastro de Títulos a Pagar e a Receber, e os 4 relatórios de Fluxo de Caixa (por Plano de Contas, Analítico, Sintético, Conciliado).

Não há pendências de mapeamento. Evoluções futuras seriam de **integração** (ver §12 e a API na doc de referência), não de documentação de telas.
