import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../infrastructure/persistence/prisma/cliente-prisma.js';
import { exigirPermissao } from '../middlewares/autenticacao.js';
import { assincrono } from '../utilitarios/manipulador-assincrono.js';

const id = z.string().uuid();
const consulta = z.object({
  busca: z.string().trim().optional(),
  ativo: z.enum(['true', 'false']).optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(25),
});

const corpoBase = z.object({
  nome: z.string().trim().min(1),
  documento: z.string().trim().optional().nullable(),
  email: z.string().trim().email().optional().nullable().or(z.literal('')),
  telefone: z.string().trim().optional().nullable(),
  observacoes: z.string().trim().optional().nullable(),
  ativo: z.boolean().default(true),
});

const corpoCorretor = corpoBase.extend({ percentualDeComissao: z.number().min(0).max(100).default(0) });
const corpoParceiro = corpoBase.extend({ tipo: z.string().trim().min(1).default('OUTRO') });

function respostaPaginada<T>(itens: T[], total: number, pagina: number, porPagina: number) {
  return { itens, pagina, porPagina, total, totalDePaginas: Math.ceil(total / porPagina) };
}

function filtro(entrada: z.infer<typeof consulta>) {
  return {
    ...(entrada.ativo === undefined ? {} : { ativo: entrada.ativo === 'true' }),
    ...(entrada.busca ? { nome: { contains: entrada.busca, mode: 'insensitive' as const } } : {}),
  };
}

function apresentarCorretor(item: {
  id: string; nome: string; documento: string | null; email: string | null; telefone: string | null;
  percentualDeComissao: number; ativo: boolean;
}) {
  return item;
}

function apresentarParceiro(item: Record<string, unknown>) {
  return item;
}

async function listarParceiros(entrada: z.infer<typeof consulta>) {
  const busca = entrada.busca ? `%${entrada.busca}%` : null;
  const ativo = entrada.ativo === undefined ? null : entrada.ativo === 'true';
  const offset = (entrada.pagina - 1) * entrada.porPagina;
  const itens = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
    SELECT "id", "nome", "documento", "email", "telefone", "tipo", "observacoes", "ativo"
    FROM "parceiros"
    WHERE (${busca}::text IS NULL OR "nome" ILIKE ${busca})
      AND (${ativo}::boolean IS NULL OR "ativo" = ${ativo})
    ORDER BY "nome" ASC OFFSET ${offset} LIMIT ${entrada.porPagina}
  `);
  const [linhaTotal] = await prisma.$queryRaw<Array<{ total: bigint }>>(Prisma.sql`
    SELECT COUNT(*)::bigint AS total FROM "parceiros"
    WHERE (${busca}::text IS NULL OR "nome" ILIKE ${busca})
      AND (${ativo}::boolean IS NULL OR "ativo" = ${ativo})
  `);
  return respostaPaginada(itens.map(apresentarParceiro), Number(linhaTotal?.total ?? 0), entrada.pagina, entrada.porPagina);
}

export function criarRotasDeCorretoresEParceiros(): Router {
  const rotas = Router();

  rotas.get('/corretores', assincrono(async (req, res) => {
    const entrada = consulta.parse(req.query);
    const where = filtro(entrada);
    const [itens, total] = await Promise.all([
      prisma.corretor.findMany({ where, orderBy: { nome: 'asc' }, skip: (entrada.pagina - 1) * entrada.porPagina, take: entrada.porPagina }),
      prisma.corretor.count({ where }),
    ]);
    res.json(respostaPaginada(itens.map(apresentarCorretor), total, entrada.pagina, entrada.porPagina));
  }));

  rotas.post('/corretores', exigirPermissao('CADASTRAR'), assincrono(async (req, res) => {
    const dados = corpoCorretor.parse(req.body);
    const item = await prisma.corretor.create({ data: { ...dados, documento: dados.documento || null, email: dados.email || null, telefone: dados.telefone || null } });
    res.status(201).json(apresentarCorretor(item));
  }));

  rotas.put('/corretores/:id', exigirPermissao('CADASTRAR'), assincrono(async (req, res) => {
    const dados = corpoCorretor.partial().parse(req.body);
    const item = await prisma.corretor.update({ where: { id: id.parse(req.params.id) }, data: { ...dados, documento: dados.documento || null, email: dados.email || null, telefone: dados.telefone || null } });
    res.json(apresentarCorretor(item));
  }));

  rotas.get('/parceiros', assincrono(async (req, res) => res.json(await listarParceiros(consulta.parse(req.query)))));

  rotas.post('/parceiros', exigirPermissao('CADASTRAR'), assincrono(async (req, res) => {
    const dados = corpoParceiro.parse(req.body);
    const [item] = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      INSERT INTO "parceiros" ("id", "nome", "documento", "email", "telefone", "tipo", "observacoes", "ativo", "atualizadoEm")
      VALUES (${randomUUID()}, ${dados.nome}, ${dados.documento || null}, ${dados.email || null}, ${dados.telefone || null}, ${dados.tipo}, ${dados.observacoes || null}, ${dados.ativo}, NOW())
      RETURNING "id", "nome", "documento", "email", "telefone", "tipo", "observacoes", "ativo"
    `);
    if (!item) { res.status(500).json({ erro: { tipo: 'ErroInterno', mensagem: 'Não foi possível criar o parceiro.' } }); return; }
    res.status(201).json(apresentarParceiro(item));
  }));

  rotas.put('/parceiros/:id', exigirPermissao('CADASTRAR'), assincrono(async (req, res) => {
    const dados = corpoParceiro.partial().parse(req.body);
    const parceiroId = id.parse(req.params.id);
    const [item] = await prisma.$queryRaw<Array<Record<string, unknown>>>(Prisma.sql`
      UPDATE "parceiros" SET
        "nome" = COALESCE(${dados.nome ?? null}, "nome"),
        "documento" = ${dados.documento === undefined ? null : (dados.documento || null)},
        "email" = ${dados.email === undefined ? null : (dados.email || null)},
        "telefone" = ${dados.telefone === undefined ? null : (dados.telefone || null)},
        "tipo" = COALESCE(${dados.tipo ?? null}, "tipo"),
        "observacoes" = ${dados.observacoes === undefined ? null : (dados.observacoes || null)},
        "ativo" = COALESCE(${dados.ativo ?? null}, "ativo"), "atualizadoEm" = NOW()
      WHERE "id" = ${parceiroId}
      RETURNING "id", "nome", "documento", "email", "telefone", "tipo", "observacoes", "ativo"
    `);
    if (!item) { res.status(404).json({ erro: { tipo: 'NaoEncontrado', mensagem: 'Parceiro não encontrado.' } }); return; }
    res.json(apresentarParceiro(item));
  }));

  return rotas;
}
