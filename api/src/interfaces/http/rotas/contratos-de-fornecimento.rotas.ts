import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../infrastructure/persistence/prisma/cliente-prisma.js';
import { exigirPermissao } from '../middlewares/autenticacao.js';
import { assincrono } from '../utilitarios/manipulador-assincrono.js';

const id = z.string().uuid();
const pagina = z.coerce.number().int().min(1).default(1);
const porPagina = z.coerce.number().int().min(1).max(100).default(25);
const situacaoDaEmpresa = z.enum(['CONTRATANTE', 'CONTRATADA']);
const tipoDeItem = z.enum(['SERVICO', 'INSUMO']);

const filtro = z.object({
  busca: z.string().trim().optional(),
  ativo: z.enum(['true', 'false']).optional(),
  situacaoDaEmpresa: situacaoDaEmpresa.optional(),
  tipoDeItem: tipoDeItem.optional(),
  fornecedorId: id.optional(),
  pagina,
  porPagina,
});

/** Campos de data trafegam como "AAAA-MM-DD"; `null` limpa, ausente preserva. */
const dataOpcional = z.string().date().optional().nullable();

const corpo = z.object({
  numero: z.string().trim().min(1),
  documento: z.string().trim().optional().nullable(),
  situacaoDaEmpresa: situacaoDaEmpresa.default('CONTRATANTE'),
  tipoDeItem: tipoDeItem.default('SERVICO'),
  objeto: z.string().trim().min(1),
  empresa: z.string().trim().optional().nullable(),
  fornecedorId: id.optional().nullable(),
  tipoDoContrato: z.string().trim().optional().nullable(),
  responsavel: z.string().trim().optional().nullable(),
  dataDoContrato: dataOpcional,
  dataBase: dataOpcional,
  dataDeInicio: dataOpcional,
  dataDeTermino: dataOpcional,
  valorCentavos: z.number().int().min(0).optional().nullable(),
  observacaoInterna: z.string().trim().optional().nullable(),
  ativo: z.boolean().default(true),
});

function data(valor: string): Date {
  return new Date(`${valor}T00:00:00.000Z`);
}

function paraData(valor: string | null | undefined): Date | null | undefined {
  if (valor === undefined) return undefined;
  return valor ? data(valor) : null;
}

function apresentar(item: {
  id: string; numero: string; documento: string | null;
  situacaoDaEmpresa: string; tipoDeItem: string; objeto: string; empresa: string | null;
  fornecedorId: string | null; tipoDoContrato: string | null; responsavel: string | null;
  dataDoContrato: Date | null; dataBase: Date | null; dataDeInicio: Date | null; dataDeTermino: Date | null;
  valorCentavos: number | null; observacaoInterna: string | null; ativo: boolean;
  fornecedor: { id: string; nome: string } | null;
}) {
  return {
    ...item,
    dataDoContrato: item.dataDoContrato?.toISOString().slice(0, 10) ?? null,
    dataBase: item.dataBase?.toISOString().slice(0, 10) ?? null,
    dataDeInicio: item.dataDeInicio?.toISOString().slice(0, 10) ?? null,
    dataDeTermino: item.dataDeTermino?.toISOString().slice(0, 10) ?? null,
  };
}

const incluirFornecedor = { fornecedor: { select: { id: true, nome: true } } } as const;

/** Normaliza texto opcional: "" vira null; ausente (undefined) preserva. */
function textoOuNulo(valor: string | null | undefined): string | null | undefined {
  if (valor === undefined) return undefined;
  return valor || null;
}

export function criarRotasDeContratosDeFornecimento(): Router {
  const rotas = Router();

  rotas.get('/contratos-de-fornecimento', assincrono(async (req, res) => {
    const entrada = filtro.parse(req.query);
    const where: Prisma.ContratoDeFornecimentoWhereInput = {
      ...(entrada.situacaoDaEmpresa ? { situacaoDaEmpresa: entrada.situacaoDaEmpresa } : {}),
      ...(entrada.tipoDeItem ? { tipoDeItem: entrada.tipoDeItem } : {}),
      ...(entrada.fornecedorId ? { fornecedorId: entrada.fornecedorId } : {}),
      ...(entrada.ativo === undefined ? {} : { ativo: entrada.ativo === 'true' }),
      ...(entrada.busca
        ? {
            OR: [
              { numero: { contains: entrada.busca, mode: 'insensitive' } },
              { objeto: { contains: entrada.busca, mode: 'insensitive' } },
              { empresa: { contains: entrada.busca, mode: 'insensitive' } },
              { documento: { contains: entrada.busca, mode: 'insensitive' } },
              { fornecedor: { nome: { contains: entrada.busca, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [itens, total] = await Promise.all([
      prisma.contratoDeFornecimento.findMany({
        where,
        include: incluirFornecedor,
        orderBy: { criadoEm: 'desc' },
        skip: (entrada.pagina - 1) * entrada.porPagina,
        take: entrada.porPagina,
      }),
      prisma.contratoDeFornecimento.count({ where }),
    ]);
    res.json({
      itens: itens.map(apresentar),
      pagina: entrada.pagina,
      porPagina: entrada.porPagina,
      total,
      totalDePaginas: Math.ceil(total / entrada.porPagina),
    });
  }));

  rotas.post('/contratos-de-fornecimento', exigirPermissao('EDITAR_FINANCEIRO'), assincrono(async (req, res) => {
    const entrada = corpo.parse(req.body);
    const item = await prisma.contratoDeFornecimento.create({
      data: {
        numero: entrada.numero,
        documento: entrada.documento || null,
        situacaoDaEmpresa: entrada.situacaoDaEmpresa,
        tipoDeItem: entrada.tipoDeItem,
        objeto: entrada.objeto,
        empresa: entrada.empresa || null,
        fornecedorId: entrada.fornecedorId || null,
        tipoDoContrato: entrada.tipoDoContrato || null,
        responsavel: entrada.responsavel || null,
        dataDoContrato: entrada.dataDoContrato ? data(entrada.dataDoContrato) : null,
        dataBase: entrada.dataBase ? data(entrada.dataBase) : null,
        dataDeInicio: entrada.dataDeInicio ? data(entrada.dataDeInicio) : null,
        dataDeTermino: entrada.dataDeTermino ? data(entrada.dataDeTermino) : null,
        valorCentavos: entrada.valorCentavos ?? null,
        observacaoInterna: entrada.observacaoInterna || null,
        ativo: entrada.ativo,
      },
      include: incluirFornecedor,
    });
    res.status(201).json(apresentar(item));
  }));

  rotas.put('/contratos-de-fornecimento/:id', exigirPermissao('EDITAR_FINANCEIRO'), assincrono(async (req, res) => {
    const entrada = corpo.partial().parse(req.body);
    const item = await prisma.contratoDeFornecimento.update({
      where: { id: id.parse(req.params.id) },
      data: {
        ...(entrada.numero !== undefined ? { numero: entrada.numero } : {}),
        ...(entrada.documento !== undefined ? { documento: textoOuNulo(entrada.documento) } : {}),
        ...(entrada.situacaoDaEmpresa !== undefined ? { situacaoDaEmpresa: entrada.situacaoDaEmpresa } : {}),
        ...(entrada.tipoDeItem !== undefined ? { tipoDeItem: entrada.tipoDeItem } : {}),
        ...(entrada.objeto !== undefined ? { objeto: entrada.objeto } : {}),
        ...(entrada.empresa !== undefined ? { empresa: textoOuNulo(entrada.empresa) } : {}),
        ...(entrada.fornecedorId !== undefined ? { fornecedorId: entrada.fornecedorId || null } : {}),
        ...(entrada.tipoDoContrato !== undefined ? { tipoDoContrato: textoOuNulo(entrada.tipoDoContrato) } : {}),
        ...(entrada.responsavel !== undefined ? { responsavel: textoOuNulo(entrada.responsavel) } : {}),
        ...(entrada.dataDoContrato !== undefined ? { dataDoContrato: paraData(entrada.dataDoContrato) } : {}),
        ...(entrada.dataBase !== undefined ? { dataBase: paraData(entrada.dataBase) } : {}),
        ...(entrada.dataDeInicio !== undefined ? { dataDeInicio: paraData(entrada.dataDeInicio) } : {}),
        ...(entrada.dataDeTermino !== undefined ? { dataDeTermino: paraData(entrada.dataDeTermino) } : {}),
        ...(entrada.valorCentavos !== undefined ? { valorCentavos: entrada.valorCentavos ?? null } : {}),
        ...(entrada.observacaoInterna !== undefined ? { observacaoInterna: textoOuNulo(entrada.observacaoInterna) } : {}),
        ...(entrada.ativo !== undefined ? { ativo: entrada.ativo } : {}),
      },
      include: incluirFornecedor,
    });
    res.json(apresentar(item));
  }));

  return rotas;
}
