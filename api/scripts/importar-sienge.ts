import { PrismaClient, type Prisma } from '@prisma/client';
import { Pool } from 'pg';

/**
 * Importa a primeira camada do Sienge sem apagar nada do Gestrato.
 *
 * A fonte e um PostgreSQL restaurado a partir do .dmpc. O dump nao e aberto
 * diretamente pelo Prisma: restaure-o em uma base temporaria e informe
 * SIENGE_DATABASE_URL. Cada registro recebe uma chave de origem, portanto a
 * execucao pode ser repetida depois de corrigir uma falha.
 */

const prisma = new PrismaClient();
const fonte = new Pool({
  connectionString: process.env.SIENGE_DATABASE_URL,
  max: 4,
});
const limiteDeTeste = Number.parseInt(process.env.SIENGE_LIMITE ?? '', 10);

function limiteSql(): string {
  return Number.isInteger(limiteDeTeste) && limiteDeTeste > 0 ? ` LIMIT ${limiteDeTeste}` : '';
}

type Linha = Record<string, unknown>;

function texto(valor: unknown): string | null {
  if (valor === null || valor === undefined) return null;
  const resultado = String(valor).trim();
  return resultado === '' ? null : resultado;
}

function inteiro(valor: unknown, padrao = 0): number {
  const numero = Number(valor);
  return Number.isFinite(numero) ? Math.trunc(numero) : padrao;
}

function centavos(valor: unknown): number {
  const numero = Number(valor);
  return Number.isFinite(numero) ? Math.round(numero * 100) : 0;
}

function data(valor: unknown): Date | null {
  const valorTexto = texto(valor);
  if (!valorTexto) return null;
  const iso = valor instanceof Date
    ? `${valor.getUTCFullYear()}-${String(valor.getUTCMonth() + 1).padStart(2, '0')}-${String(valor.getUTCDate()).padStart(2, '0')}`
    : valorTexto.slice(0, 10);
  const resultado = new Date(`${iso}T00:00:00.000Z`);
  return Number.isNaN(resultado.getTime()) ? null : resultado;
}

function chave(tabela: string, ...partes: unknown[]): string {
  return `SIENGE:${tabela}:${partes.map((parte) => String(parte)).join(':')}`;
}

function statusDoContrato(linha: Linha): 'ATIVO' | 'QUITADO' | 'CANCELADO' | 'DISTRATADO' {
  if (linha.dtdistrato) return 'DISTRATADO';
  if (texto(linha.flsituacaodistrato)) return 'DISTRATADO';
  if (linha.dtquitacao) return 'QUITADO';
  // O catalogo de situacoes do backup veio vazio. O codigo original fica
  // preservado em observacoes e o contrato permanece cobravel ate a revisao.
  return 'ATIVO';
}

function statusDaParcela(valorOriginal: number, valorPago: number): 'PENDENTE' | 'PAGA' | 'PAGA_PARCIAL' {
  if (valorPago <= 0) return 'PENDENTE';
  return valorPago >= valorOriginal ? 'PAGA' : 'PAGA_PARCIAL';
}

function formaDePagamento(_linha: Linha): 'DINHEIRO' | 'PIX' | 'BOLETO' | 'TRANSFERENCIA' | 'CARTAO' | 'CHEQUE' | 'PERMUTA' {
  // O codigo de forma do Sienge e dependente de catalogo e nao coincide com
  // o enum do Gestrato. Nao fazemos uma equivalencia inventada; o codigo
  // original fica no campo observacoes da baixa.
  return 'TRANSFERENCIA';
}

async function registrar(
  importacaoId: string,
  tabela: string,
  chaveOrigem: string,
  status: 'IMPORTADO' | 'IGNORADO' | 'ERRO',
  entidade?: string,
  idDestino?: string,
  mensagem?: string,
) {
  await prisma.registroImportacaoSienge.upsert({
    where: { importacaoId_tabela_chaveOrigem: { importacaoId, tabela, chaveOrigem } },
    update: { status, entidade, idDestino, mensagem },
    create: { importacaoId, tabela, chaveOrigem, status, entidade, idDestino, mensagem },
  });
}

async function importarEmpresas(importacaoId: string) {
  const { rows } = await fonte.query<Linha>(`
    SELECT e.cdempresa, e.nmempresa, e.nmfantasia, e.nucnpj, e.deemail,
           e.nufone, e.cdmunicipio, e.flativa, m.nmmunicipio, u.sguf AS sguf
    FROM ecadempresa e
    LEFT JOIN ecadmunicipio m ON m.cdmunicipio = e.cdmunicipio
    LEFT JOIN ecaduf u ON u.cduf = m.cduf
    ORDER BY e.cdempresa${limiteSql()}
  `);
  for (const linha of rows) {
    const origem = chave('EMPRESA', linha.cdempresa);
    try {
      const destino = await prisma.empresa.upsert({
        where: { origemSiengeId: origem },
        update: {
          nome: texto(linha.nmempresa) ?? `Empresa ${linha.cdempresa}`,
          nomeFantasia: texto(linha.nmfantasia), documento: texto(linha.nucnpj),
          email: texto(linha.deemail), telefone: texto(linha.nufone),
          cidade: texto(linha.nmmunicipio), uf: texto(linha.sguf),
          ativa: texto(linha.flativa) !== 'N',
        },
        create: {
          origemSiengeId: origem,
          nome: texto(linha.nmempresa) ?? `Empresa ${linha.cdempresa}`,
          nomeFantasia: texto(linha.nmfantasia), documento: texto(linha.nucnpj),
          email: texto(linha.deemail), telefone: texto(linha.nufone),
          cidade: texto(linha.nmmunicipio), uf: texto(linha.sguf),
          ativa: texto(linha.flativa) !== 'N',
        },
      });
      await registrar(importacaoId, 'ecadempresa', origem, 'IMPORTADO', 'Empresa', destino.id);
    } catch (erro) {
      await registrar(importacaoId, 'ecadempresa', origem, 'ERRO', undefined, undefined, String(erro));
    }
  }
  return rows.length;
}

async function importarObras(importacaoId: string) {
  const { rows } = await fonte.query<Linha>(`
    SELECT o.cdobra, o.cdempresa, o.cdtipoobra, o.qtareatotal, o.qtareaterreno,
           o.qtpavimento, o.vlbaseorcado, o.dtinicioobra, o.dtterminoobra,
           o.tpsituacaoobra, o.deendentrega, o.nmbairroentr, o.nucepentrega,
           l.delocal
    FROM ecadobra o
    LEFT JOIN LATERAL (
      SELECT delocal
      FROM ecadlocalobra lo
      WHERE lo.cdobra = o.cdobra
      ORDER BY CASE WHEN lo.flpadraoapontamentos = 'S' THEN 0 ELSE 1 END, lo.cdlocal
      LIMIT 1
    ) l ON true
    ORDER BY o.cdobra${limiteSql()}
  `);
  const empresas = await prisma.empresa.findMany({ where: { origemSiengeId: { not: null } }, select: { id: true, origemSiengeId: true } });
  const porEmpresa = new Map(empresas.map((item) => [item.origemSiengeId!, item.id]));
  for (const linha of rows) {
    const origem = chave('OBRA', linha.cdobra);
    try {
      const nome = texto(linha.delocal) ?? `Obra ${linha.cdobra}`;
      const destino = await prisma.obra.upsert({
        where: { origemSiengeId: origem },
        update: {
          empresaId: linha.cdempresa ? porEmpresa.get(chave('EMPRESA', linha.cdempresa)) : undefined,
          nome, situacaoOrigem: texto(linha.tpsituacaoobra),
          tipoObraOrigem: linha.cdtipoobra == null ? null : inteiro(linha.cdtipoobra),
          areaTotal: linha.qtareatotal == null ? null : Number(linha.qtareatotal),
          areaTerreno: linha.qtareaterreno == null ? null : Number(linha.qtareaterreno),
          pavimentos: linha.qtpavimento == null ? null : inteiro(linha.qtpavimento),
          orcamentoBaseCentavos: linha.vlbaseorcado == null ? null : centavos(linha.vlbaseorcado),
          inicio: data(linha.dtinicioobra), termino: data(linha.dtterminoobra),
          enderecoEntrega: texto(linha.deendentrega), bairroEntrega: texto(linha.nmbairroentr),
          cepEntrega: texto(linha.nucepentrega),
        },
        create: {
          origemSiengeId: origem,
          empresaId: linha.cdempresa ? porEmpresa.get(chave('EMPRESA', linha.cdempresa)) : undefined,
          nome, situacaoOrigem: texto(linha.tpsituacaoobra),
          tipoObraOrigem: linha.cdtipoobra == null ? null : inteiro(linha.cdtipoobra),
          areaTotal: linha.qtareatotal == null ? null : Number(linha.qtareatotal),
          areaTerreno: linha.qtareaterreno == null ? null : Number(linha.qtareaterreno),
          pavimentos: linha.qtpavimento == null ? null : inteiro(linha.qtpavimento),
          orcamentoBaseCentavos: linha.vlbaseorcado == null ? null : centavos(linha.vlbaseorcado),
          inicio: data(linha.dtinicioobra), termino: data(linha.dtterminoobra),
          enderecoEntrega: texto(linha.deendentrega), bairroEntrega: texto(linha.nmbairroentr),
          cepEntrega: texto(linha.nucepentrega),
        },
      });
      await registrar(importacaoId, 'ecadobra', origem, 'IMPORTADO', 'Obra', destino.id);
    } catch (erro) {
      await registrar(importacaoId, 'ecadobra', origem, 'ERRO', undefined, undefined, String(erro));
    }
  }
  return rows.length;
}

async function importarCentrosDeCusto(importacaoId: string) {
  const { rows } = await fonte.query<Linha>(`
    SELECT c.cdcentrocusto, c.cdempresa, c.cdprojeto, c.tpcategoria,
           c.tpsituacaocc, c.flccusoobra, c.flcontrolaestoque, c.peadministracao
    FROM ecadcentrocusto c
    ORDER BY c.cdempresa, c.cdcentrocusto${limiteSql()}
  `);
  const empresas = await prisma.empresa.findMany({ where: { origemSiengeId: { not: null } }, select: { id: true, origemSiengeId: true } });
  const porEmpresa = new Map(empresas.map((item) => [item.origemSiengeId!, item.id]));
  for (const linha of rows) {
    const origem = chave('CENTRO_CUSTO', linha.cdempresa, linha.cdcentrocusto);
    try {
      const destino = await prisma.centroDeCusto.upsert({
        where: { origemSiengeId: origem },
        update: {
          empresaId: linha.cdempresa ? porEmpresa.get(chave('EMPRESA', linha.cdempresa)) : undefined,
          nome: `Centro de custo ${linha.cdcentrocusto}`,
          categoria: texto(linha.tpcategoria), situacaoOrigem: texto(linha.tpsituacaocc),
          usaNaObra: texto(linha.flccusoobra) === 'S', controlaEstoque: texto(linha.flcontrolaestoque) === 'S',
          percentualAdministracao: linha.peadministracao == null ? null : Number(linha.peadministracao),
          observacoes: linha.cdprojeto ? `Projeto Sienge: ${linha.cdprojeto}` : null,
        },
        create: {
          origemSiengeId: origem,
          empresaId: linha.cdempresa ? porEmpresa.get(chave('EMPRESA', linha.cdempresa)) : undefined,
          nome: `Centro de custo ${linha.cdcentrocusto}`,
          categoria: texto(linha.tpcategoria), situacaoOrigem: texto(linha.tpsituacaocc),
          usaNaObra: texto(linha.flccusoobra) === 'S', controlaEstoque: texto(linha.flcontrolaestoque) === 'S',
          percentualAdministracao: linha.peadministracao == null ? null : Number(linha.peadministracao),
          observacoes: linha.cdprojeto ? `Projeto Sienge: ${linha.cdprojeto}` : null,
        },
      });
      await registrar(importacaoId, 'ecadcentrocusto', origem, 'IMPORTADO', 'CentroDeCusto', destino.id);
    } catch (erro) {
      await registrar(importacaoId, 'ecadcentrocusto', origem, 'ERRO', undefined, undefined, String(erro));
    }
  }
  return rows.length;
}

async function importarUnidadesDeMedida(importacaoId: string) {
  const { rows } = await fonte.query<Linha>(`
    SELECT cdunidademedida, deunidademedida, desimbolo, degrandeza, flativo
    FROM ecadunidademedida
    ORDER BY cdunidademedida${limiteSql()}
  `);
  for (const linha of rows) {
    const origem = chave('UNIDADE_MEDIDA', linha.cdunidademedida);
    try {
      const destino = await prisma.unidadeMedida.upsert({
        where: { origemSiengeId: origem },
        update: { nome: texto(linha.deunidademedida) ?? `Unidade ${linha.cdunidademedida}`, simbolo: texto(linha.desimbolo) ?? '?', grandeza: texto(linha.degrandeza), ativa: texto(linha.flativo) !== 'N' },
        create: { origemSiengeId: origem, nome: texto(linha.deunidademedida) ?? `Unidade ${linha.cdunidademedida}`, simbolo: texto(linha.desimbolo) ?? '?', grandeza: texto(linha.degrandeza), ativa: texto(linha.flativo) !== 'N' },
      });
      await registrar(importacaoId, 'ecadunidademedida', origem, 'IMPORTADO', 'UnidadeMedida', destino.id);
    } catch (erro) {
      await registrar(importacaoId, 'ecadunidademedida', origem, 'ERRO', undefined, undefined, String(erro));
    }
  }
  return rows.length;
}

async function importarGruposDeInsumo(importacaoId: string) {
  const { rows } = await fonte.query<Linha>(`
    SELECT cdgrupoinsumo, degrupoinsumo, cdreferencia, cdtipoinsumo, flativo
    FROM ecstgrupoinsumo
    ORDER BY cdgrupoinsumo${limiteSql()}
  `);
  for (const linha of rows) {
    const origem = chave('GRUPO_INSUMO', linha.cdgrupoinsumo);
    try {
      const destino = await prisma.grupoInsumo.upsert({
        where: { origemSiengeId: origem },
        update: { nome: texto(linha.degrupoinsumo) ?? `Grupo ${linha.cdgrupoinsumo}`, referencia: texto(linha.cdreferencia), tipoOrigem: linha.cdtipoinsumo == null ? null : inteiro(linha.cdtipoinsumo), ativo: texto(linha.flativo) !== 'N' },
        create: { origemSiengeId: origem, nome: texto(linha.degrupoinsumo) ?? `Grupo ${linha.cdgrupoinsumo}`, referencia: texto(linha.cdreferencia), tipoOrigem: linha.cdtipoinsumo == null ? null : inteiro(linha.cdtipoinsumo), ativo: texto(linha.flativo) !== 'N' },
      });
      await registrar(importacaoId, 'ecstgrupoinsumo', origem, 'IMPORTADO', 'GrupoInsumo', destino.id);
    } catch (erro) {
      await registrar(importacaoId, 'ecstgrupoinsumo', origem, 'ERRO', undefined, undefined, String(erro));
    }
  }
  return rows.length;
}

async function importarInsumos(importacaoId: string) {
  const { rows } = await fonte.query<Linha>(`
    SELECT i.cdtabela, i.cdinsumo, i.cdunidademedida, i.cdgrupoinsumo,
           i.deinsumo, i.desinonimo, i.nuclassfiscal, i.qttempoentrega,
           i.flativo, i.flcontrolapreco, i.flcontrolaqtde, i.flcontrolaestoque,
           i.deauxiliar
    FROM ecstinsumo i
    ORDER BY i.cdtabela, i.cdinsumo${limiteSql()}
  `);
  const unidades = await prisma.unidadeMedida.findMany({ where: { origemSiengeId: { not: null } }, select: { id: true, origemSiengeId: true } });
  const grupos = await prisma.grupoInsumo.findMany({ where: { origemSiengeId: { not: null } }, select: { id: true, origemSiengeId: true } });
  const porUnidade = new Map(unidades.map((item) => [item.origemSiengeId!, item.id]));
  const porGrupo = new Map(grupos.map((item) => [item.origemSiengeId!, item.id]));
  for (const linha of rows) {
    const origem = chave('INSUMO', linha.cdtabela, linha.cdinsumo);
    try {
      const dados = {
        tabelaOrigem: inteiro(linha.cdtabela), codigoOrigem: inteiro(linha.cdinsumo),
        unidadeId: linha.cdunidademedida ? porUnidade.get(chave('UNIDADE_MEDIDA', linha.cdunidademedida)) : undefined,
        grupoId: linha.cdgrupoinsumo ? porGrupo.get(chave('GRUPO_INSUMO', linha.cdgrupoinsumo)) : undefined,
        nome: texto(linha.deinsumo) ?? `Insumo ${linha.cdinsumo}`,
        sinonimo: texto(linha.desinonimo), classificacaoFiscal: texto(linha.nuclassfiscal),
        tempoEntregaDias: linha.qttempoentrega == null ? null : inteiro(linha.qttempoentrega),
        ativo: texto(linha.flativo) !== 'N', controlaPreco: texto(linha.flcontrolapreco) === 'S',
        controlaQuantidade: texto(linha.flcontrolaqtde) === 'S', controlaEstoque: texto(linha.flcontrolaestoque) !== 'N',
        observacoes: texto(linha.deauxiliar),
      };
      const destino = await prisma.insumo.upsert({ where: { origemSiengeId: origem }, update: dados, create: { origemSiengeId: origem, ...dados } });
      await registrar(importacaoId, 'ecstinsumo', origem, 'IMPORTADO', 'Insumo', destino.id);
    } catch (erro) {
      await registrar(importacaoId, 'ecstinsumo', origem, 'ERRO', undefined, undefined, String(erro));
    }
  }
  return rows.length;
}

async function importarPrecosDeInsumo(importacaoId: string) {
  const { rows } = await fonte.query<Linha>(`
    SELECT p.cdtabela, p.cdinsumo, p.cdpreco, p.vlinsumo, p.dtpreco,
           p.flprecoorcado, p.vlprecoautorizado, p.dtprecoautorizado,
           p.vlcustomedio, p.vlultimocusto, p.dtultimocusto
    FROM ecstprecoinsumo p
    ORDER BY p.cdtabela, p.cdinsumo, p.cdpreco${limiteSql()}
  `);
  const insumos = await prisma.insumo.findMany({ where: { origemSiengeId: { not: null } }, select: { id: true, origemSiengeId: true } });
  const porOrigem = new Map(insumos.map((item) => [item.origemSiengeId!, item.id]));
  for (const linha of rows) {
    const origemInsumo = chave('INSUMO', linha.cdtabela, linha.cdinsumo);
    const insumoId = porOrigem.get(origemInsumo);
    const origem = chave('PRECO_INSUMO', linha.cdtabela, linha.cdinsumo, linha.cdpreco);
    if (!insumoId) {
      await registrar(importacaoId, 'ecstprecoinsumo', origem, 'IGNORADO', undefined, undefined, 'Insumo de preço ainda não importado.');
      continue;
    }
    try {
      const dados = {
        insumoId, codigoPrecoOrigem: inteiro(linha.cdpreco), valorCentavos: centavos(linha.vlinsumo),
        precoAutorizadoCentavos: centavos(linha.vlprecoautorizado), custoMedioCentavos: centavos(linha.vlcustomedio),
        ultimoCustoCentavos: centavos(linha.vlultimocusto), dataPreco: data(linha.dtpreeco),
        dataAutorizacao: data(linha.dtprecoautorizado), dataUltimoCusto: data(linha.dtultimocusto),
        orcado: texto(linha.flprecoorcado) !== 'N',
      };
      const destino = await prisma.precoInsumo.upsert({ where: { origemSiengeId: origem }, update: dados, create: { origemSiengeId: origem, ...dados } });
      await registrar(importacaoId, 'ecstprecoinsumo', origem, 'IMPORTADO', 'PrecoInsumo', destino.id);
    } catch (erro) {
      await registrar(importacaoId, 'ecstprecoinsumo', origem, 'ERRO', undefined, undefined, String(erro));
    }
  }
  return rows.length;
}

async function importarTiposDeMovimento(importacaoId: string) {
  const { rows } = await fonte.query<Linha>(`
    SELECT cdtipomovimento, detipomovimento, tpmovimento, flentrada, flsaida, flcalculocusto, flativo
    FROM eesttipomovimento
    ORDER BY cdtipomovimento${limiteSql()}
  `);
  for (const linha of rows) {
    const origem = chave('TIPO_MOVIMENTO', linha.cdtipomovimento);
    try {
      const dados = { nome: texto(linha.detipomovimento) ?? `Movimento ${linha.cdtipomovimento}`, movimentoOrigem: texto(linha.tpmovimento), entrada: texto(linha.flentrada) === 'S', saida: texto(linha.flsaida) === 'S', calculaCusto: texto(linha.flcalculocusto) === 'S', ativo: texto(linha.flativo) !== 'N' };
      const destino = await prisma.tipoMovimentoEstoque.upsert({ where: { origemSiengeId: origem }, update: dados, create: { origemSiengeId: origem, ...dados } });
      await registrar(importacaoId, 'eesttipomovimento', origem, 'IMPORTADO', 'TipoMovimentoEstoque', destino.id);
    } catch (erro) {
      await registrar(importacaoId, 'eesttipomovimento', origem, 'ERRO', undefined, undefined, String(erro));
    }
  }
  return rows.length;
}

async function importarPedidosDeCompra(importacaoId: string) {
  const { rows } = await fonte.query<Linha>(`
    SELECT p.nupedidocompra, p.cdfornecedor, p.cdobra, p.cdcentrocusto, p.dtpedido,
           p.tpsituacao, p.flautorizacao, p.vltotalitens, p.vldesconto, p.vloutrasdespesas,
           p.vlfrete, p.decondpagamento, p.deenderecoentrega, p.deobservacao, p.deobsautorizacao
    FROM eadcpedidocompra p
    ORDER BY p.nupedidocompra${limiteSql()}
  `);
  const fornecedores = await prisma.fornecedor.findMany({ where: { origemSiengeId: { not: null } }, select: { id: true, origemSiengeId: true } });
  const obras = await prisma.obra.findMany({ where: { origemSiengeId: { not: null } }, select: { id: true, origemSiengeId: true } });
  const porFornecedor = new Map(fornecedores.map((item) => [item.origemSiengeId!, item.id]));
  const porObra = new Map(obras.map((item) => [item.origemSiengeId!, item.id]));
  for (const linha of rows) {
    const origem = chave('PEDIDO_COMPRA', linha.nupedidocompra);
    try {
      const dados = {
        numeroOrigem: inteiro(linha.nupedidocompra), fornecedorId: linha.cdfornecedor ? porFornecedor.get(chave('CREDOR', linha.cdfornecedor)) : undefined,
        obraId: linha.cdobra ? porObra.get(chave('OBRA', linha.cdobra)) : undefined,
        pedidoEm: data(linha.dtpedido) ?? new Date('1900-01-01T00:00:00.000Z'), situacaoOrigem: texto(linha.tpsituacao), autorizado: texto(linha.flautorizacao) === 'S',
        valorItensCentavos: centavos(linha.vltotalitens), descontoCentavos: centavos(linha.vldesconto), outrasDespesasCentavos: centavos(linha.vloutrasdespesas), freteCentavos: centavos(linha.vlfrete),
        valorTotalCentavos: centavos(linha.vltotalitens) - centavos(linha.vldesconto) + centavos(linha.vloutrasdespesas) + centavos(linha.vlfrete),
        condicaoPagamento: texto(linha.decondpagamento), enderecoEntrega: texto(linha.deenderecoentrega), observacoes: [texto(linha.deobservacao), texto(linha.deobsautorizacao)].filter(Boolean).join(' · ') || null,
      };
      const destino = await prisma.pedidoCompra.upsert({ where: { origemSiengeId: origem }, update: dados, create: { origemSiengeId: origem, ...dados } });
      await registrar(importacaoId, 'eadcpedidocompra', origem, 'IMPORTADO', 'PedidoCompra', destino.id);
    } catch (erro) {
      await registrar(importacaoId, 'eadcpedidocompra', origem, 'ERRO', undefined, undefined, String(erro));
    }
  }
  return rows.length;
}

async function importarItensDePedido(importacaoId: string) {
  const { rows } = await fonte.query<Linha>(`
    SELECT i.nupedidocompra, i.n uitempedido, i.cdtabela, i.cdinsumo, i.deitempedido,
           i.qtpedido, i.vlprecounitario, i.vldesconto, i.vlfreteunitario, i.vlprecoestimado, i.deobservacao
    FROM eadcitempedido i
    ORDER BY i.nupedidocompra, i.nuitempedido${limiteSql()}
  `.replace('i.n uitempedido', 'i.nuitempedido'));
  const pedidos = await prisma.pedidoCompra.findMany({ where: { origemSiengeId: { not: null } }, select: { id: true, numeroOrigem: true } });
  const insumos = await prisma.insumo.findMany({ where: { origemSiengeId: { not: null } }, select: { id: true, origemSiengeId: true } });
  const porPedido = new Map(pedidos.map((item) => [item.numeroOrigem, item.id]));
  const porInsumo = new Map(insumos.map((item) => [item.origemSiengeId!, item.id]));
  for (const linha of rows) {
    const origem = chave('ITEM_PEDIDO_COMPRA', linha.nupedidocompra, linha.nuitempedido);
    const pedidoId = porPedido.get(inteiro(linha.nupedidocompra));
    if (!pedidoId) { await registrar(importacaoId, 'eadcitempedido', origem, 'IGNORADO', undefined, undefined, 'Pedido de compra ainda não importado.'); continue; }
    try {
      const dados = { pedidoId, sequenciaOrigem: inteiro(linha.nuitempedido), insumoId: linha.cdtabela && linha.cdinsumo != null ? porInsumo.get(chave('INSUMO', linha.cdtabela, linha.cdinsumo)) : undefined, descricao: texto(linha.deitempedido) ?? `Item ${linha.nuitempedido}`, quantidade: Number(linha.qtpedido) || 0, precoUnitarioCentavos: centavos(linha.vlprecounitario), descontoCentavos: centavos(linha.vldesconto), freteUnitarioCentavos: centavos(linha.vlfreteunitario), precoEstimadoCentavos: centavos(linha.vlprecoestimado), observacoes: texto(linha.deobservacao) };
      const destino = await prisma.itemPedidoCompra.upsert({ where: { origemSiengeId: origem }, update: dados, create: { origemSiengeId: origem, ...dados } });
      await registrar(importacaoId, 'eadcitempedido', origem, 'IMPORTADO', 'ItemPedidoCompra', destino.id);
    } catch (erro) { await registrar(importacaoId, 'eadcitempedido', origem, 'ERRO', undefined, undefined, String(erro)); }
  }
  return rows.length;
}

async function importarMovimentosEstoque(importacaoId: string) {
  const { rows } = await fonte.query<Linha>(`
    SELECT m.cddocumento, m.numovimento, m.cdcentrocustoorig, m.cdcentrocustodest, m.cdobraorig, m.cdobradest,
           m.cdtipomovimento, m.dtmovimento, m.tpregconsistente, m.c dfornecedor, m.deobservacao
    FROM eestmovimento m
    ORDER BY m.dtmovimento, m.numovimento${limiteSql()}
  `.replace('m.c dfornecedor', 'm.cdfornecedor'));
  const tipos = await prisma.tipoMovimentoEstoque.findMany({ where: { origemSiengeId: { not: null } }, select: { id: true, origemSiengeId: true } });
  const fornecedores = await prisma.fornecedor.findMany({ where: { origemSiengeId: { not: null } }, select: { id: true, origemSiengeId: true } });
  const porTipo = new Map(tipos.map((item) => [item.origemSiengeId!, item.id]));
  const porFornecedor = new Map(fornecedores.map((item) => [item.origemSiengeId!, item.id]));
  for (const linha of rows) {
    const origem = chave('MOVIMENTO_ESTOQUE', linha.cddocumento, linha.numovimento);
    try {
      const dados = { documento: texto(linha.cddocumento) ?? '', numeroOrigem: texto(linha.numovimento) ?? '', tipoId: linha.cdtipomovimento ? porTipo.get(chave('TIPO_MOVIMENTO', linha.cdtipomovimento)) : undefined, fornecedorId: linha.cdfornecedor ? porFornecedor.get(chave('CREDOR', linha.cdfornecedor)) : undefined, obraOrigemId: linha.cdobraorig == null ? null : inteiro(linha.cdobraorig), centroOrigemId: linha.cdcentrocustoorig == null ? null : inteiro(linha.cdcentrocustoorig), obraDestinoId: linha.cdobradest == null ? null : inteiro(linha.cdobradest), centroDestinoId: linha.cdcentrocustodest == null ? null : inteiro(linha.cdcentrocustodest), movimentoEm: data(linha.dtmovimento) ?? new Date('1900-01-01T00:00:00.000Z'), consistente: texto(linha.tpregconsistente) === 'S', observacoes: texto(linha.deobservacao) };
      const destino = await prisma.movimentoEstoque.upsert({ where: { origemSiengeId: origem }, update: dados, create: { origemSiengeId: origem, ...dados } });
      await registrar(importacaoId, 'eestmovimento', origem, 'IMPORTADO', 'MovimentoEstoque', destino.id);
    } catch (erro) { await registrar(importacaoId, 'eestmovimento', origem, 'ERRO', undefined, undefined, String(erro)); }
  }
  return rows.length;
}

async function importarItensMovimentosEstoque(importacaoId: string) {
  const { rows } = await fonte.query<Linha>(`
    SELECT i.cddocumento, i.numovimento, i.nuitemmovimento, i.cdtabela, i.cdinsumo, i.cdunidademov,
           i.deitemmovimento, i.qtmovimento, i.vlprecounitario, i.cdcontaorig, i.cdcontadest, i.deobservacao
    FROM eestitemmovimento i
    ORDER BY i.numovimento, i.nuitemmovimento${limiteSql()}
  `);
  const movimentos = await prisma.movimentoEstoque.findMany({ where: { origemSiengeId: { not: null } }, select: { id: true, documento: true, numeroOrigem: true } });
  const insumos = await prisma.insumo.findMany({ where: { origemSiengeId: { not: null } }, select: { id: true, origemSiengeId: true } });
  const porMovimento = new Map(movimentos.map((item) => [`${item.documento}:${item.numeroOrigem}`, item.id]));
  const porInsumo = new Map(insumos.map((item) => [item.origemSiengeId!, item.id]));
  for (const linha of rows) {
    const origem = chave('ITEM_MOVIMENTO_ESTOQUE', linha.cddocumento, linha.numovimento, linha.nuitemmovimento);
    const movimentoId = porMovimento.get(`${texto(linha.cddocumento) ?? ''}:${texto(linha.numovimento) ?? ''}`);
    if (!movimentoId) { await registrar(importacaoId, 'eestitemmovimento', origem, 'IGNORADO', undefined, undefined, 'Movimento ainda não importado.'); continue; }
    try {
      const dados = { movimentoId, sequenciaOrigem: inteiro(linha.nuitemmovimento), insumoId: linha.cdtabela && linha.cdinsumo != null ? porInsumo.get(chave('INSUMO', linha.cdtabela, linha.cdinsumo)) : undefined, unidadeMovOrigem: inteiro(linha.cdunidademov), descricao: texto(linha.deitemmovimento) ?? `Item ${linha.nuitemmovimento}`, quantidade: Number(linha.qtmovimento) || 0, precoUnitarioCentavos: centavos(linha.vlprecounitario), contaOrigem: texto(linha.cdcontaorig), contaDestino: texto(linha.cdcontadest), observacoes: texto(linha.deobservacao) };
      const destino = await prisma.itemMovimentoEstoque.upsert({ where: { origemSiengeId: origem }, update: dados, create: { origemSiengeId: origem, ...dados } });
      await registrar(importacaoId, 'eestitemmovimento', origem, 'IMPORTADO', 'ItemMovimentoEstoque', destino.id);
    } catch (erro) { await registrar(importacaoId, 'eestitemmovimento', origem, 'ERRO', undefined, undefined, String(erro)); }
  }
  return rows.length;
}

async function importarDocumentosFiscais(importacaoId: string) {
  const { rows } = await fonte.query<Linha>(`
    SELECT f.nulancamentofis, f.cdorigem, f.tpregistronf, f.dtemissao, f.dtregistronf,
           f.cdcredornf, f.cdclientenf, f.cdempresanf, f.nudocumento, f.tpserie,
           f.cdtiponota, f.vlcontabil, f.vldescontonf, f.vlfrete, f.vlseguro,
           f.vldespesasaces, f.vlbaseicms, f.vlicmstributado, f.vlipitributado,
           f.vliss, f.vlinss, f.vlir, f.deobservacao
    FROM efisinfofiscal f
    ORDER BY f.nulancamentofis${limiteSql()}
  `);
  const empresas = await prisma.empresa.findMany({ where: { origemSiengeId: { not: null } }, select: { id: true, origemSiengeId: true } });
  const fornecedores = await prisma.fornecedor.findMany({ where: { origemSiengeId: { not: null } }, select: { id: true, origemSiengeId: true } });
  const clientes = await prisma.cliente.findMany({ where: { origemSiengeId: { not: null } }, select: { id: true, origemSiengeId: true } });
  const porEmpresa = new Map(empresas.map((item) => [item.origemSiengeId!, item.id]));
  const porFornecedor = new Map(fornecedores.map((item) => [item.origemSiengeId!, item.id]));
  const porCliente = new Map(clientes.map((item) => [item.origemSiengeId!, item.id]));
  for (const linha of rows) {
    const origem = chave('DOCUMENTO_FISCAL', linha.nulancamentofis);
    try {
      const destino = await prisma.documentoFiscal.upsert({
        where: { origemSiengeId: origem },
        update: {
          origemCodigo: texto(linha.cdorigem) ?? '', tipoOrigem: inteiro(linha.cdtiponota),
          empresaId: linha.cdempresanf ? porEmpresa.get(chave('EMPRESA', linha.cdempresanf)) : undefined,
          fornecedorId: linha.cdcredornf ? porFornecedor.get(chave('CREDOR', linha.cdcredornf)) : undefined,
          clienteId: linha.cdclientenf ? porCliente.get(chave('CLIENTE', linha.cdclientenf)) : undefined,
          numero: texto(linha.nudocumento) ?? String(linha.nulancamentofis), serie: texto(linha.tpserie) ?? '',
          emitidoEm: data(linha.dtemissao) ?? new Date('1900-01-01T00:00:00.000Z'),
          registradoEm: data(linha.dtregistronf) ?? new Date('1900-01-01T00:00:00.000Z'),
          valorContabilCentavos: centavos(linha.vlcontabil), descontoCentavos: centavos(linha.vldescontonf),
          freteCentavos: centavos(linha.vlfrete), seguroCentavos: centavos(linha.vlseguro),
          outrasDespesasCentavos: centavos(linha.vldespesasaces), baseIcmsCentavos: centavos(linha.vlbaseicms),
          icmsCentavos: centavos(linha.vlicmstributado), ipiCentavos: centavos(linha.vlipitributado),
          issCentavos: centavos(linha.vliss), inssCentavos: centavos(linha.vlinss), irCentavos: centavos(linha.vlir),
          pisCentavos: centavos(linha.vlpis), cofinsCentavos: centavos(linha.vlcofins),
          statusOrigem: texto(linha.tpregistronf), observacoes: texto(linha.deobservacao),
        },
        create: {
          origemSiengeId: origem, origemTabela: 'efisinfofiscal', lancamentoOrigem: inteiro(linha.nulancamentofis),
          origemCodigo: texto(linha.cdorigem) ?? '', tipoOrigem: inteiro(linha.cdtiponota),
          empresaId: linha.cdempresanf ? porEmpresa.get(chave('EMPRESA', linha.cdempresanf)) : undefined,
          fornecedorId: linha.cdcredornf ? porFornecedor.get(chave('CREDOR', linha.cdcredornf)) : undefined,
          clienteId: linha.cdclientenf ? porCliente.get(chave('CLIENTE', linha.cdclientenf)) : undefined,
          numero: texto(linha.nudocumento) ?? String(linha.nulancamentofis), serie: texto(linha.tpserie) ?? '',
          emitidoEm: data(linha.dtemissao) ?? new Date('1900-01-01T00:00:00.000Z'),
          registradoEm: data(linha.dtregistronf) ?? new Date('1900-01-01T00:00:00.000Z'),
          valorContabilCentavos: centavos(linha.vlcontabil), descontoCentavos: centavos(linha.vldescontonf),
          freteCentavos: centavos(linha.vlfrete), seguroCentavos: centavos(linha.vlseguro),
          outrasDespesasCentavos: centavos(linha.vldespesasaces), baseIcmsCentavos: centavos(linha.vlbaseicms),
          icmsCentavos: centavos(linha.vlicmstributado), ipiCentavos: centavos(linha.vlipitributado),
          issCentavos: centavos(linha.vliss), inssCentavos: centavos(linha.vlinss), irCentavos: centavos(linha.vlir),
          pisCentavos: centavos(linha.vlpis), cofinsCentavos: centavos(linha.vlcofins),
          statusOrigem: texto(linha.tpregistronf), observacoes: texto(linha.deobservacao),
        },
      });
      await registrar(importacaoId, 'efisinfofiscal', origem, 'IMPORTADO', 'DocumentoFiscal', destino.id);
    } catch (erro) {
      await registrar(importacaoId, 'efisinfofiscal', origem, 'ERRO', undefined, undefined, String(erro));
    }
  }
  return rows.length;
}

async function importarItensFiscais(importacaoId: string) {
  const { rows } = await fonte.query<Linha>(`
    SELECT i.nulancamentonffis, i.nuitemnfinfofiscal, i.cdncmfiscal, i.cdcodfiscalserv,
           i.cdunidademedida, i.qtiteminfofiscal, i.vlprecounitario, i.vltotalitem,
           i.vlbaseicms, i.vlicmstributado, i.vlipitributado, i.vlpis, i.vlcofins,
           i.deiteminfofiscal, i.cdnatoperacao
    FROM efisitemnotafiscal i
    ORDER BY i.nulancamentonffis, i.nuitemnfinfofiscal${limiteSql()}
  `);
  const documentos = await prisma.documentoFiscal.findMany({ where: { origemSiengeId: { not: null } }, select: { id: true, lancamentoOrigem: true, origemSiengeId: true } });
  const porLancamento = new Map(documentos.map((item) => [item.lancamentoOrigem, item.id]));
  for (const linha of rows) {
    const origem = chave('ITEM_DOCUMENTO_FISCAL', linha.nulancamentonffis, linha.nuitemnfinfofiscal);
    const documentoId = porLancamento.get(inteiro(linha.nulancamentonffis));
    if (!documentoId) {
      await registrar(importacaoId, 'efisitemnotafiscal', origem, 'IGNORADO', undefined, undefined, 'Documento fiscal ainda não importado.');
      continue;
    }
    try {
      const dados = {
        documentoId, sequenciaOrigem: inteiro(linha.nuitemnfinfofiscal), produto: texto(linha.deiteminfofiscal),
        ncm: texto(linha.cdncmfiscal), cfop: texto(linha.cdnatoperacao) ?? texto(linha.cdcodfiscalserv),
        unidadeOrigem: linha.cdunidademedida == null ? null : inteiro(linha.cdunidademedida), quantidade: Number(linha.qtiteminfofiscal) || 0,
        precoUnitarioCentavos: centavos(linha.vlprecounitario), totalCentavos: centavos(linha.vltotalitem),
        descontoCentavos: 0, freteCentavos: 0, seguroCentavos: 0,
        baseIcmsCentavos: centavos(linha.vlbaseicms), icmsCentavos: centavos(linha.vlicmstributado), ipiCentavos: centavos(linha.vlipitributado),
        pisCentavos: centavos(linha.vlpis), cofinsCentavos: centavos(linha.vlcofins), observacoes: texto(linha.deiteminfofiscal),
      };
      const destino = await prisma.itemDocumentoFiscal.upsert({ where: { origemSiengeId: origem }, update: dados, create: { origemSiengeId: origem, ...dados } });
      await registrar(importacaoId, 'efisitemnotafiscal', origem, 'IMPORTADO', 'ItemDocumentoFiscal', destino.id);
    } catch (erro) {
      await registrar(importacaoId, 'efisitemnotafiscal', origem, 'ERRO', undefined, undefined, String(erro));
    }
  }
  return rows.length;
}

async function importarLoteamentos(importacaoId: string) {
  const { rows } = await fonte.query<Linha>(`
    SELECT e.cdempreend, e.nmempreend, e.nucnpj, e.deendereco, e.cdnumero,
           e.nmbairro, e.nucep, m.nmmunicipio, u.sguf
    FROM ecadempreend e
    LEFT JOIN ecadmunicipio m ON m.cdmunicipio = e.cdmunicipio
    LEFT JOIN ecaduf u ON u.cduf = m.cduf
    ORDER BY e.cdempreend${limiteSql()}
  `);

  for (const linha of rows) {
    const origem = chave('EMPREEND', linha.cdempreend);
    try {
      const municipio = texto(linha.nmmunicipio) ?? 'Não informado';
      const uf = texto(linha.sguf) ?? 'NI';
      const destino = await prisma.loteamento.upsert({
        where: { origemSiengeId: origem },
        update: {
          nome: texto(linha.nmempreend) ?? `Empreendimento ${linha.cdempreend}`,
          cidade: municipio,
          uf,
          registroImobiliario: texto(linha.nucnpj),
        },
        create: {
          origemSiengeId: origem,
          nome: texto(linha.nmempreend) ?? `Empreendimento ${linha.cdempreend}`,
          cidade: municipio,
          uf,
          registroImobiliario: texto(linha.nucnpj),
        },
      });
      await registrar(importacaoId, 'ecadempreend', origem, 'IMPORTADO', 'Loteamento', destino.id);
    } catch (erro) {
      await registrar(importacaoId, 'ecadempreend', origem, 'ERRO', undefined, undefined, String(erro));
    }
  }
  return rows.length;
}

async function importarClientes(importacaoId: string) {
  const { rows } = await fonte.query<Linha>(`
    SELECT c.cdcliente, c.nmcliente, c.deemail, c.nufonecel, c.flativo,
           c.fltpcliente, f.nucpf, f.dtnascimento, j.nucnpj
    FROM ecadcliente c
    LEFT JOIN ecadclifis f ON f.cdcliente = c.cdcliente
    LEFT JOIN ecadclijur j ON j.cdcliente = c.cdcliente
    ORDER BY c.cdcliente${limiteSql()}
  `);

  for (const linha of rows) {
    const origem = chave('CLIENTE', linha.cdcliente);
    const documento = texto(linha.nucpf) ?? texto(linha.nucnpj);
    const digitos = documento?.replace(/\D/g, '') ?? '';
    const tipoPessoa = texto(linha.nucnpj) ? 'JURIDICA' : 'FISICA';
    if ((digitos.length !== 11 && digitos.length !== 14) || !texto(linha.nmcliente)) {
      await registrar(importacaoId, 'ecadcliente', origem, 'IGNORADO', undefined, undefined, 'Cliente sem CPF/CNPJ utilizável ou sem nome.');
      continue;
    }
    try {
      const destino = await prisma.cliente.upsert({
        where: { origemSiengeId: origem },
        update: {
          nome: texto(linha.nmcliente)!,
          documento: digitos,
          tipoPessoa,
          email: texto(linha.deemail),
          telefone: texto(linha.nufonecel),
          whatsapp: texto(linha.nufonecel),
          dataNascimento: data(linha.dtnascimento),
          ativo: texto(linha.flativo) !== 'N',
        },
        create: {
          origemSiengeId: origem,
          nome: texto(linha.nmcliente)!,
          documento: digitos,
          tipoPessoa,
          email: texto(linha.deemail),
          telefone: texto(linha.nufonecel),
          whatsapp: texto(linha.nufonecel),
          dataNascimento: data(linha.dtnascimento),
          ativo: texto(linha.flativo) !== 'N',
        },
      });
      await registrar(importacaoId, 'ecadcliente', origem, 'IMPORTADO', 'Cliente', destino.id);
    } catch (erro) {
      await registrar(importacaoId, 'ecadcliente', origem, 'ERRO', undefined, undefined, String(erro));
    }
  }
  return rows.length;
}

async function importarLotes(importacaoId: string) {
  const { rows } = await fonte.query<Linha>(`
    SELECT u.cdempreend, u.cdunidade, u.nuunidade, u.nmlocal,
           u.qtareaterreno, u.vlterreno, u.deobservacao
    FROM evndunidade u
    ORDER BY u.cdempreend, u.cdunidade${limiteSql()}
  `);

  for (const linha of rows) {
    const origem = chave('UNIDADE', linha.cdempreend, linha.cdunidade);
    try {
      const loteamento = await prisma.loteamento.findUnique({
        where: { origemSiengeId: chave('EMPREEND', linha.cdempreend) },
      });
      if (!loteamento) {
        await registrar(importacaoId, 'evndunidade', origem, 'IGNORADO', undefined, undefined, 'Empreendimento ainda não importado.');
        continue;
      }
      const nomeQuadra = texto(linha.nmlocal) ?? 'Sem quadra informada';
      const quadra = await prisma.quadra.upsert({
        where: { loteamentoId_nome: { loteamentoId: loteamento.id, nome: nomeQuadra } },
        update: {},
        create: { loteamentoId: loteamento.id, nome: nomeQuadra },
      });
      const destino = await prisma.lote.upsert({
        where: { origemSiengeId: origem },
        update: {
          quadraId: quadra.id,
          numero: texto(linha.nuunidade) ?? String(linha.cdunidade),
          areaEmMetrosQuadrados: Number(linha.qtareaterreno) || 0,
          valorDeTabelaCentavos: centavos(linha.vlterreno),
          descricao: texto(linha.deobservacao),
        },
        create: {
          origemSiengeId: origem,
          quadraId: quadra.id,
          numero: texto(linha.nuunidade) ?? String(linha.cdunidade),
          areaEmMetrosQuadrados: Number(linha.qtareaterreno) || 0,
          valorDeTabelaCentavos: centavos(linha.vlterreno),
          descricao: texto(linha.deobservacao),
        },
      });
      await registrar(importacaoId, 'evndunidade', origem, 'IMPORTADO', 'Lote', destino.id);
    } catch (erro) {
      await registrar(importacaoId, 'evndunidade', origem, 'ERRO', undefined, undefined, String(erro));
    }
  }
  return rows.length;
}

async function importarContratos(importacaoId: string) {
  const { rows } = await fonte.query<Linha>(`
    SELECT c.nucontrato, c.cdempresa, c.cdempreend, c.dtcontrato,
           c.flsituacao, c.flsituacaodistrato, c.vltotalcontrato,
           c.vltotalvenda, c.pejuromora, c.pemultamora, c.deobservacao,
           c.nutitulo, c.cdindexmora, t.qtparcelas, t.dtquitacao, t.dtdistrato,
           primeiro.dtvencto_primeiro,
           cli.cdcliente,
           uni.cdunidade, uni.cdempreend AS unidade_empreend
    FROM evndcontrato c
    LEFT JOIN ecrctitulo t ON t.nutitulo = c.nutitulo AND t.cdempresa = c.cdempresa
    LEFT JOIN LATERAL (
      SELECT v.cdcliente
      FROM evndclicontrato v
      WHERE v.nucontrato = c.nucontrato AND v.cdempresa = c.cdempresa
      ORDER BY CASE WHEN v.flprincipal = 'S' THEN 0 ELSE 1 END, v.cdcliente
      LIMIT 1
    ) cli ON true
    LEFT JOIN LATERAL (
      SELECT u.cdunidade, u.cdempreend
      FROM evndunidadecontr v
      JOIN evndunidade u ON u.cdempreend = v.cdempreend AND u.nuunidade = v.nuunidade
      WHERE v.nucontrato = c.nucontrato AND v.cdempresa = c.cdempresa
      ORDER BY CASE WHEN v.flprincipal = 'S' THEN 0 ELSE 1 END, u.cdunidade
      LIMIT 1
    ) uni ON true
    LEFT JOIN LATERAL (
      SELECT min(p.dtvencto) AS dtvencto_primeiro
      FROM ecrcparcela p
      WHERE p.nutitulo = c.nutitulo
    ) primeiro ON true
    ORDER BY c.cdempresa, c.nucontrato${limiteSql()}
  `);

  for (const linha of rows) {
    const origem = chave('CONTRATO', linha.nucontrato, linha.cdempresa);
    try {
      const cliente = linha.cdcliente
        ? await prisma.cliente.findUnique({ where: { origemSiengeId: chave('CLIENTE', linha.cdcliente) } })
        : null;
      const lote = linha.cdunidade
        ? await prisma.lote.findUnique({ where: { origemSiengeId: chave('UNIDADE', linha.unidade_empreend ?? linha.cdempreend, linha.cdunidade) } })
        : null;
      const dataAssinatura = data(linha.dtcontrato);
      if (!cliente || !lote || !dataAssinatura) {
        await registrar(importacaoId, 'evndcontrato', origem, 'IGNORADO', undefined, undefined, 'Contrato sem cliente, lote ou data de assinatura migrável.');
        continue;
      }
      const numeroBase = texto(linha.nucontrato) ?? `${linha.cdempresa}-${linha.nutitulo}`;
      const numero = `${numeroBase}/${linha.cdempresa}`;
      const status = statusDoContrato(linha);
      const destino = await prisma.contrato.upsert({
        where: { origemSiengeId: origem },
        update: {
          numero,
          clienteId: cliente.id,
          loteId: lote.id,
          valorTotalCentavos: centavos(linha.vltotalvenda ?? linha.vltotalcontrato),
          quantidadeDeParcelas: inteiro(linha.qtparcelas),
          primeiroVencimento: data(linha.dtvencto_primeiro),
          multaPorAtrasoPercentual: Number(linha.pemultamora) || 2,
          jurosAoMesPercentual: Number(linha.pejuromora) || 1,
          status,
          dataAssinatura,
          observacoes: [texto(linha.deobservacao), `Sienge: flsituacao=${texto(linha.flsituacao) ?? 'vazio'}`].filter(Boolean).join(' · '),
        },
        create: {
          origemSiengeId: origem,
          numero,
          clienteId: cliente.id,
          loteId: lote.id,
          valorTotalCentavos: centavos(linha.vltotalvenda ?? linha.vltotalcontrato),
          quantidadeDeParcelas: inteiro(linha.qtparcelas),
          primeiroVencimento: data(linha.dtvencto_primeiro),
          multaPorAtrasoPercentual: Number(linha.pemultamora) || 2,
          jurosAoMesPercentual: Number(linha.pejuromora) || 1,
          status,
          dataAssinatura,
          observacoes: [texto(linha.deobservacao), `Sienge: flsituacao=${texto(linha.flsituacao) ?? 'vazio'}`].filter(Boolean).join(' · '),
        },
      });
      await registrar(importacaoId, 'evndcontrato', origem, 'IMPORTADO', 'Contrato', destino.id);
    } catch (erro) {
      await registrar(importacaoId, 'evndcontrato', origem, 'ERRO', undefined, undefined, String(erro));
    }
  }
  return rows.length;
}

async function importarParcelas(importacaoId: string) {
  const { rows } = await fonte.query<Linha>(`
    SELECT p.nutitulo, p.nuparcela, p.dtvencto, p.vloriginal, p.vlsaldodevorig,
           p.vlparcelaoriginal, p.flsituacao, c.nucontrato, c.cdempresa,
           COALESCE(SUM(b.vlamortizacao), 0) AS principal_pago
    FROM ecrcparcela p
    JOIN evndcontrato c ON c.nutitulo = p.nutitulo
    LEFT JOIN ecrcbaixa b ON b.nutitulo = p.nutitulo AND b.nuparcela = p.nuparcela
    GROUP BY p.nutitulo, p.nuparcela, p.dtvencto, p.vloriginal,
             p.vlsaldodevorig, p.vlparcelaoriginal, p.flsituacao,
             c.nucontrato, c.cdempresa
    ORDER BY c.cdempresa, c.nucontrato, p.nuparcela${limiteSql()}
  `);
  const contratos = await prisma.contrato.findMany({
    where: { origemSiengeId: { not: null } },
    select: { id: true, origemSiengeId: true },
  });
  const porOrigem = new Map(contratos.map((contrato) => [contrato.origemSiengeId!, contrato.id]));
  const entradas: Prisma.ParcelaCreateManyInput[] = [];
  let ignoradas = 0;
  for (const linha of rows) {
    const origem = chave('PARCELA', linha.nutitulo, linha.nuparcela);
    const contratoId = porOrigem.get(chave('CONTRATO', linha.nucontrato, linha.cdempresa));
    const vencimento = data(linha.dtvencto);
    if (!contratoId || !vencimento) {
      ignoradas += 1;
      continue;
    }
    const valorOriginal = centavos(linha.vloriginal ?? linha.vlparcelaoriginal);
    const valorPago = centavos(linha.principal_pago);
    entradas.push({
      origemSiengeId: origem,
      contratoId,
      numero: inteiro(linha.nuparcela),
      tipo: inteiro(linha.nuparcela) === 0 ? 'ENTRADA' : 'FINANCIAMENTO',
      valorOriginalCentavos: valorOriginal,
      vencimento,
      status: statusDaParcela(valorOriginal, valorPago),
      valorPagoCentavos: valorPago,
      descricao: `Importada do Sienge; status original: ${texto(linha.flsituacao) ?? 'vazio'}`,
    });
  }
  for (let inicio = 0; inicio < entradas.length; inicio += 1000) {
    await prisma.parcela.createMany({ data: entradas.slice(inicio, inicio + 1000), skipDuplicates: true });
  }
  await registrar(importacaoId, 'ecrcparcela', '__resumo__', 'IMPORTADO', 'Parcela', undefined, `lidas=${rows.length}; preparadas=${entradas.length}; ignoradas=${ignoradas}`);
  return rows.length;
}

async function importarBaixas(importacaoId: string) {
  const { rows } = await fonte.query<Linha>(`
    SELECT b.nutitulo, b.nuparcela, b.nuseqbaixa, b.cdempresa, b.dtrecto,
           b.vlrecto, b.vlamortizacao, b.vlbaixaoriginal, b.vljurosacrescimo,
           b.vlmultaacrescimo, b.vldesconto, b.cdformarecest, b.cdtiporecebimest,
           c.nucontrato, c.cdempresa AS contrato_empresa
    FROM ecrcbaixa b
    JOIN evndcontrato c ON c.nutitulo = b.nutitulo AND c.cdempresa = b.cdempresa
    ORDER BY b.cdempresa, b.nutitulo, b.nuparcela, b.nuseqbaixa${limiteSql()}
  `);
  const parcelas = await prisma.parcela.findMany({
    where: { origemSiengeId: { not: null } },
    select: { id: true, origemSiengeId: true, contratoId: true },
  });
  const porOrigem = new Map(parcelas.map((parcela) => [parcela.origemSiengeId!, parcela]));
  const entradas: Prisma.PagamentoCreateManyInput[] = [];
  let ignoradas = 0;
  for (const linha of rows) {
    const origemParcela = chave('PARCELA', linha.nutitulo, linha.nuparcela);
    const parcela = porOrigem.get(origemParcela);
    const pagoEm = data(linha.dtrecto);
    if (!parcela || !pagoEm) {
      ignoradas += 1;
      continue;
    }
    const principal = centavos(linha.vlamortizacao ?? linha.vlbaixaoriginal ?? linha.vlrecto);
    const juros = centavos(linha.vljurosacrescimo);
    const multa = centavos(linha.vlmultaacrescimo);
    const desconto = centavos(linha.vldesconto);
    const total = centavos(linha.vlrecto) || principal + juros + multa - desconto;
    const origem = chave('BAIXA', linha.nutitulo, linha.nuparcela, linha.nuseqbaixa, linha.cdempresa);
    entradas.push({
      origemSiengeId: origem,
      parcelaId: parcela.id,
      contratoId: parcela.contratoId,
      valorPrincipalCentavos: principal,
      valorJurosCentavos: juros,
      valorMultaCentavos: multa,
      valorDescontoCentavos: desconto,
      valorTotalCentavos: total,
      pagoEm,
      formaPagamento: formaDePagamento(linha),
      origem: 'SIENGE',
      observacoes: `Código forma Sienge: ${texto(linha.cdformarecest) ?? 'vazio'}; tipo: ${texto(linha.cdtiporecebimest) ?? 'vazio'}`,
    });
  }
  for (let inicio = 0; inicio < entradas.length; inicio += 1000) {
    await prisma.pagamento.createMany({ data: entradas.slice(inicio, inicio + 1000), skipDuplicates: true });
  }
  await registrar(importacaoId, 'ecrcbaixa', '__resumo__', 'IMPORTADO', 'Pagamento', undefined, `lidas=${rows.length}; preparadas=${entradas.length}; ignoradas=${ignoradas}`);
  return rows.length;
}

async function importarFornecedores(importacaoId: string) {
  const { rows } = await fonte.query<Linha>(`
    SELECT cdcredor, nmcredor, nucpf, nucnpj, deemail, nufone, flativo,
           deobservacao
    FROM ecadcredor
    WHERE flfornecedor = 'S' OR flfornecedor IS NULL
    ORDER BY cdcredor${limiteSql()}
  `);
  for (const linha of rows) {
    const origem = chave('CREDOR', linha.cdcredor);
    const documento = (texto(linha.nucpf) ?? texto(linha.nucnpj))?.replace(/\D/g, '') ?? null;
    try {
      const destino = await prisma.fornecedor.upsert({
        where: { origemSiengeId: origem },
        update: {
          nome: texto(linha.nmcredor) ?? `Credor ${linha.cdcredor}`,
          documento,
          email: texto(linha.deemail),
          telefone: texto(linha.nufone),
          ativo: texto(linha.flativo) !== 'N',
          observacoes: texto(linha.deobservacao),
        },
        create: {
          origemSiengeId: origem,
          nome: texto(linha.nmcredor) ?? `Credor ${linha.cdcredor}`,
          documento,
          email: texto(linha.deemail),
          telefone: texto(linha.nufone),
          ativo: texto(linha.flativo) !== 'N',
          observacoes: texto(linha.deobservacao),
        },
      });
      await registrar(importacaoId, 'ecadcredor', origem, 'IMPORTADO', 'Fornecedor', destino.id);
    } catch (erro) {
      await registrar(importacaoId, 'ecadcredor', origem, 'ERRO', undefined, undefined, String(erro));
    }
  }
  return rows.length;
}

async function importarContasAPagar(importacaoId: string) {
  const { rows } = await fonte.query<Linha>(`
    SELECT p.nutitulo, p.nuparcela, COALESCE(p.cdempresa, t.cdempresa) AS cdempresa, p.dtvencto, p.vloriginal,
           p.vlsaldodevorig, p.vlencargos, p.depagamento, p.flsituacao,
           t.cdcredor, t.nudocumento, t.deobservacao,
           COALESCE(SUM(b.vlpagto), 0) AS valor_pago,
           MAX(b.dtpagto) AS ultimo_pagamento
    FROM ecpgparcela p
    JOIN ecpgtitulo t ON t.nutitulo = p.nutitulo
    LEFT JOIN ecpgbaixa b ON b.nutitulo = p.nutitulo AND b.nuparcela = p.nuparcela
    GROUP BY p.nutitulo, p.nuparcela, COALESCE(p.cdempresa, t.cdempresa), p.dtvencto, p.vloriginal,
             p.vlsaldodevorig, p.vlencargos, p.depagamento, p.flsituacao,
             t.cdcredor, t.nudocumento, t.deobservacao
    ORDER BY p.cdempresa, p.nutitulo, p.nuparcela${limiteSql()}
  `);
  const fornecedores = await prisma.fornecedor.findMany({
    where: { origemSiengeId: { not: null } },
    select: { id: true, origemSiengeId: true },
  });
  const porFornecedor = new Map(fornecedores.map((item) => [item.origemSiengeId!, item.id]));
  const empresas = await prisma.empresa.findMany({ where: { origemSiengeId: { not: null } }, select: { id: true, origemSiengeId: true } });
  const porEmpresa = new Map(empresas.map((item) => [item.origemSiengeId!, item.id]));
  for (const linha of rows) {
    const origem = chave('CP', linha.nutitulo, linha.nuparcela, linha.cdempresa);
    const vencimento = data(linha.dtvencto);
    const fornecedorId = linha.cdcredor ? porFornecedor.get(chave('CREDOR', linha.cdcredor)) : undefined;
    const empresaId = linha.cdempresa ? porEmpresa.get(chave('EMPRESA', linha.cdempresa)) : undefined;
    if (!vencimento) {
      await registrar(importacaoId, 'ecpgparcela', origem, 'IGNORADO', undefined, undefined, 'Conta sem vencimento válido.');
      continue;
    }
    try {
      const original = centavos(linha.vloriginal);
      const pago = centavos(linha.valor_pago);
      const status = pago <= 0 ? 'PENDENTE' : pago >= original ? 'PAGA' : 'PAGA_PARCIAL';
      const destino = await prisma.contaAPagar.upsert({
        where: { origemSiengeId: origem },
        update: {
          fornecedorId,
          empresaId,
          numeroDocumento: texto(linha.nudocumento),
          descricao: texto(linha.depagamento),
          valorOriginalCentavos: original,
          valorPagoCentavos: pago,
          vencimento,
          status,
          pagoEm: data(linha.ultimo_pagamento),
          observacoes: [texto(linha.deobservacao), `Sienge: flsituacao=${texto(linha.flsituacao) ?? 'vazio'}`].filter(Boolean).join(' · '),
        },
        create: {
          origemSiengeId: origem,
          fornecedorId,
          empresaId,
          numeroDocumento: texto(linha.nudocumento),
          descricao: texto(linha.depagamento),
          valorOriginalCentavos: original,
          valorPagoCentavos: pago,
          vencimento,
          status,
          pagoEm: data(linha.ultimo_pagamento),
          observacoes: [texto(linha.deobservacao), `Sienge: flsituacao=${texto(linha.flsituacao) ?? 'vazio'}`].filter(Boolean).join(' · '),
        },
      });
      await registrar(importacaoId, 'ecpgparcela', origem, 'IMPORTADO', 'ContaAPagar', destino.id);
    } catch (erro) {
      await registrar(importacaoId, 'ecpgparcela', origem, 'ERRO', undefined, undefined, String(erro));
    }
  }
  return rows.length;
}

async function importarBaixasAPagar(importacaoId: string) {
  const { rows } = await fonte.query<Linha>(`
    SELECT b.nutitulo, b.nuparcela, b.nuseqbaixa, b.cdempresa, b.dtpagto,
           b.vlpagto, b.vljuros, b.vlmulta, b.vldesconto, b.cdtipobaixa,
           b.deobservacao
    FROM ecpgbaixa b
    ORDER BY b.cdempresa, b.nutitulo, b.nuparcela, b.nuseqbaixa${limiteSql()}
  `);
  const contas = await prisma.contaAPagar.findMany({
    where: { origemSiengeId: { not: null } },
    select: { id: true, origemSiengeId: true },
  });
  const porOrigem = new Map(contas.map((item) => [item.origemSiengeId!, item.id]));
  const entradas: Prisma.PagamentoContaAPagarCreateManyInput[] = [];
  let ignoradas = 0;
  for (const linha of rows) {
    const contaId = porOrigem.get(chave('CP', linha.nutitulo, linha.nuparcela, linha.cdempresa));
    const pagoEm = data(linha.dtpagto);
    if (!contaId || !pagoEm) {
      ignoradas += 1;
      continue;
    }
    entradas.push({
      origemSiengeId: chave('BAIXA_CP', linha.nutitulo, linha.nuparcela, linha.nuseqbaixa, linha.cdempresa),
      contaId,
      valorCentavos: centavos(linha.vlpagto),
      jurosCentavos: centavos(linha.vljuros),
      multaCentavos: centavos(linha.vlmulta),
      descontoCentavos: centavos(linha.vldesconto),
      pagoEm,
      formaPagamento: 'TRANSFERENCIA',
      observacoes: [texto(linha.deobservacao), `Código de baixa Sienge: ${texto(linha.cdtipobaixa) ?? 'vazio'}`].filter(Boolean).join(' · '),
    });
  }
  for (let inicio = 0; inicio < entradas.length; inicio += 1000) {
    await prisma.pagamentoContaAPagar.createMany({ data: entradas.slice(inicio, inicio + 1000), skipDuplicates: true });
  }
  await registrar(importacaoId, 'ecpgbaixa', '__resumo__', 'IMPORTADO', 'PagamentoContaAPagar', undefined, `lidas=${rows.length}; preparadas=${entradas.length}; ignoradas=${ignoradas}`);
  return rows.length;
}

async function main() {
  if (!process.env.SIENGE_DATABASE_URL) {
    throw new Error('Informe SIENGE_DATABASE_URL apontando para o PostgreSQL restaurado do Sienge.');
  }
  const arquivo = process.env.SIENGE_BACKUP_FILE ?? 'sie-10607-1-28072026-diario2.dmpc';
  const importacao = await prisma.importacaoSienge.create({
    data: { arquivo, bancoOrigem: process.env.SIENGE_DATABASE_NAME ?? 'sie-10607-1', status: 'EXECUTANDO', iniciadaEm: new Date() },
  });

  try {
    const empresas = await importarEmpresas(importacao.id);
    const obras = await importarObras(importacao.id);
    const centrosDeCusto = await importarCentrosDeCusto(importacao.id);
    const unidadesDeMedida = await importarUnidadesDeMedida(importacao.id);
    const gruposDeInsumo = await importarGruposDeInsumo(importacao.id);
    const insumos = await importarInsumos(importacao.id);
    const precosDeInsumo = await importarPrecosDeInsumo(importacao.id);
    const documentosFiscais = await importarDocumentosFiscais(importacao.id);
    const itensFiscais = await importarItensFiscais(importacao.id);
    const tiposMovimento = await importarTiposDeMovimento(importacao.id);
    const pedidosCompra = await importarPedidosDeCompra(importacao.id);
    const itensPedidosCompra = await importarItensDePedido(importacao.id);
    const movimentosEstoque = await importarMovimentosEstoque(importacao.id);
    const itensMovimentosEstoque = await importarItensMovimentosEstoque(importacao.id);
    const loteamentos = await importarLoteamentos(importacao.id);
    const clientes = await importarClientes(importacao.id);
    const lotes = await importarLotes(importacao.id);
    const contratos = await importarContratos(importacao.id);
    const parcelas = await importarParcelas(importacao.id);
    const baixas = await importarBaixas(importacao.id);
    const fornecedores = await importarFornecedores(importacao.id);
    const contasAPagar = await importarContasAPagar(importacao.id);
    const baixasAPagar = await importarBaixasAPagar(importacao.id);
    const erros = await prisma.registroImportacaoSienge.count({ where: { importacaoId: importacao.id, status: 'ERRO' } });
    const ignorados = await prisma.registroImportacaoSienge.count({ where: { importacaoId: importacao.id, status: 'IGNORADO' } });
    const importados = await prisma.registroImportacaoSienge.count({ where: { importacaoId: importacao.id, status: 'IMPORTADO' } });
    await prisma.importacaoSienge.update({
      where: { id: importacao.id },
      data: {
        status: erros ? 'CONCLUIDA_COM_ERROS' : 'CONCLUIDA',
        finalizadaEm: new Date(),
        totalLidos: empresas + obras + centrosDeCusto + unidadesDeMedida + gruposDeInsumo + insumos + precosDeInsumo + documentosFiscais + itensFiscais + tiposMovimento + pedidosCompra + itensPedidosCompra + movimentosEstoque + itensMovimentosEstoque + loteamentos + clientes + lotes + contratos + parcelas + baixas + fornecedores + contasAPagar + baixasAPagar,
        totalImportados: importados,
        totalIgnorados: ignorados,
        totalErros: erros,
        resumo: { empresas, obras, centrosDeCusto, unidadesDeMedida, gruposDeInsumo, insumos, precosDeInsumo, documentosFiscais, itensFiscais, tiposMovimento, pedidosCompra, itensPedidosCompra, movimentosEstoque, itensMovimentosEstoque, loteamentos, clientes, lotes, contratos, parcelas, baixas, fornecedores, contasAPagar, baixasAPagar } as Prisma.InputJsonValue,
      },
    });
    console.log(JSON.stringify({ importacaoId: importacao.id, empresas, obras, centrosDeCusto, unidadesDeMedida, gruposDeInsumo, insumos, precosDeInsumo, documentosFiscais, itensFiscais, tiposMovimento, pedidosCompra, itensPedidosCompra, movimentosEstoque, itensMovimentosEstoque, loteamentos, clientes, lotes, contratos, parcelas, baixas, fornecedores, contasAPagar, baixasAPagar, importados, ignorados, erros }, null, 2));
  } catch (erro) {
    await prisma.importacaoSienge.update({ where: { id: importacao.id }, data: { status: 'FALHA', finalizadaEm: new Date(), resumo: { erro: String(erro) } } });
    throw erro;
  } finally {
    await fonte.end();
    await prisma.$disconnect();
  }
}

main().catch((erro) => {
  console.error(erro);
  process.exitCode = 1;
});
