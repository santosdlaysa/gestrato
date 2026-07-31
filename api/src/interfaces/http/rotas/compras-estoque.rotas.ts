import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../../infrastructure/persistence/prisma/cliente-prisma.js';
import { assincrono } from '../utilitarios/manipulador-assincrono.js';

const pagina = z.coerce.number().int().min(1).default(1);
const porPagina = z.coerce.number().int().min(1).max(100).default(25);
const id = z.string().uuid();
const filtro = z.object({ busca: z.string().trim().optional(), fornecedorId: id.optional(), obraId: id.optional(), de: z.string().date().optional(), ate: z.string().date().optional(), pagina, porPagina });

function dia(valor: Date): string { return valor.toISOString().slice(0, 10); }

export function criarRotasDeComprasEEstoque(): Router {
  const rotas = Router();

  rotas.get('/pedidos-compra', assincrono(async (req, res) => {
    const entrada = filtro.parse(req.query);
    const where: Prisma.PedidoCompraWhereInput = {
      ...(entrada.fornecedorId ? { fornecedorId: entrada.fornecedorId } : {}),
      ...(entrada.obraId ? { obraId: entrada.obraId } : {}),
      ...(entrada.busca ? { OR: [{ observacoes: { contains: entrada.busca, mode: 'insensitive' } }, { fornecedor: { nome: { contains: entrada.busca, mode: 'insensitive' } } }] } : {}),
      ...(entrada.de || entrada.ate ? { pedidoEm: { ...(entrada.de ? { gte: new Date(`${entrada.de}T00:00:00.000Z`) } : {}), ...(entrada.ate ? { lte: new Date(`${entrada.ate}T00:00:00.000Z`) } : {}) } } : {}),
    };
    const [itens, total] = await Promise.all([
      prisma.pedidoCompra.findMany({ where, include: { fornecedor: { select: { id: true, nome: true } }, obra: { select: { id: true, nome: true } }, centroDeCusto: { select: { id: true, nome: true } }, itens: true }, orderBy: { pedidoEm: 'desc' }, skip: (entrada.pagina - 1) * entrada.porPagina, take: entrada.porPagina }),
      prisma.pedidoCompra.count({ where }),
    ]);
    res.json({ itens: itens.map((item) => ({ ...item, pedidoEm: dia(item.pedidoEm), criadoEm: item.criadoEm.toISOString(), atualizadoEm: item.atualizadoEm.toISOString(), itens: item.itens.map((linha) => ({ ...linha, criadoEm: linha.criadoEm.toISOString(), atualizadoEm: linha.atualizadoEm.toISOString() })) })), pagina: entrada.pagina, porPagina: entrada.porPagina, total, totalDePaginas: Math.ceil(total / entrada.porPagina) });
  }));

  rotas.get('/movimentos-estoque', assincrono(async (req, res) => {
    const entrada = filtro.parse(req.query);
    const where: Prisma.MovimentoEstoqueWhereInput = {
      ...(entrada.fornecedorId ? { fornecedorId: entrada.fornecedorId } : {}),
      ...(entrada.busca ? { OR: [{ documento: { contains: entrada.busca, mode: 'insensitive' } }, { numeroOrigem: { contains: entrada.busca, mode: 'insensitive' } }, { observacoes: { contains: entrada.busca, mode: 'insensitive' } }] } : {}),
      ...(entrada.de || entrada.ate ? { movimentoEm: { ...(entrada.de ? { gte: new Date(`${entrada.de}T00:00:00.000Z`) } : {}), ...(entrada.ate ? { lte: new Date(`${entrada.ate}T00:00:00.000Z`) } : {}) } } : {}),
    };
    const [itens, total] = await Promise.all([
      prisma.movimentoEstoque.findMany({ where, include: { tipo: true, fornecedor: { select: { id: true, nome: true } }, itens: true }, orderBy: { movimentoEm: 'desc' }, skip: (entrada.pagina - 1) * entrada.porPagina, take: entrada.porPagina }),
      prisma.movimentoEstoque.count({ where }),
    ]);
    res.json({ itens: itens.map((item) => ({ ...item, movimentoEm: dia(item.movimentoEm), criadoEm: item.criadoEm.toISOString(), atualizadoEm: item.atualizadoEm.toISOString(), itens: item.itens.map((linha) => ({ ...linha, criadoEm: linha.criadoEm.toISOString(), atualizadoEm: linha.atualizadoEm.toISOString() })) })), pagina: entrada.pagina, porPagina: entrada.porPagina, total, totalDePaginas: Math.ceil(total / entrada.porPagina) });
  }));

  return rotas;
}
