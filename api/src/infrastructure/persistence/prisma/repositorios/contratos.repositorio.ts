import type { Prisma } from '@prisma/client';
import type { FiltroDeContratos, RepositorioDeContratos } from '../../../../application/ports/repositorios.js';
import { montarPagina, type Pagina } from '../../../../application/ports/comuns.js';
import type { Contrato } from '../../../../domain/contratos/contrato.js';
import { DataCivil } from '../../../../domain/value-objects/data-civil.js';
import type { ClientePrisma } from '../cliente-prisma.js';
import { mapeadorDeContrato } from '../mappers/contrato.mapper.js';

const STATUS_EM_ABERTO = ['PENDENTE', 'PAGA_PARCIAL'] as const;

export class RepositorioDeContratosPrisma implements RepositorioDeContratos {
  constructor(private readonly prisma: ClientePrisma) {}

  async porId(id: string): Promise<Contrato | null> {
    const linha = await this.prisma.contrato.findUnique({ where: { id } });
    return linha ? mapeadorDeContrato.paraDominio(linha) : null;
  }

  async porNumero(numero: string): Promise<Contrato | null> {
    const linha = await this.prisma.contrato.findUnique({ where: { numero } });
    return linha ? mapeadorDeContrato.paraDominio(linha) : null;
  }

  async porIds(ids: readonly string[]): Promise<Map<string, Contrato>> {
    if (ids.length === 0) return new Map();
    const linhas = await this.prisma.contrato.findMany({ where: { id: { in: [...ids] } } });
    return new Map(linhas.map((linha) => [linha.id, mapeadorDeContrato.paraDominio(linha)]));
  }

  async listar(filtro: FiltroDeContratos): Promise<Pagina<Contrato>> {
    const where = montarCondicoes(filtro);
    const [linhas, total] = await Promise.all([
      this.prisma.contrato.findMany({
        where,
        orderBy: [{ criadoEm: 'desc' }],
        skip: (filtro.pagina - 1) * filtro.porPagina,
        take: filtro.porPagina,
      }),
      this.prisma.contrato.count({ where }),
    ]);
    return montarPagina(linhas.map(mapeadorDeContrato.paraDominio), total, filtro);
  }

  async ativos(): Promise<Contrato[]> {
    const linhas = await this.prisma.contrato.findMany({ where: { status: 'ATIVO' } });
    return linhas.map(mapeadorDeContrato.paraDominio);
  }

  async salvar(contrato: Contrato): Promise<void> {
    const dados = mapeadorDeContrato.paraPersistencia(contrato);
    await this.prisma.contrato.upsert({
      where: { id: dados.id },
      create: dados,
      update: dados,
    });
  }

  async maiorNumeroDeParcela(contratoId: string): Promise<number> {
    const resultado = await this.prisma.parcela.aggregate({
      where: { contratoId },
      _max: { numero: true },
    });
    return resultado._max.numero ?? 0;
  }
}

function montarCondicoes(filtro: FiltroDeContratos): Prisma.ContratoWhereInput {
  const condicoes: Prisma.ContratoWhereInput = {};

  if (filtro.status) condicoes.status = filtro.status;
  if (filtro.clienteId) condicoes.clienteId = filtro.clienteId;
  if (filtro.corretorId) condicoes.corretorId = filtro.corretorId;
  if (filtro.loteamentoId) {
    condicoes.lote = { quadra: { loteamentoId: filtro.loteamentoId } };
  }
  if (filtro.busca) {
    const termo = filtro.busca.trim();
    condicoes.OR = [
      { numero: { contains: termo, mode: 'insensitive' } },
      { cliente: { nome: { contains: termo, mode: 'insensitive' } } },
      { cliente: { documento: { contains: termo.replace(/\D/g, '') || termo } } },
    ];
  }

  aplicarSituacao(condicoes, filtro);
  return condicoes;
}

/**
 * "Inadimplente" nao e coluna: e a existencia de parcela em aberto vencida.
 * Traduzimos para `some`/`none` sobre as parcelas, o que deixa o Postgres
 * decidir o plano em vez de trazer contrato por contrato para o Node.
 */
function aplicarSituacao(condicoes: Prisma.ContratoWhereInput, filtro: FiltroDeContratos): void {
  if (!filtro.situacao) return;

  const referencia = filtro.dataDeReferencia ?? DataCivil.hoje();
  const diasParaInadimplencia = filtro.diasParaInadimplencia ?? 8;
  const diasParaRetomada = filtro.diasParaRetomadaDoLote ?? 90;

  /** Parcela em aberto com pelo menos `dias` de atraso na data de referencia. */
  const atrasadaHaPeloMenos = (dias: number): Prisma.ParcelaWhereInput => ({
    status: { in: [...STATUS_EM_ABERTO] },
    vencimento: { lte: referencia.somarDias(-dias).paraDateUtc() },
  });

  switch (filtro.situacao) {
    case 'EM_DIA':
      condicoes.status = 'ATIVO';
      condicoes.parcelas = { none: atrasadaHaPeloMenos(1) };
      break;
    // Cada degrau e "tem alguma parcela neste nivel de atraso, e nenhuma pior" —
    // e o que reproduz, em SQL, a classificacao pelo maior atraso do contrato.
    case 'EM_ATRASO':
      condicoes.status = 'ATIVO';
      condicoes.AND = [
        { parcelas: { some: atrasadaHaPeloMenos(1) } },
        { parcelas: { none: atrasadaHaPeloMenos(diasParaInadimplencia) } },
      ];
      break;
    case 'INADIMPLENTE':
      condicoes.status = 'ATIVO';
      condicoes.AND = [
        { parcelas: { some: atrasadaHaPeloMenos(diasParaInadimplencia) } },
        { parcelas: { none: atrasadaHaPeloMenos(diasParaRetomada) } },
      ];
      break;
    case 'SUJEITO_A_RETOMADA':
      condicoes.status = 'ATIVO';
      condicoes.parcelas = { some: atrasadaHaPeloMenos(diasParaRetomada) };
      break;
    case 'QUITADO':
      condicoes.status = 'QUITADO';
      break;
    case 'CANCELADO':
      condicoes.status = 'CANCELADO';
      break;
    case 'DISTRATADO':
      condicoes.status = 'DISTRATADO';
      break;
  }
}
