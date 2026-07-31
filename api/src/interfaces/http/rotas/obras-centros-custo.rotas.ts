import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../../infrastructure/persistence/prisma/cliente-prisma.js';
import { assincrono } from '../utilitarios/manipulador-assincrono.js';

const pagina = z.coerce.number().int().min(1).default(1);
const porPagina = z.coerce.number().int().min(1).max(100).default(25);
const filtro = z.object({ busca: z.string().trim().optional(), empresaId: z.string().uuid().optional(), pagina, porPagina });

function data(valor: Date | null): string | null {
  return valor?.toISOString().slice(0, 10) ?? null;
}

function apresentarObra(item: Prisma.ObraGetPayload<{ include: { empresa: { select: { id: true; nome: true } } } }>) {
  return { ...item, inicio: data(item.inicio), termino: data(item.termino) };
}

export function criarRotasDeObrasECentrosDeCusto(): Router {
  const rotas = Router();

  rotas.get('/obras', assincrono(async (req, res) => {
    const entrada = filtro.parse(req.query);
    const where: Prisma.ObraWhereInput = {
      ...(entrada.empresaId ? { empresaId: entrada.empresaId } : {}),
      ...(entrada.busca ? { nome: { contains: entrada.busca, mode: 'insensitive' } } : {}),
    };
    const [itens, total] = await Promise.all([
      prisma.obra.findMany({ where, include: { empresa: { select: { id: true, nome: true } } }, orderBy: { nome: 'asc' }, skip: (entrada.pagina - 1) * entrada.porPagina, take: entrada.porPagina }),
      prisma.obra.count({ where }),
    ]);
    res.json({ itens: itens.map(apresentarObra), pagina: entrada.pagina, porPagina: entrada.porPagina, total, totalDePaginas: Math.ceil(total / entrada.porPagina) });
  }));

  rotas.get('/obras/:id/resumo-custos', assincrono(async (req, res) => {
    const obraId = z.string().uuid().parse(req.params.id);
    const obra = await prisma.obra.findUnique({ where: { id: obraId }, select: { id: true, nome: true } });
    if (!obra) { res.status(404).json({ erro: { tipo: 'NaoEncontrado', mensagem: 'Obra não encontrada.' } }); return; }
    const [resumo, pedidos] = await Promise.all([
      prisma.pedidoCompra.aggregate({ where: { obraId }, _count: { _all: true }, _sum: { valorTotalCentavos: true } }),
      prisma.pedidoCompra.findMany({ where: { obraId }, select: { id: true, numeroOrigem: true, pedidoEm: true, valorTotalCentavos: true, situacaoOrigem: true, fornecedor: { select: { nome: true } } }, orderBy: { pedidoEm: 'desc' }, take: 20 }),
    ]);
    res.json({ obra, totalPedidos: resumo._count._all, valorPedidosCentavos: resumo._sum.valorTotalCentavos ?? 0, pedidos: pedidos.map((item) => ({ ...item, pedidoEm: item.pedidoEm.toISOString().slice(0, 10) })) });
  }));

  rotas.get('/centros-de-custo', assincrono(async (req, res) => {
    const entrada = filtro.parse(req.query);
    const where: Prisma.CentroDeCustoWhereInput = {
      ...(entrada.empresaId ? { empresaId: entrada.empresaId } : {}),
      ...(entrada.busca ? { nome: { contains: entrada.busca, mode: 'insensitive' } } : {}),
    };
    const [itens, total] = await Promise.all([
      prisma.centroDeCusto.findMany({ where, include: { empresa: { select: { id: true, nome: true } }, obra: { select: { id: true, nome: true } } }, orderBy: { nome: 'asc' }, skip: (entrada.pagina - 1) * entrada.porPagina, take: entrada.porPagina }),
      prisma.centroDeCusto.count({ where }),
    ]);
    res.json({ itens, pagina: entrada.pagina, porPagina: entrada.porPagina, total, totalDePaginas: Math.ceil(total / entrada.porPagina) });
  }));

  return rotas;
}
