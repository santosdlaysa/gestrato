import type { Prisma } from '@prisma/client';
import { montarPagina, type Pagina } from '../../../../application/ports/comuns.js';
import type {
  FiltroDeCobrancas,
  RepositorioDeCobrancas,
  RepositorioDeDocumentos,
} from '../../../../application/ports/repositorios.js';
import type { Cobranca } from '../../../../domain/cobranca/cobranca.js';
import type { DocumentoDeCobranca } from '../../../../domain/cobranca/documento-de-cobranca.js';
import type { ClientePrisma } from '../cliente-prisma.js';
import { mapeadorDeCobranca, mapeadorDeDocumento } from '../mappers/cobranca.mapper.js';

export class RepositorioDeCobrancasPrisma implements RepositorioDeCobrancas {
  constructor(private readonly prisma: ClientePrisma) {}

  async porId(id: string): Promise<Cobranca | null> {
    const linha = await this.prisma.cobranca.findUnique({ where: { id } });
    return linha ? mapeadorDeCobranca.paraDominio(linha) : null;
  }

  async listar(filtro: FiltroDeCobrancas): Promise<Pagina<Cobranca>> {
    const where: Prisma.CobrancaWhereInput = {};
    if (filtro.contratoId) where.contratoId = filtro.contratoId;
    if (filtro.parcelaId) where.parcelaId = filtro.parcelaId;
    if (filtro.clienteId) where.clienteId = filtro.clienteId;
    if (filtro.status) where.status = filtro.status;
    if (filtro.de || filtro.ate) {
      where.dataDeReferencia = {
        ...(filtro.de ? { gte: filtro.de.paraDateUtc() } : {}),
        ...(filtro.ate ? { lte: filtro.ate.paraDateUtc() } : {}),
      };
    }

    const [linhas, total] = await Promise.all([
      this.prisma.cobranca.findMany({
        where,
        orderBy: { criadaEm: 'desc' },
        skip: (filtro.pagina - 1) * filtro.porPagina,
        take: filtro.porPagina,
      }),
      this.prisma.cobranca.count({ where }),
    ]);
    return montarPagina(linhas.map(mapeadorDeCobranca.paraDominio), total, filtro);
  }

  async porContrato(contratoId: string): Promise<Cobranca[]> {
    const linhas = await this.prisma.cobranca.findMany({
      where: { contratoId },
      orderBy: { criadaEm: 'desc' },
    });
    return linhas.map(mapeadorDeCobranca.paraDominio);
  }

  async salvar(cobranca: Cobranca): Promise<void> {
    const dados = mapeadorDeCobranca.paraPersistencia(cobranca);
    await this.prisma.cobranca.upsert({
      where: { id: dados.id },
      create: dados,
      update: dados,
    });
  }

  /**
   * Consulta de idempotencia da regua: uma unica ida ao banco para saber quais
   * das etapas de hoje ja foram enviadas. Sem isso, reprocessar um dia mandaria
   * a mesma mensagem para todo mundo de novo.
   */
  async chavesJaRegistradas(chaves: readonly string[]): Promise<Set<string>> {
    if (chaves.length === 0) return new Set();
    const linhas = await this.prisma.cobranca.findMany({
      where: { chaveDeIdempotencia: { in: [...chaves] } },
      select: { chaveDeIdempotencia: true },
    });
    return new Set(linhas.map((linha) => linha.chaveDeIdempotencia));
  }
}

export class RepositorioDeDocumentosPrisma implements RepositorioDeDocumentos {
  constructor(private readonly prisma: ClientePrisma) {}

  async porId(id: string): Promise<DocumentoDeCobranca | null> {
    const linha = await this.prisma.documentoDeCobranca.findUnique({ where: { id } });
    return linha ? mapeadorDeDocumento.paraDominio(linha) : null;
  }

  async vigenteDaParcela(parcelaId: string): Promise<DocumentoDeCobranca | null> {
    const linha = await this.prisma.documentoDeCobranca.findFirst({
      where: { parcelaId, status: 'EMITIDO' },
      orderBy: { emitidoEm: 'desc' },
    });
    return linha ? mapeadorDeDocumento.paraDominio(linha) : null;
  }

  async vigentesDasParcelas(parcelaIds: readonly string[]): Promise<Map<string, DocumentoDeCobranca>> {
    const porParcela = new Map<string, DocumentoDeCobranca>();
    if (parcelaIds.length === 0) return porParcela;

    const linhas = await this.prisma.documentoDeCobranca.findMany({
      where: { parcelaId: { in: [...parcelaIds] }, status: 'EMITIDO' },
      orderBy: { emitidoEm: 'desc' },
    });
    // Ordenado do mais recente para o mais antigo: o primeiro de cada parcela
    // e o vigente, os demais sao emissoes anteriores que ficaram para historico.
    for (const linha of linhas) {
      if (!porParcela.has(linha.parcelaId)) {
        porParcela.set(linha.parcelaId, mapeadorDeDocumento.paraDominio(linha));
      }
    }
    return porParcela;
  }

  async porParcela(parcelaId: string): Promise<DocumentoDeCobranca[]> {
    const linhas = await this.prisma.documentoDeCobranca.findMany({
      where: { parcelaId },
      orderBy: { emitidoEm: 'desc' },
    });
    return linhas.map(mapeadorDeDocumento.paraDominio);
  }

  async porIdentificadorExterno(
    provedor: string,
    identificador: string,
  ): Promise<DocumentoDeCobranca | null> {
    const linha = await this.prisma.documentoDeCobranca.findUnique({
      where: { provedor_identificadorExterno: { provedor, identificadorExterno: identificador } },
    });
    return linha ? mapeadorDeDocumento.paraDominio(linha) : null;
  }

  async salvar(documento: DocumentoDeCobranca): Promise<void> {
    const dados = mapeadorDeDocumento.paraPersistencia(documento);
    await this.prisma.documentoDeCobranca.upsert({
      where: { id: dados.id },
      create: dados,
      update: dados,
    });
  }
}
