# Migração Sienge → gestrato/nextlote — Análise da origem

> Documento de trabalho. Registra o que foi levantado a partir do backup do sistema legado (Sienge).
> Data da análise: 29/07/2026.

## 1. Identificação do backup

| Propriedade | Valor |
|---|---|
| Arquivo | `sie-10607-1-28072026-diario2.dmpc` (~58,6 MB) |
| Formato | PostgreSQL custom dump (`pg_dump -Fc`, compressão gzip) |
| Banco de origem | `sie-10607-1` |
| Sistema de origem | **Sienge** (ERP Softplan — incorporação/construção/loteamento) |
| Gerado em | 28/07/2026 22:11 (backup diário — "diario2") |
| PostgreSQL da origem | 15.18 |
| Objetos no dump | 17.604 (**2.167 tabelas** + funções, triggers, sequences) |
| Owner dos objetos | `sysdba` |
| Empresa | Loteadora do grupo Roraima Energia — loteamentos "Eldorado" (I, II, III, do Norte) e SPEs administrativas |

## 2. Como a análise foi feita

- Ferramentas: PostgreSQL 17 local (`pg_restore.exe`, `pg_dump.exe`, `psql.exe`) em `C:\Program Files\PostgreSQL\17\bin`.
- **Não foi possível restaurar** num banco local (a senha do usuário `postgres` local não é a padrão). Toda a análise foi feita **offline**, extraindo direto do dump:
  - TOC completo: `pg_restore -l`.
  - Schema completo (DDL): `pg_restore --schema-only -f schema.sql` → 142.899 linhas.
  - Contagem de registros por tabela: `pg_restore --data-only -t <tabela> -f out.tmp` e contagem das linhas de dados no bloco `COPY ... \.`.
- Artefatos gerados (na pasta scratchpad da sessão):
  - `toc.txt` — lista de todos os objetos do dump.
  - `schema.sql` — DDL completo do banco de origem.
  - `tabnames.txt` — lista das 2.167 tabelas.

## 3. Convenção de nomenclatura Sienge

- Colunas: `cd`=código, `nm`=nome, `de`=descrição, `fl`=flag (S/N), `dt`=data, `nu`=número/documento, `pe`=percentual, `vl`=valor, `qt`=quantidade, `tp`=tipo.
- Tabelas: prefixo `e` + módulo. Principais módulos observados:
  - `ecad*` — Cadastros (clientes, empreendimentos, centros de custo, colaboradores)
  - `evnd*` — **Vendas/Contratos** (contrato, unidade, cliente-contrato, distrato, cessão)
  - `ecrc*` — **Contas a Receber** (títulos, parcelas, formas de recebimento)
  - `ecpg*` — Contas a Pagar
  - `efis*` / `enfv*` / `enfr*` — Fiscal e Notas (NF-e, CT-e)
  - `ecoi*` — Custos de obra / orçamento de unidades
  - `esst*` — Estoque, `emed*` — Medições, `eseg*` — Segurança/Usuários

## 4. Volume de dados nas tabelas-chave (contagens reais)

| Tabela | Registros | Conteúdo |
|---|---:|---|
| `ecadempreend` | 8 | Empreendimentos/loteamentos |
| `ecadcliente` | 1.881 | Clientes |
| `ecadendcliente` | 5.619 | Endereços de clientes |
| `ecadfonecliente` | 2.084 | Telefones de clientes |
| `ecadmunicipio` | 5.570 | Municípios (tabela de domínio IBGE) |
| `evndcontrato` | 1.613 | **Contratos de venda** |
| `evndclicontrato` | 1.887 | Clientes vinculados a contratos (titular/cônjuge) |
| `evndunidade` | 814 | **Unidades/lotes** |
| `evndunidadecontr` | 683 | Vínculo unidade ↔ contrato |
| `ecrctitulo` | 1.653 | Títulos a receber |
| `ecrcclititulo` | 1.653 | Clientes por título |
| `ecrcparcela` | **448.495** | **Parcelas a receber** (volume financeiro histórico) |
| `ecpgparcela` | 3.974 | Parcelas a pagar |
| `esegusuario` | 9 | Usuários do sistema |
| `evndcontratodistrato` | 0 | (sem registros) |
| `evndcontratocessao` | 0 | (sem registros) |
| `evndreservaunidade` | 0 | (sem registros) |
| `eslerecebimento` / `eslerecebparcela` | 0 | (sem registros) |

## 5. Modelo de dados da ORIGEM (Sienge) — tabelas relevantes para a migração

### 5.1 Cliente — `ecadcliente` (PK: `cdcliente`)
- `cdcliente` integer NOT NULL — **PK**
- `nmcliente` varchar(80) NOT NULL — nome
- `cdtipocliente` integer
- `deemail` varchar(100)
- `flativo` char(1) NOT NULL
- `nufonecel` varchar(16)
- `fltpcliente` char(1) NOT NULL — tipo (PF/PJ)
- `deskype` varchar(100)
- `nmsenhaportal` / `nmusuarioportal` — acesso ao portal
- `cdprecliente` integer, `flcliente` char(1)
- `cdcredor` integer, `cdclientesac` integer
- `flutilizapcr`, `flautorizabolemail`, `flreceberavisoparc`, `flutilizaportalcliente`, `flconsistenteportalcliente` — flags
- `deconsentimentolgpd` varchar(1000), `flconsentimentolgpd` char(1) — **LGPD**
- `idinternacional` varchar(30), `flestrangeiro` char(1)
- `cdusuariocad` / `dtcadastramento` / `cdusuarioalt` / `dtultalteracao` — auditoria

> Observação: CPF/CNPJ não fica em `ecadcliente`; documentos costumam estar em tabela específica (`ecaddocpessoalcred`/`ecad*doc*` — a confirmar). Conjuge/CPF do cônjuge aparece em `ecrcclititulo` (`nucpfconjuge`).

### 5.2 Endereço do cliente — `ecadendcliente` (PK: `cdcliente` + `tpendereco`)
- `cdcliente` integer NOT NULL, `tpendereco` char(1) NOT NULL
- `cdmunicipio` integer, `deendereco` varchar(100), `cdnumero` varchar(10)
- `decomplemento` varchar(40), `nmbairro` varchar(40)
- `nucep` varchar(9), `nucepint` char(15), `tplogradouro` smallint

### 5.3 Telefone do cliente — `ecadfonecliente` (PK: `cdcliente` + `cdfonecliente`)
- `cdcliente`, `cdfonecliente`, `cdtipotelefone` integer NOT NULL
- `nufone` varchar(18) NOT NULL, `flprincipal` char(1)
- `nuramal` varchar(4), `nuddi` varchar(4), `deobservacao` varchar(40)

### 5.4 Empreendimento — `ecadempreend` (PK: `cdempreend`)
- `cdempreend` integer NOT NULL — **PK**; `cdempreendview` integer NOT NULL
- `nmempreend` varchar(80) NOT NULL; `nmcomercial` varchar(100)
- `cdmunicipio` integer NOT NULL, `nmbairro` varchar(40), `nucep` varchar(9)
- `deendereco` varchar(260), `cdnumero` varchar(10), `decomplemento` varchar(260)
- `nucnpj` varchar(18), `nuinscrestatual` varchar(18)
- `nufone` / `nufax` varchar(16), `deemail` varchar(100)
- `nmresponsavel` varchar(100), `nucpfresponsavel` varchar(14)
- `cdobra` integer, `tpregistro` char(1), `flregconsistente` char(1)
- `dtcadastro` date NOT NULL + auditoria (`cdusuariocad`, `dtcadastramento`, `cdusuarioalt`, `dtultalteracao`)

### 5.5 Unidade/Lote — `evndunidade` (PK: `cdempreend` + `nuunidade`; `cdunidade` id interno)
Campos principais (a tabela tem ~70 colunas):
- `cdempreend` integer NOT NULL, `nuunidade` varchar(50) NOT NULL, `cdunidade` integer NOT NULL
- `cdtipoimovel` integer NOT NULL, `cdsituacao` integer, `cdestilo` integer, `cdetapa` integer
- `qtareapriv`, `qtareacomum`, `qtareaterreno`, `qtareautil`, `qtareadiv` numeric — áreas
- `pefracaoideal`, `qtfracaoideal`, `pefracaovgv` — frações
- `nmmatricula` varchar(15), `nmcartorio`, `nmlivro`, `nuregistro`, `nurg`, `dtescritura`, `dedecreto`, `nualvara`
- `nucontribuinte`, `nminscricaoimobiliaria`, `nuincra`, `nucib` — identificações fiscais/registrais
- Geometria do lote: `qtfrente`/`defrente`, `qtfundo`/`defundo`, `qtladodireito`/`deladodireito`, `qtladoesquerdo`/`deladoesquerdo`, `qtchanfro`/`dechanfro`
- `delatitude`, `delongitude` — coordenadas
- `vlterreno`, `vliptu`, `vlcondominio`, `vladimplencia` numeric — valores
- `nmlocal`, `nupavimento`, `nmmodulo`, `tpclassificacao`, `tpsituacaofinanceira`, `tplocalizacao`, `tpenquadramento`
- `dtdisp` (disponibilidade), `dtpreventrega`, `dtentregaefetiva`, `dthabitese`

### 5.6 Contrato de venda — `evndcontrato` (PK: `nucontrato` + `cdempresa`; `cdcontrato` id interno)
Campos principais (a tabela tem ~80 colunas):
- `nucontrato` varchar(20) NOT NULL, `nucontratoview` varchar(20) NOT NULL, `cdcontrato` integer NOT NULL
- `cdempresa` integer NOT NULL, `cdempreend` integer NOT NULL, `cdplano` integer, `cdproposta` integer
- `dtcontrato` date NOT NULL, `dtemissao`, `dtpreventrega`, `dtentregachaves`, `dtregistroimovel`, `dtfisica`, `dtcontabil`
- `flsituacao` char(1) NOT NULL, `flsituacaodistrato` char(1), `tpcontrato` char(1) DEFAULT 'C', `tpcancelamento`, `tpsubcancelamento`
- `vltotalcontrato` numeric(14,2) NOT NULL, `vltotalvenda` numeric(14,2) NOT NULL, `vlunidade`, `vltaxaadm`, `vlmoradia`, `vlfixoseguro`
- `pedesconto`, `pedevminimo`, `tpdesconto` — descontos
- Correção/juros/mora: `flcorrecao`, `tpcorrecaoanual`, `numesreajuste`, `cdindexmora`, `cdindexpreobra`, `cdindexposobra`, `pejuromora`, `pemultamora`, `tpjuromora`, `pejuros`, `tpjuros`, `flcalculomulta`
- Seguro: `flseguro`, `fltiposeguro`, `peseguromip`, `pesegurodfi`, `dtinicioseguro`
- `nutitulo` integer, `nutitulooriginal` — vínculo com título a receber
- `deobservacao`, `dedetalhe`, `declausulaesp`
- Financiamento: `nucontratofinanciamento`, `destatusfinanciamento`, `nuinstituicaofinanceira`, `flcreditoassociativo`, `flmcmv`
- `nuidentificadorexterno` varchar(100), auditoria (`dtcadastramento`, `dtultimaatualizacao`)

### 5.7 Cliente ↔ Contrato — `evndclicontrato` (PK: `nucontrato` + `cdempresa` + `cdcliente`)
- `nucontrato`, `cdempresa`, `cdcliente`, `cdempreend`
- `flprincipal` char(1) NOT NULL — titular principal
- `flconjuge` char(1) — se é cônjuge
- `peparticipacao` numeric(7,4), `peseguro` numeric(9,6)

### 5.8 Unidade ↔ Contrato — `evndunidadecontr` (PK: `nucontrato` + `nuunidade` + `cdempresa`)
- `nucontrato`, `nuunidade`, `cdempresa`, `cdempreend`
- `flprincipal` char(1) NOT NULL, `peparticipacao` numeric(7,4)

### 5.9 Título a receber — `ecrctitulo` (PK: `nutitulo` + `cdempresa`)
- `nutitulo` integer NOT NULL, `cdempresa` integer NOT NULL, `cdcliente` integer NOT NULL
- `cddocumento` char(4) NOT NULL, `nudocumento` varchar(20)
- `dtemissao`, `dtcadastramento`, `dtquitacao`, `dtdistrato`, `dtcontabil`, `dtultreajuste`
- `qtparcelas` integer NOT NULL, `vltotal` numeric(14,2) NOT NULL
- `flsituacao`, `flinadimplente`, `flcorrecao`, `flseguro`, `flresiduo`, `fljudicie`, `flbloqueiospc`
- Correção/mora: `cdindexmora`, `pejuromora`, `pemultamora`, `tpjuromora`, `numesreajuste`
- `nulote`, `nutitulodevolucao`, `nutituloprincipal`, `cdorigem`, `chorigem`
- `vldesconto`, `pedesconto`, `tpdesconto`, `vltaxaadm`
- `deobservacao`, `decancelamento`, `deinadimplente` (text) + auditoria

### 5.10 Cliente do título — `ecrcclititulo` (PK: `nutitulo` + `cdcliente`)
- `nutitulo`, `cdcliente`, `dtcliente` date, `flsituacao`
- `flprincipal`, `flaprovado`, `peparticipacao`
- Cônjuge: `fltemconjuge`, `nmclienteconjuge` varchar(80), `nucpfconjuge` varchar(14), `peparticipacaoconjuge`

### 5.11 Parcela a receber — `ecrcparcela` (PK: `nutitulo` + `nuparcela`) — **448.495 registros**
Campos principais (~70 colunas):
- `nutitulo` integer NOT NULL, `nuparcela` integer NOT NULL, `nuparcelaview`, `nuordem`
- `cdindexador` integer NOT NULL, `cdtipocondicao` char(2) NOT NULL, `cdportador`, `cdopercobranca`, `tpparcela`
- Datas: `dtbase`, `dtvencto` (vencimento), `dtindexador`, `dtultreajuste`, `dtcompetencia`, `dtalocacao`, `dtbasejur`
- Valores: `vloriginal`, `vlparcelaoriginal`, `vlsaldodevorig`, `vlhistorico`, `vlamortizacao`, `vljuroemb`, `vlseguro`, `vltaxaadm`, `vlcorrecaoacumulada`
- Seguro: `vlsegurodfi`, `vlbasesegurodfi`, `vlsegurofixo`, `vlseguromip`
- Flags: `flsituacao`, `flperiodicidade`, `flcobrescritural`, `fljuros`, `flcorrecao`, `flgerouresiduo`, `flconfirmado`, `flenviadaspc`, `flcontabil`
- Cobrança: `cdnossonumero` varchar(20), `nuconta`, `nmarquivocobranca`, `pejuroemb`, `nuserprice`, `numesreajuste`
- Cessão/resíduo: `nutitulocessao`, `nuparcelaresiduo`, `nuparcelacond`, `flparctaxacessao`
- `deobservacao` (text) + auditoria (`nmusuariocad`, `dtusuariocad`, `nmusuarioalt`, `dtusuarioalt`)

> Observação: os **recebimentos/baixas** (pagamentos efetivos de parcela) não estão em `eslerecebimento` (0 registros). Falta localizar a tabela de baixas de recebíveis (candidatas: `ecrcbaixa*`, `ecrcmov*`, histórico em `ecrcparcelaloghistorico`). **Pendência.**

## 6. Diagrama de relacionamento (origem)

```
ecadempreend (empreendimento)
   └──< evndunidade (lote/unidade)              cdempreend
          └──< evndunidadecontr >── evndcontrato (contrato)   nucontrato+cdempresa
                                        │
ecadcliente (cliente) >── evndclicontrato ──< (titular/cônjuge do contrato)
   │                                     
   ├──< ecadendcliente (endereços)
   ├──< ecadfonecliente (telefones)
   │
   └──< ecrctitulo (título a receber)   cdcliente / cdempresa
          ├──< ecrcclititulo (clientes do título)
          └──< ecrcparcela (parcelas)   nutitulo
                                        (~448k registros)
```

## 7. Pendências / próximos passos

1. **Modelo de destino (gestrato/nextlote):** ainda NÃO mapeado. A exploração do schema de destino (Prisma/entidades de domínio em `api/src`) foi interrompida antes de concluir. É o próximo passo para fechar o de-para.
2. **Tabela de baixas/recebimentos** dos recebíveis: localizar onde ficam os pagamentos efetivos das parcelas.
3. **Documentos (CPF/CNPJ)** dos clientes: localizar a tabela específica (não está em `ecadcliente`).
4. **Tabelas de domínio** a migrar como de-para de códigos: `ecadmunicipio`, indexadores, situações de unidade/contrato, tipos de condição, portadores.
5. ⚠️ **LGPD:** o dump contém dados pessoais reais (nome, endereço, e‑mail, telefone, CPF de cônjuge). Tratar como confidencial.

## 8. Estado da restauração

- PostgreSQL 17 rodando localmente (serviço `postgresql-x64-17`, porta 5432), mas **sem credenciais** conhecidas.
- Para consultas SQL reais (JOINs, agregações), é preciso: a senha do `postgres` local, OU criar uma instância/container temporário e restaurar o dump com `pg_restore -d <db>`.

## 9. Primeira camada aplicada no Gestrato

Foi criada a base de migração incremental:

- `origemSiengeId` nos clientes, empreendimentos, lotes, contratos, parcelas e pagamentos;
- `ImportacaoSienge` e `RegistroImportacaoSienge` para auditoria e relatório de erros;
- comando `npm run migrar:sienge` na API;
- importação de `ecadempreend`, `ecadcliente`, `evndunidade`, `evndcontrato`, `ecrcparcela` e `ecrcbaixa`;
- importação de `ecadcredor`, `ecpgparcela` e `ecpgbaixa` para contas a pagar;
- modelos `Fornecedor`, `ContaAPagar` e `PagamentoContaAPagar`, com vencimento, saldo e histórico de baixas;
- reexecução segura por chave de origem, sem duplicar registros.

O comando lê uma base PostgreSQL restaurada do dump, não o arquivo `.dmpc` diretamente:

```bash
SIENGE_DATABASE_URL=postgresql://usuario:senha@localhost:55432/sie-10607-1 npm run migrar:sienge
```

Clientes sem CPF/CNPJ válido são preservados como `IGNORADO` no relatório da importação, pois o
modelo atual do Gestrato exige documento válido para cobrança. As baixas recebem temporariamente
`TRANSFERENCIA` como forma de pagamento e preservam os códigos originais no campo de observação;
o catálogo de formas do dump não coincide diretamente com o enum do Gestrato e deve ser revisado
antes da operação definitiva.

Para validar o fluxo com poucos registros antes da carga completa, use `SIENGE_LIMITE=10`. Sem esse
limite, a carga considera as 448.495 parcelas e 267.660 baixas encontradas no backup.

### Execução da carga completa

A carga definitiva deve ser feita primeiro em uma cópia do banco de produção:

```powershell
& 'C:\Program Files\PostgreSQL\17\bin\pg_restore.exe' `
  -U usuario_sienge -p 5432 -d sie-10607-1 `
  --no-owner --no-privileges `
  'C:\caminho\sie-10607-1-28072026-diario2.dmpc'

$env:DATABASE_URL = 'postgresql://usuario:senha@localhost:5432/gestrato'
npx prisma migrate deploy
$env:SIENGE_DATABASE_URL = 'postgresql://usuario_sienge:senha@localhost:5432/sie-10607-1'
Remove-Item Env:SIENGE_LIMITE -ErrorAction SilentlyContinue
npm run migrar:sienge
```

O comando não apaga registros do Gestrato. Clientes sem documento válido e contratos sem cliente/lote
válidos ficam no relatório da execução como `IGNORADO`; devem ser tratados antes de considerar a
migração financeira encerrada.

Também foi acrescentado o cadastro de empresas (`ecadempresa` -> `empresas`), com vínculo opcional
das contas a pagar à empresa de origem. Essa base será reutilizada nos próximos módulos de filiais,
fiscal, centros de custo e estoque.

As tabelas `ecadobra` e `ecadcentrocusto` também passaram a ser importadas para `obras` e
`centros_de_custo`, preservando situação, área, orçamento, controles de estoque e código do projeto
de origem. A API expõe consultas paginadas em `/obras` e `/centros-de-custo`.

O primeiro núcleo de estoque também foi implementado: `ecadunidademedida`, `ecstgrupoinsumo`,
`ecstinsumo` e `ecstprecoinsumo` são importados para unidades, grupos, insumos e preços. Os preços
com quatro casas decimais do Sienge são normalizados para centavos, conforme a convenção financeira
do Gestrato, e as chaves de tabela/código são preservadas em `origemSiengeId`. A API consulta esses
dados em `/unidades-medida`, `/grupos-insumo`, `/insumos` e `/insumos/:id/precos`.

O núcleo fiscal foi preparado com documentos e itens (`efisinfofiscal` e `efisitemnotafiscal`),
incluindo valores de ICMS, IPI, ISS, INSS, IR, PIS e COFINS, além dos vínculos com empresa,
fornecedor e cliente. A API expõe `/documentos-fiscais` e `/documentos-fiscais/:id`. Na cópia deste
backup, as tabelas fiscais consultadas estão vazias; por isso a validação confirma o fluxo e o
esquema, mas não produz documentos importados.

O núcleo operacional foi preparado para compras e estoque: `eadcpedidocompra`/`eadcitempedido`
alimentam pedidos de compra, enquanto `eesttipomovimento`, `eestmovimento` e
`eestitemmovimento` alimentam tipos e movimentos de estoque. A API expõe `/pedidos-compra` e
`/movimentos-estoque`. Nesta cópia do backup havia 7 tipos de movimento, mas zero pedidos e zero
movimentos registrados.

Foi acrescentada a consulta calculada de saldo em `/estoque/saldos`, que soma entradas e subtrai
saídas por insumo, sem exigir uma tabela de saldo duplicada. A tela correspondente está disponível
em `/estoque/saldos`. Para custos operacionais, `/obras/:id/resumo-custos` consolida pedidos de
compra, valores e fornecedores vinculados à obra.
