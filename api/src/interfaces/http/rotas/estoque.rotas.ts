import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../../../infrastructure/persistence/prisma/cliente-prisma.js';
import { assincrono } from '../utilitarios/manipulador-assincrono.js';

const id = z.string().uuid();
const pagina = z.coerce.number().int().min(1).default(1);
const porPagina = z.coerce.number().int().min(1).max(100).default(25);
const filtro = z.object({ busca: z.string().trim().optional(), grupoId: id.optional(), unidadeId: id.optional(), pagina, porPagina });

export function criarRotasDeEstoque(): Router {
  const rotas = Router();

  rotas.get('/estoque/saldos', assincrono(async (req, res) => {
    const entrada = z.object({ busca: z.string().trim().optional(), pagina, porPagina }).parse(req.query);
    const termo = entrada.busca ? `%${entrada.busca}%` : null;
    const itens = await prisma.$queryRaw<Array<{ id: string; nome: string; simbolo: string | null; saldo: number; valorCentavos: number }>>(Prisma.sql`
      WITH saldo AS (
        SELECT im."insumoId",
          COALESCE(SUM(CASE WHEN tm.entrada THEN im.quantidade WHEN tm.saida THEN -im.quantidade ELSE 0 END), 0) AS saldo,
          COALESCE(SUM(CASE WHEN tm.entrada THEN im.quantidade * im."precoUnitarioCentavos" WHEN tm.saida THEN -im.quantidade * im."precoUnitarioCentavos" ELSE 0 END), 0) AS "valorCentavos"
        FROM "itens_movimentos_estoque" im
        JOIN "movimentos_estoque" m ON m.id = im."movimentoId"
        JOIN "tipos_movimento_estoque" tm ON tm.id = m."tipoId"
        WHERE im."insumoId" IS NOT NULL
        GROUP BY im."insumoId"
      )
      SELECT i.id, i.nome, u.simbolo, COALESCE(s.saldo, 0) AS saldo, COALESCE(s."valorCentavos", 0) AS "valorCentavos"
      FROM "insumos" i
      LEFT JOIN "unidades_medida" u ON u.id = i."unidadeId"
      LEFT JOIN saldo s ON s."insumoId" = i.id
      WHERE (${termo}::text IS NULL OR i.nome ILIKE ${termo})
      ORDER BY i.nome ASC
      LIMIT ${entrada.porPagina} OFFSET ${(entrada.pagina - 1) * entrada.porPagina}
    `);
    const [resultadoTotal] = await prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`SELECT COUNT(*)::bigint AS total FROM "insumos" i WHERE (${termo}::text IS NULL OR i.nome ILIKE ${termo})`);
    const total = Number(resultadoTotal?.total ?? 0);
    res.json({ itens, pagina: entrada.pagina, porPagina: entrada.porPagina, total, totalDePaginas: Math.ceil(total / entrada.porPagina) });
  }));

  rotas.get('/unidades-medida', assincrono(async (_req, res) => {
    const itens = await prisma.unidadeMedida.findMany({ where: { ativa: true }, orderBy: { nome: 'asc' } });
    res.json({ itens });
  }));

  rotas.get('/grupos-insumo', assincrono(async (_req, res) => {
    const itens = await prisma.grupoInsumo.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' } });
    res.json({ itens });
  }));

  rotas.get('/insumos', assincrono(async (req, res) => {
    const entrada = filtro.parse(req.query);
    const where: Prisma.InsumoWhereInput = {
      ...(entrada.grupoId ? { grupoId: entrada.grupoId } : {}),
      ...(entrada.unidadeId ? { unidadeId: entrada.unidadeId } : {}),
      ...(entrada.busca ? { OR: [{ nome: { contains: entrada.busca, mode: 'insensitive' } }, { sinonimo: { contains: entrada.busca, mode: 'insensitive' } }, { classificacaoFiscal: { contains: entrada.busca, mode: 'insensitive' } }] } : {}),
    };
    const [itens, total] = await Promise.all([
      prisma.insumo.findMany({ where, include: { unidade: true, grupo: true }, orderBy: { nome: 'asc' }, skip: (entrada.pagina - 1) * entrada.porPagina, take: entrada.porPagina }),
      prisma.insumo.count({ where }),
    ]);
    res.json({ itens, pagina: entrada.pagina, porPagina: entrada.porPagina, total, totalDePaginas: Math.ceil(total / entrada.porPagina) });
  }));

  rotas.get('/insumos/:id/precos', assincrono(async (req, res) => {
    const insumoId = id.parse(req.params.id);
    const itens = await prisma.precoInsumo.findMany({ where: { insumoId }, orderBy: [{ dataPreco: 'desc' }, { codigoPrecoOrigem: 'asc' }] });
    res.json({ itens });
  }));

  return rotas;
}
