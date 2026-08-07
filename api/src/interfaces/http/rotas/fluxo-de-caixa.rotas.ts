import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../infrastructure/persistence/prisma/cliente-prisma.js';
import { ErroDeRegraDeNegocio, ErroNaoEncontrado } from '../../../domain/shared/errors.js';
import { exigirPermissao } from '../middlewares/autenticacao.js';
import { assincrono } from '../utilitarios/manipulador-assincrono.js';

/**
 * Cadastros-base do fluxo de caixa (tesouraria): contas bancarias, socios que
 * aportam capital, empreendimentos (centros de custo) e o plano de categorias.
 * Sao a fundacao dos lancamentos e do painel que entram nas fases seguintes.
 *
 * Segue o mesmo molde enxuto de contas-a-pagar.rotas.ts: rota fala direto com o
 * Prisma, Zod inline, valores monetarios em centavos inteiros.
 */

const id = z.string().uuid();
const pagina = z.coerce.number().int().min(1).default(1);
const porPagina = z.coerce.number().int().min(1).max(200).default(50);
const ativoFiltro = z.enum(['true', 'false']).optional();

const tipoLancamento = z.enum(['ENTRADA', 'SAIDA']);
const natureza = z.enum([
  'RECEBIVEL_VENDA',
  'APORTE',
  'TRANSFERENCIA',
  'DESPESA_FIXA',
  'DESPESA_VARIAVEL',
  'CUSTO_OBRA',
  'OUTRO',
]);

const texto = z.string().trim().min(1);
const textoOpcional = z.string().trim().optional().nullable();

const filtroBusca = z.object({
  busca: z.string().trim().optional(),
  ativo: ativoFiltro,
  pagina,
  porPagina,
});

function ativoWhere(valor: 'true' | 'false' | undefined, campo: 'ativa' | 'ativo') {
  return valor === undefined ? {} : { [campo]: valor === 'true' };
}

// ------------------------------------------------------------- contas bancarias

const corpoContaBancaria = z.object({
  nome: texto,
  instituicao: textoOpcional,
  agencia: textoOpcional,
  numero: textoOpcional,
  saldoInicialCentavos: z.number().int().default(0),
  ativa: z.boolean().default(true),
  observacoes: textoOpcional,
});

// --------------------------------------------------------------------- socios

const corpoSocio = z.object({
  nome: texto,
  documento: textoOpcional,
  ativo: z.boolean().default(true),
  observacoes: textoOpcional,
});

// ------------------------------------------------------------- empreendimentos

const corpoEmpreendimento = z.object({
  nome: texto,
  loteamentoId: id.optional().nullable(),
  ativo: z.boolean().default(true),
  observacoes: textoOpcional,
});

// ------------------------------------------------------------------ categorias

const corpoCategoria = z.object({
  nome: texto,
  tipo: tipoLancamento,
  natureza,
  ordem: z.number().int().default(0),
  ativa: z.boolean().default(true),
  observacoes: textoOpcional,
});

// ------------------------------------------------------------------ lancamentos

/** Data de negocio "AAAA-MM-DD" -> Date na meia-noite UTC (coluna `@db.Date`). */
const dataCivil = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato AAAA-MM-DD')
  .transform((valor) => new Date(`${valor}T00:00:00.000Z`));

const formaPagamento = z.enum(['DINHEIRO', 'PIX', 'BOLETO', 'TRANSFERENCIA', 'CARTAO', 'CHEQUE', 'PERMUTA']);

const corpoLancamento = z.object({
  // Se `categoriaId` vier, o tipo e derivado dela; senao `tipo` e obrigatorio.
  tipo: tipoLancamento.optional(),
  data: dataCivil,
  valorCentavos: z.number().int().positive(),
  descricao: texto,
  numeroDocumento: textoOpcional,
  formaPagamento: formaPagamento.optional().nullable(),
  contaBancariaId: id,
  categoriaId: id.optional().nullable(),
  empreendimentoFinanceiroId: id.optional().nullable(),
  socioAportadorId: id.optional().nullable(),
  observacoes: textoOpcional,
});

const filtroLancamentos = z.object({
  contaBancariaId: id.optional(),
  categoriaId: id.optional(),
  empreendimentoFinanceiroId: id.optional(),
  socioAportadorId: id.optional(),
  tipo: tipoLancamento.optional(),
  natureza: natureza.optional(),
  de: dataCivil.optional(),
  ate: dataCivil.optional(),
  busca: z.string().trim().optional(),
  pagina,
  porPagina,
});

const corpoTransferencia = z.object({
  contaOrigemId: id,
  contaDestinoId: id,
  data: dataCivil,
  valorCentavos: z.number().int().positive(),
  descricao: textoOpcional,
  numeroDocumento: textoOpcional,
  empreendimentoFinanceiroId: id.optional().nullable(),
  observacoes: textoOpcional,
});

const filtroExtrato = z.object({
  contaBancariaId: id,
  de: dataCivil.optional(),
  ate: dataCivil.optional(),
});

/** Colunas de contexto trazidas em toda leitura de lancamento. */
const incluirLancamento = {
  contaBancaria: { select: { id: true, nome: true } },
  categoria: { select: { id: true, nome: true, tipo: true, natureza: true } },
  empreendimentoFinanceiro: { select: { id: true, nome: true } },
  socioAportador: { select: { id: true, nome: true } },
} satisfies Prisma.LancamentoFinanceiroInclude;

/** Normaliza strings vazias/`undefined` de campos opcionais para `null`. */
function limpar<T extends Record<string, unknown>>(entrada: T, campos: (keyof T)[]): T {
  const copia = { ...entrada };
  for (const campo of campos) {
    if (copia[campo] === undefined) continue;
    if (copia[campo] === '') copia[campo] = null as T[keyof T];
  }
  return copia;
}

type Direcao = 'ENTRADA' | 'SAIDA';

/**
 * O tipo do lancamento vem da categoria quando ha uma: a rubrica ja diz se e
 * entrada ou saida, e deixar o usuario escolher abriria espaco para incoerencia
 * (uma "Energia" lancada como ENTRADA). Sem categoria (ex.: entrada avulsa), o
 * tipo informado manda.
 */
async function derivarTipo(tipoInformado: Direcao | undefined, categoriaId: string | null): Promise<Direcao> {
  if (categoriaId) {
    const categoria = await prisma.categoriaFinanceira.findUnique({ where: { id: categoriaId }, select: { tipo: true } });
    if (!categoria) throw new ErroNaoEncontrado('Categoria financeira', categoriaId);
    if (tipoInformado && tipoInformado !== categoria.tipo) {
      throw new ErroDeRegraDeNegocio('O tipo do lancamento nao corresponde ao tipo da categoria.');
    }
    return categoria.tipo;
  }
  if (!tipoInformado) throw new ErroDeRegraDeNegocio('Informe a categoria ou o tipo (ENTRADA/SAIDA) do lancamento.');
  return tipoInformado;
}

/** Conta precisa existir e estar ativa para receber lancamentos. */
async function exigirContaAtiva(contaId: string): Promise<void> {
  const conta = await prisma.contaBancaria.findUnique({ where: { id: contaId }, select: { ativa: true } });
  if (!conta) throw new ErroNaoEncontrado('Conta bancaria', contaId);
  if (!conta.ativa) throw new ErroDeRegraDeNegocio('Conta bancaria inativa nao aceita lancamentos.');
}

/** Soma entradas e saidas (em centavos) de um recorte de lancamentos. */
async function somarPorTipo(where: Prisma.LancamentoFinanceiroWhereInput): Promise<{ entradas: number; saidas: number }> {
  const grupos = await prisma.lancamentoFinanceiro.groupBy({ by: ['tipo'], where, _sum: { valorCentavos: true } });
  let entradas = 0;
  let saidas = 0;
  for (const grupo of grupos) {
    const valor = grupo._sum.valorCentavos ?? 0;
    if (grupo.tipo === 'ENTRADA') entradas += valor;
    else saidas += valor;
  }
  return { entradas, saidas };
}

export function criarRotasDeFluxoDeCaixa(): Router {
  const rotas = Router();

  // ----------------------------------------------------------- contas bancarias

  rotas.get('/contas-bancarias', assincrono(async (req, res) => {
    const entrada = filtroBusca.parse(req.query);
    const where: Prisma.ContaBancariaWhereInput = {
      ...(entrada.busca ? { nome: { contains: entrada.busca, mode: 'insensitive' } } : {}),
      ...ativoWhere(entrada.ativo, 'ativa'),
    };
    const [itens, total] = await Promise.all([
      prisma.contaBancaria.findMany({ where, orderBy: { nome: 'asc' }, skip: (entrada.pagina - 1) * entrada.porPagina, take: entrada.porPagina }),
      prisma.contaBancaria.count({ where }),
    ]);
    res.json({ itens, pagina: entrada.pagina, porPagina: entrada.porPagina, total, totalDePaginas: Math.ceil(total / entrada.porPagina) });
  }));

  rotas.post('/contas-bancarias', exigirPermissao('CADASTRAR'), assincrono(async (req, res) => {
    const entrada = limpar(corpoContaBancaria.parse(req.body), ['instituicao', 'agencia', 'numero', 'observacoes']);
    const item = await prisma.contaBancaria.create({ data: entrada });
    res.status(201).json(item);
  }));

  rotas.put('/contas-bancarias/:id', exigirPermissao('CADASTRAR'), assincrono(async (req, res) => {
    const entrada = limpar(corpoContaBancaria.partial().parse(req.body), ['instituicao', 'agencia', 'numero', 'observacoes']);
    const item = await prisma.contaBancaria.update({ where: { id: id.parse(req.params.id) }, data: entrada });
    res.json(item);
  }));

  // ------------------------------------------------------------------- socios

  rotas.get('/socios-aportadores', assincrono(async (req, res) => {
    const entrada = filtroBusca.parse(req.query);
    const where: Prisma.SocioAportadorWhereInput = {
      ...(entrada.busca ? { nome: { contains: entrada.busca, mode: 'insensitive' } } : {}),
      ...ativoWhere(entrada.ativo, 'ativo'),
    };
    const [itens, total] = await Promise.all([
      prisma.socioAportador.findMany({ where, orderBy: { nome: 'asc' }, skip: (entrada.pagina - 1) * entrada.porPagina, take: entrada.porPagina }),
      prisma.socioAportador.count({ where }),
    ]);
    res.json({ itens, pagina: entrada.pagina, porPagina: entrada.porPagina, total, totalDePaginas: Math.ceil(total / entrada.porPagina) });
  }));

  rotas.post('/socios-aportadores', exigirPermissao('CADASTRAR'), assincrono(async (req, res) => {
    const entrada = limpar(corpoSocio.parse(req.body), ['documento', 'observacoes']);
    const item = await prisma.socioAportador.create({ data: entrada });
    res.status(201).json(item);
  }));

  rotas.put('/socios-aportadores/:id', exigirPermissao('CADASTRAR'), assincrono(async (req, res) => {
    const entrada = limpar(corpoSocio.partial().parse(req.body), ['documento', 'observacoes']);
    const item = await prisma.socioAportador.update({ where: { id: id.parse(req.params.id) }, data: entrada });
    res.json(item);
  }));

  // ------------------------------------------------------------- empreendimentos

  rotas.get('/empreendimentos-financeiros', assincrono(async (req, res) => {
    const entrada = filtroBusca.parse(req.query);
    const where: Prisma.EmpreendimentoFinanceiroWhereInput = {
      ...(entrada.busca ? { nome: { contains: entrada.busca, mode: 'insensitive' } } : {}),
      ...ativoWhere(entrada.ativo, 'ativo'),
    };
    const [itens, total] = await Promise.all([
      prisma.empreendimentoFinanceiro.findMany({ where, include: { loteamento: { select: { id: true, nome: true } } }, orderBy: { nome: 'asc' }, skip: (entrada.pagina - 1) * entrada.porPagina, take: entrada.porPagina }),
      prisma.empreendimentoFinanceiro.count({ where }),
    ]);
    res.json({ itens, pagina: entrada.pagina, porPagina: entrada.porPagina, total, totalDePaginas: Math.ceil(total / entrada.porPagina) });
  }));

  rotas.post('/empreendimentos-financeiros', exigirPermissao('CADASTRAR'), assincrono(async (req, res) => {
    const entrada = limpar(corpoEmpreendimento.parse(req.body), ['loteamentoId', 'observacoes']);
    const item = await prisma.empreendimentoFinanceiro.create({ data: entrada, include: { loteamento: { select: { id: true, nome: true } } } });
    res.status(201).json(item);
  }));

  rotas.put('/empreendimentos-financeiros/:id', exigirPermissao('CADASTRAR'), assincrono(async (req, res) => {
    const entrada = limpar(corpoEmpreendimento.partial().parse(req.body), ['loteamentoId', 'observacoes']);
    const item = await prisma.empreendimentoFinanceiro.update({ where: { id: id.parse(req.params.id) }, data: entrada, include: { loteamento: { select: { id: true, nome: true } } } });
    res.json(item);
  }));

  // ------------------------------------------------------------------ categorias

  rotas.get('/categorias-financeiras', assincrono(async (req, res) => {
    const entrada = filtroBusca.extend({ tipo: tipoLancamento.optional(), natureza: natureza.optional() }).parse(req.query);
    const where: Prisma.CategoriaFinanceiraWhereInput = {
      ...(entrada.busca ? { nome: { contains: entrada.busca, mode: 'insensitive' } } : {}),
      ...(entrada.tipo ? { tipo: entrada.tipo } : {}),
      ...(entrada.natureza ? { natureza: entrada.natureza } : {}),
      ...ativoWhere(entrada.ativo, 'ativa'),
    };
    const [itens, total] = await Promise.all([
      prisma.categoriaFinanceira.findMany({ where, orderBy: [{ natureza: 'asc' }, { ordem: 'asc' }, { nome: 'asc' }], skip: (entrada.pagina - 1) * entrada.porPagina, take: entrada.porPagina }),
      prisma.categoriaFinanceira.count({ where }),
    ]);
    res.json({ itens, pagina: entrada.pagina, porPagina: entrada.porPagina, total, totalDePaginas: Math.ceil(total / entrada.porPagina) });
  }));

  rotas.post('/categorias-financeiras', exigirPermissao('CADASTRAR'), assincrono(async (req, res) => {
    const entrada = limpar(corpoCategoria.parse(req.body), ['observacoes']);
    const item = await prisma.categoriaFinanceira.create({ data: entrada });
    res.status(201).json(item);
  }));

  rotas.put('/categorias-financeiras/:id', exigirPermissao('CADASTRAR'), assincrono(async (req, res) => {
    const entrada = limpar(corpoCategoria.partial().parse(req.body), ['observacoes']);
    const item = await prisma.categoriaFinanceira.update({ where: { id: id.parse(req.params.id) }, data: entrada });
    res.json(item);
  }));

  // ------------------------------------------------------------------- lancamentos

  rotas.get('/lancamentos', assincrono(async (req, res) => {
    const f = filtroLancamentos.parse(req.query);
    const where: Prisma.LancamentoFinanceiroWhereInput = {
      ...(f.contaBancariaId ? { contaBancariaId: f.contaBancariaId } : {}),
      ...(f.categoriaId ? { categoriaId: f.categoriaId } : {}),
      ...(f.empreendimentoFinanceiroId ? { empreendimentoFinanceiroId: f.empreendimentoFinanceiroId } : {}),
      ...(f.socioAportadorId ? { socioAportadorId: f.socioAportadorId } : {}),
      ...(f.tipo ? { tipo: f.tipo } : {}),
      ...(f.natureza ? { categoria: { natureza: f.natureza } } : {}),
      ...(f.de || f.ate ? { data: { ...(f.de ? { gte: f.de } : {}), ...(f.ate ? { lte: f.ate } : {}) } } : {}),
      ...(f.busca
        ? {
            OR: [
              { descricao: { contains: f.busca, mode: 'insensitive' } },
              { numeroDocumento: { contains: f.busca, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [itens, total, somas] = await Promise.all([
      prisma.lancamentoFinanceiro.findMany({
        where,
        include: incluirLancamento,
        orderBy: [{ data: 'desc' }, { criadoEm: 'desc' }],
        skip: (f.pagina - 1) * f.porPagina,
        take: f.porPagina,
      }),
      prisma.lancamentoFinanceiro.count({ where }),
      somarPorTipo(where),
    ]);
    res.json({
      itens,
      pagina: f.pagina,
      porPagina: f.porPagina,
      total,
      totalDePaginas: Math.ceil(total / f.porPagina),
      resumo: {
        totalEntradasCentavos: somas.entradas,
        totalSaidasCentavos: somas.saidas,
        saldoDoPeriodoCentavos: somas.entradas - somas.saidas,
      },
    });
  }));

  rotas.post('/lancamentos', exigirPermissao('CADASTRAR'), assincrono(async (req, res) => {
    const entrada = corpoLancamento.parse(req.body);
    const tipo = await derivarTipo(entrada.tipo, entrada.categoriaId ?? null);
    await exigirContaAtiva(entrada.contaBancariaId);
    const item = await prisma.lancamentoFinanceiro.create({
      data: {
        tipo,
        data: entrada.data,
        valorCentavos: entrada.valorCentavos,
        descricao: entrada.descricao,
        numeroDocumento: entrada.numeroDocumento ?? null,
        formaPagamento: entrada.formaPagamento ?? null,
        contaBancariaId: entrada.contaBancariaId,
        categoriaId: entrada.categoriaId ?? null,
        empreendimentoFinanceiroId: entrada.empreendimentoFinanceiroId ?? null,
        socioAportadorId: entrada.socioAportadorId ?? null,
        observacoes: entrada.observacoes ?? null,
      },
      include: incluirLancamento,
    });
    res.status(201).json(item);
  }));

  rotas.put('/lancamentos/:id', exigirPermissao('CADASTRAR'), assincrono(async (req, res) => {
    const idLancamento = id.parse(req.params.id);
    const existente = await prisma.lancamentoFinanceiro.findUnique({ where: { id: idLancamento }, select: { transferenciaId: true } });
    if (!existente) throw new ErroNaoEncontrado('Lancamento financeiro', idLancamento);
    if (existente.transferenciaId) {
      throw new ErroDeRegraDeNegocio('Lancamento de transferencia nao pode ser editado isoladamente; exclua e refaca a transferencia.');
    }
    const entrada = corpoLancamento.partial().parse(req.body);
    const dados: Prisma.LancamentoFinanceiroUncheckedUpdateInput = {};
    if (entrada.data !== undefined) dados.data = entrada.data;
    if (entrada.valorCentavos !== undefined) dados.valorCentavos = entrada.valorCentavos;
    if (entrada.descricao !== undefined) dados.descricao = entrada.descricao;
    if (entrada.numeroDocumento !== undefined) dados.numeroDocumento = entrada.numeroDocumento ?? null;
    if (entrada.formaPagamento !== undefined) dados.formaPagamento = entrada.formaPagamento ?? null;
    if (entrada.observacoes !== undefined) dados.observacoes = entrada.observacoes ?? null;
    if (entrada.empreendimentoFinanceiroId !== undefined) dados.empreendimentoFinanceiroId = entrada.empreendimentoFinanceiroId ?? null;
    if (entrada.socioAportadorId !== undefined) dados.socioAportadorId = entrada.socioAportadorId ?? null;
    if (entrada.contaBancariaId !== undefined) {
      await exigirContaAtiva(entrada.contaBancariaId);
      dados.contaBancariaId = entrada.contaBancariaId;
    }
    if (entrada.categoriaId !== undefined) dados.categoriaId = entrada.categoriaId ?? null;
    if (entrada.categoriaId !== undefined || entrada.tipo !== undefined) {
      dados.tipo = await derivarTipo(entrada.tipo, entrada.categoriaId ?? null);
    }
    const item = await prisma.lancamentoFinanceiro.update({ where: { id: idLancamento }, data: dados, include: incluirLancamento });
    res.json(item);
  }));

  rotas.delete('/lancamentos/:id', exigirPermissao('CADASTRAR'), assincrono(async (req, res) => {
    const idLancamento = id.parse(req.params.id);
    const existente = await prisma.lancamentoFinanceiro.findUnique({ where: { id: idLancamento }, select: { transferenciaId: true } });
    if (!existente) throw new ErroNaoEncontrado('Lancamento financeiro', idLancamento);
    // Estornar uma perna de transferencia apaga as duas — senao o consolidado
    // ficaria com metade de um movimento que nunca existiu sozinho.
    if (existente.transferenciaId) {
      await prisma.lancamentoFinanceiro.deleteMany({ where: { transferenciaId: existente.transferenciaId } });
    } else {
      await prisma.lancamentoFinanceiro.delete({ where: { id: idLancamento } });
    }
    res.status(204).end();
  }));

  // ----------------------------------------------------------------- transferencias

  rotas.post('/transferencias', exigirPermissao('CADASTRAR'), assincrono(async (req, res) => {
    const entrada = corpoTransferencia.parse(req.body);
    if (entrada.contaOrigemId === entrada.contaDestinoId) {
      throw new ErroDeRegraDeNegocio('A conta de origem e a de destino devem ser diferentes.');
    }
    await exigirContaAtiva(entrada.contaOrigemId);
    await exigirContaAtiva(entrada.contaDestinoId);
    const transferenciaId = randomUUID();
    const base = {
      data: entrada.data,
      valorCentavos: entrada.valorCentavos,
      descricao: entrada.descricao ?? 'Transferencia entre contas',
      numeroDocumento: entrada.numeroDocumento ?? null,
      formaPagamento: 'TRANSFERENCIA' as const,
      empreendimentoFinanceiroId: entrada.empreendimentoFinanceiroId ?? null,
      observacoes: entrada.observacoes ?? null,
      transferenciaId,
    };
    const [saida, entradaPerna] = await prisma.$transaction([
      prisma.lancamentoFinanceiro.create({ data: { ...base, tipo: 'SAIDA', contaBancariaId: entrada.contaOrigemId }, include: incluirLancamento }),
      prisma.lancamentoFinanceiro.create({ data: { ...base, tipo: 'ENTRADA', contaBancariaId: entrada.contaDestinoId }, include: incluirLancamento }),
    ]);
    res.status(201).json({ transferenciaId, saida, entrada: entradaPerna });
  }));

  // ------------------------------------------------------------------------ extrato

  rotas.get('/extrato', assincrono(async (req, res) => {
    const f = filtroExtrato.parse(req.query);
    const conta = await prisma.contaBancaria.findUnique({ where: { id: f.contaBancariaId } });
    if (!conta) throw new ErroNaoEncontrado('Conta bancaria', f.contaBancariaId);

    // Saldo de abertura do periodo: saldo inicial + movimentos estritamente
    // anteriores a `de`. Sem `de`, o periodo comeca do saldo inicial da conta.
    let saldoAnterior = conta.saldoInicialCentavos;
    if (f.de) {
      const antes = await somarPorTipo({ contaBancariaId: conta.id, data: { lt: f.de } });
      saldoAnterior += antes.entradas - antes.saidas;
    }

    const where: Prisma.LancamentoFinanceiroWhereInput = {
      contaBancariaId: conta.id,
      ...(f.de || f.ate ? { data: { ...(f.de ? { gte: f.de } : {}), ...(f.ate ? { lte: f.ate } : {}) } } : {}),
    };
    const lancamentos = await prisma.lancamentoFinanceiro.findMany({
      where,
      include: incluirLancamento,
      orderBy: [{ data: 'asc' }, { criadoEm: 'asc' }],
    });

    // Saldo corrente linha a linha, partindo do saldo de abertura.
    let saldo = saldoAnterior;
    const linhas = lancamentos.map((lancamento) => {
      saldo += lancamento.tipo === 'ENTRADA' ? lancamento.valorCentavos : -lancamento.valorCentavos;
      return { ...lancamento, saldoCentavos: saldo };
    });

    res.json({
      conta: { id: conta.id, nome: conta.nome, instituicao: conta.instituicao, agencia: conta.agencia, numero: conta.numero },
      saldoInicialCentavos: conta.saldoInicialCentavos,
      saldoAnteriorCentavos: saldoAnterior,
      linhas,
      saldoFinalCentavos: saldo,
    });
  }));

  // ------------------------------------------------------------- posicao de saldos

  rotas.get('/contas-bancarias/saldos', assincrono(async (_req, res) => {
    const [contas, grupos] = await Promise.all([
      prisma.contaBancaria.findMany({ where: { ativa: true }, orderBy: { nome: 'asc' } }),
      prisma.lancamentoFinanceiro.groupBy({ by: ['contaBancariaId', 'tipo'], _sum: { valorCentavos: true } }),
    ]);
    const porConta = new Map<string, { entradas: number; saidas: number }>();
    for (const grupo of grupos) {
      const atual = porConta.get(grupo.contaBancariaId) ?? { entradas: 0, saidas: 0 };
      const valor = grupo._sum.valorCentavos ?? 0;
      if (grupo.tipo === 'ENTRADA') atual.entradas += valor;
      else atual.saidas += valor;
      porConta.set(grupo.contaBancariaId, atual);
    }
    const itens = contas.map((conta) => {
      const movimento = porConta.get(conta.id) ?? { entradas: 0, saidas: 0 };
      return {
        id: conta.id,
        nome: conta.nome,
        instituicao: conta.instituicao,
        saldoInicialCentavos: conta.saldoInicialCentavos,
        entradasCentavos: movimento.entradas,
        saidasCentavos: movimento.saidas,
        saldoAtualCentavos: conta.saldoInicialCentavos + movimento.entradas - movimento.saidas,
      };
    });
    res.json({ itens });
  }));

  return rotas;
}
