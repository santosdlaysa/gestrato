import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../infrastructure/persistence/prisma/cliente-prisma.js';
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

/** Normaliza strings vazias/`undefined` de campos opcionais para `null`. */
function limpar<T extends Record<string, unknown>>(entrada: T, campos: (keyof T)[]): T {
  const copia = { ...entrada };
  for (const campo of campos) {
    if (copia[campo] === undefined) continue;
    if (copia[campo] === '') copia[campo] = null as T[keyof T];
  }
  return copia;
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

  return rotas;
}
