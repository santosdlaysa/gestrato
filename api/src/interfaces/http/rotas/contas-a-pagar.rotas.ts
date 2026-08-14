import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../infrastructure/persistence/prisma/cliente-prisma.js';
import { exigirPermissao } from '../middlewares/autenticacao.js';
import { assincrono } from '../utilitarios/manipulador-assincrono.js';

const id = z.string().uuid();
const pagina = z.coerce.number().int().min(1).default(1);
const porPagina = z.coerce.number().int().min(1).max(100).default(25);
const forma = z.enum(['DINHEIRO', 'PIX', 'BOLETO', 'TRANSFERENCIA', 'CARTAO', 'CHEQUE', 'PERMUTA']);
const status = z.enum(['PENDENTE', 'PAGA', 'PAGA_PARCIAL', 'CANCELADA']);

const filtro = z.object({
  busca: z.string().trim().optional(),
  ativo: z.enum(['true', 'false']).optional(),
  status: status.optional(),
  fornecedorId: id.optional(),
  de: z.string().date().optional(),
  ate: z.string().date().optional(),
  pagina,
  porPagina,
});

const corpoConta = z.object({
  fornecedorId: id.optional().nullable(),
  numeroDocumento: z.string().trim().optional().nullable(),
  descricao: z.string().trim().optional().nullable(),
  valorOriginalCentavos: z.number().int().positive(),
  vencimento: z.string().date(),
  formaPagamento: forma.optional().nullable(),
  observacoes: z.string().trim().optional().nullable(),
});

const corpoBaixa = z.object({
  valorCentavos: z.number().int().positive(),
  jurosCentavos: z.number().int().min(0).default(0),
  multaCentavos: z.number().int().min(0).default(0),
  descontoCentavos: z.number().int().min(0).default(0),
  pagoEm: z.string().date(),
  formaPagamento: forma.optional().nullable(),
  observacoes: z.string().trim().optional().nullable(),
});

function data(valor: string): Date {
  return new Date(`${valor}T00:00:00.000Z`);
}

function apresentarFornecedor(item: { id: string; nome: string; documento: string | null; email: string | null; telefone: string | null; ativo: boolean }) {
  return item;
}

function apresentarConta(item: {
  id: string; origemSiengeId: string | null; numeroDocumento: string | null; descricao: string | null;
  valorOriginalCentavos: number; valorPagoCentavos: number; jurosCentavos: number; multaCentavos: number;
  descontoCentavos: number; vencimento: Date; status: string; pagoEm: Date | null; formaPagamento: string | null;
  observacoes: string | null; fornecedor: { id: string; nome: string } | null;
}) {
  return {
    ...item,
    vencimento: item.vencimento.toISOString().slice(0, 10),
    pagoEm: item.pagoEm?.toISOString().slice(0, 10) ?? null,
  };
}

const corpoFornecedor = z.object({
  nome: z.string().trim().min(1),
  documento: z.string().trim().optional().nullable(),
  email: z.string().trim().email().optional().nullable().or(z.literal('')),
  telefone: z.string().trim().optional().nullable(),
  ativo: z.boolean().default(true),
  observacoes: z.string().trim().optional().nullable(),
});

export function criarRotasDeContasAPagar(): Router {
  const rotas = Router();

  rotas.get('/fornecedores', assincrono(async (req, res) => {
    const entrada = filtro.pick({ busca: true, ativo: true, pagina: true, porPagina: true }).parse(req.query);
    const where: Prisma.FornecedorWhereInput = {
      ...(entrada.busca ? { nome: { contains: entrada.busca, mode: 'insensitive' } } : {}),
      ...(entrada.ativo === undefined ? {} : { ativo: entrada.ativo === 'true' }),
    };
    const [itens, total] = await Promise.all([
      prisma.fornecedor.findMany({ where, orderBy: { nome: 'asc' }, skip: (entrada.pagina - 1) * entrada.porPagina, take: entrada.porPagina }),
      prisma.fornecedor.count({ where }),
    ]);
    res.json({ itens: itens.map(apresentarFornecedor), pagina: entrada.pagina, porPagina: entrada.porPagina, total, totalDePaginas: Math.ceil(total / entrada.porPagina) });
  }));

  rotas.post('/fornecedores', exigirPermissao('EDITAR_FINANCEIRO'), assincrono(async (req, res) => {
    const entrada = corpoFornecedor.parse(req.body);
    const item = await prisma.fornecedor.create({ data: { ...entrada, documento: entrada.documento || null, email: entrada.email || null, telefone: entrada.telefone || null, observacoes: entrada.observacoes || null } });
    res.status(201).json(apresentarFornecedor(item));
  }));

  rotas.put('/fornecedores/:id', exigirPermissao('EDITAR_FINANCEIRO'), assincrono(async (req, res) => {
    const entrada = corpoFornecedor.partial().parse(req.body);
    const item = await prisma.fornecedor.update({
      where: { id: id.parse(req.params.id) },
      data: {
        ...entrada,
        ...(entrada.documento !== undefined ? { documento: entrada.documento || null } : {}),
        ...(entrada.email !== undefined ? { email: entrada.email || null } : {}),
        ...(entrada.telefone !== undefined ? { telefone: entrada.telefone || null } : {}),
        ...(entrada.observacoes !== undefined ? { observacoes: entrada.observacoes || null } : {}),
      },
    });
    res.json(apresentarFornecedor(item));
  }));

  rotas.get('/contas-a-pagar', assincrono(async (req, res) => {
    const entrada = filtro.parse(req.query);
    const where: Prisma.ContaAPagarWhereInput = {
      ...(entrada.status ? { status: entrada.status } : {}),
      ...(entrada.fornecedorId ? { fornecedorId: entrada.fornecedorId } : {}),
      ...(entrada.busca ? { OR: [{ descricao: { contains: entrada.busca, mode: 'insensitive' } }, { numeroDocumento: { contains: entrada.busca, mode: 'insensitive' } }, { fornecedor: { nome: { contains: entrada.busca, mode: 'insensitive' } } }] } : {}),
      ...(entrada.de || entrada.ate ? { vencimento: { ...(entrada.de ? { gte: data(entrada.de) } : {}), ...(entrada.ate ? { lte: data(entrada.ate) } : {}) } } : {}),
    };
    const [itens, total] = await Promise.all([
      prisma.contaAPagar.findMany({ where, include: { fornecedor: { select: { id: true, nome: true } } }, orderBy: { vencimento: 'asc' }, skip: (entrada.pagina - 1) * entrada.porPagina, take: entrada.porPagina }),
      prisma.contaAPagar.count({ where }),
    ]);
    res.json({ itens: itens.map(apresentarConta), pagina: entrada.pagina, porPagina: entrada.porPagina, total, totalDePaginas: Math.ceil(total / entrada.porPagina) });
  }));

  rotas.post('/contas-a-pagar', exigirPermissao('EDITAR_FINANCEIRO'), assincrono(async (req, res) => {
    const entrada = corpoConta.parse(req.body);
    const item = await prisma.contaAPagar.create({ data: { ...entrada, vencimento: data(entrada.vencimento) } , include: { fornecedor: { select: { id: true, nome: true } } } });
    res.status(201).json(apresentarConta(item));
  }));

  rotas.post('/contas-a-pagar/:id/baixa', exigirPermissao('EDITAR_FINANCEIRO'), assincrono(async (req, res) => {
    const contaId = id.parse(req.params.id);
    const entrada = corpoBaixa.parse(req.body);
    const resultado = await prisma.$transaction(async (transacao) => {
      const conta = await transacao.contaAPagar.findUnique({ where: { id: contaId } });
      if (!conta) { res.status(404).json({ erro: { tipo: 'NaoEncontrado', mensagem: 'Conta a pagar não encontrada.' } }); return null; }
      const novoPago = conta.valorPagoCentavos + entrada.valorCentavos;
      const novoStatus = novoPago >= conta.valorOriginalCentavos ? 'PAGA' : 'PAGA_PARCIAL';
      await transacao.pagamentoContaAPagar.create({ data: { contaId, valorCentavos: entrada.valorCentavos, jurosCentavos: entrada.jurosCentavos, multaCentavos: entrada.multaCentavos, descontoCentavos: entrada.descontoCentavos, pagoEm: data(entrada.pagoEm), formaPagamento: entrada.formaPagamento, observacoes: entrada.observacoes } });
      return transacao.contaAPagar.update({ where: { id: contaId }, data: { valorPagoCentavos: novoPago, jurosCentavos: { increment: entrada.jurosCentavos }, multaCentavos: { increment: entrada.multaCentavos }, descontoCentavos: { increment: entrada.descontoCentavos }, pagoEm: data(entrada.pagoEm), status: novoStatus }, include: { fornecedor: { select: { id: true, nome: true } } } });
    });
    if (resultado) res.json(apresentarConta(resultado));
  }));

  return rotas;
}
