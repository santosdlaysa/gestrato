import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../../infrastructure/persistence/prisma/cliente-prisma.js';
import { assincrono } from '../utilitarios/manipulador-assincrono.js';

const id = z.string().uuid();
const pagina = z.coerce.number().int().min(1).default(1);
const porPagina = z.coerce.number().int().min(1).max(100).default(25);
const filtro = z.object({ busca: z.string().trim().optional(), empresaId: id.optional(), fornecedorId: id.optional(), clienteId: id.optional(), de: z.string().date().optional(), ate: z.string().date().optional(), pagina, porPagina });

function data(valor: Date): string { return valor.toISOString().slice(0, 10); }
function dataOpcional(valor: Date | null): string | null { return valor ? data(valor) : null; }

export function criarRotasFiscais(): Router {
  const rotas = Router();
  rotas.get('/documentos-fiscais', assincrono(async (req, res) => {
    const entrada = filtro.parse(req.query);
    const where: Prisma.DocumentoFiscalWhereInput = {
      ...(entrada.empresaId ? { empresaId: entrada.empresaId } : {}),
      ...(entrada.fornecedorId ? { fornecedorId: entrada.fornecedorId } : {}),
      ...(entrada.clienteId ? { clienteId: entrada.clienteId } : {}),
      ...(entrada.busca ? { OR: [{ numero: { contains: entrada.busca, mode: 'insensitive' } }, { origemCodigo: { contains: entrada.busca, mode: 'insensitive' } }, { fornecedor: { nome: { contains: entrada.busca, mode: 'insensitive' } } }, { cliente: { nome: { contains: entrada.busca, mode: 'insensitive' } } }] } : {}),
      ...(entrada.de || entrada.ate ? { emitidoEm: { ...(entrada.de ? { gte: new Date(`${entrada.de}T00:00:00.000Z`) } : {}), ...(entrada.ate ? { lte: new Date(`${entrada.ate}T00:00:00.000Z`) } : {}) } } : {}),
    };
    const [itens, total] = await Promise.all([
      prisma.documentoFiscal.findMany({ where, include: { empresa: { select: { id: true, nome: true } }, fornecedor: { select: { id: true, nome: true } }, cliente: { select: { id: true, nome: true } }, itens: true }, orderBy: { emitidoEm: 'desc' }, skip: (entrada.pagina - 1) * entrada.porPagina, take: entrada.porPagina }),
      prisma.documentoFiscal.count({ where }),
    ]);
    res.json({ itens: itens.map((item) => ({ ...item, emitidoEm: data(item.emitidoEm), registradoEm: data(item.registradoEm), criadoEm: item.criadoEm.toISOString(), atualizadoEm: item.atualizadoEm.toISOString(), itens: item.itens.map((linha) => ({ ...linha, criadoEm: linha.criadoEm.toISOString(), atualizadoEm: linha.atualizadoEm.toISOString() })) })), pagina: entrada.pagina, porPagina: entrada.porPagina, total, totalDePaginas: Math.ceil(total / entrada.porPagina) });
  }));

  rotas.get('/documentos-fiscais/:id', assincrono(async (req, res) => {
    const item = await prisma.documentoFiscal.findUnique({ where: { id: id.parse(req.params.id) }, include: { empresa: { select: { id: true, nome: true } }, fornecedor: { select: { id: true, nome: true } }, cliente: { select: { id: true, nome: true } }, itens: true } });
    if (!item) { res.status(404).json({ erro: { tipo: 'NaoEncontrado', mensagem: 'Documento fiscal não encontrado.' } }); return; }
    res.json({ ...item, emitidoEm: data(item.emitidoEm), registradoEm: data(item.registradoEm), criadoEm: item.criadoEm.toISOString(), atualizadoEm: item.atualizadoEm.toISOString(), itens: item.itens.map((linha) => ({ ...linha, criadoEm: linha.criadoEm.toISOString(), atualizadoEm: linha.atualizadoEm.toISOString() })) });
  }));
  return rotas;
}
