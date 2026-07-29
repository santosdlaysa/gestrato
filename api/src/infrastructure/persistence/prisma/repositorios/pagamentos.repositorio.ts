import type { Prisma } from '@prisma/client';
import { montarPagina, type Pagina } from '../../../../application/ports/comuns.js';
import type { FiltroDePagamentos, RepositorioDePagamentos } from '../../../../application/ports/repositorios.js';
import type { Pagamento } from '../../../../domain/contratos/pagamento.js';
import type { ClientePrisma } from '../cliente-prisma.js';
import { mapeadorDePagamento } from '../mappers/parcela.mapper.js';

export class RepositorioDePagamentosPrisma implements RepositorioDePagamentos {
  constructor(private readonly prisma: ClientePrisma) {}

  async porId(id: string): Promise<Pagamento | null> {
    const linha = await this.prisma.pagamento.findUnique({ where: { id } });
    return linha ? mapeadorDePagamento.paraDominio(linha) : null;
  }

  async porParcela(parcelaId: string): Promise<Pagamento[]> {
    const linhas = await this.prisma.pagamento.findMany({
      where: { parcelaId },
      orderBy: { criadoEm: 'asc' },
    });
    return linhas.map(mapeadorDePagamento.paraDominio);
  }

  async listar(filtro: FiltroDePagamentos): Promise<Pagina<Pagamento>> {
    const where: Prisma.PagamentoWhereInput = {};
    if (filtro.contratoId) where.contratoId = filtro.contratoId;
    if (!filtro.incluirEstornados) where.estornado = false;
    if (filtro.de || filtro.ate) {
      where.pagoEm = {
        ...(filtro.de ? { gte: filtro.de.paraDateUtc() } : {}),
        ...(filtro.ate ? { lte: filtro.ate.paraDateUtc() } : {}),
      };
    }

    const [linhas, total] = await Promise.all([
      this.prisma.pagamento.findMany({
        where,
        orderBy: [{ pagoEm: 'desc' }, { criadoEm: 'desc' }],
        skip: (filtro.pagina - 1) * filtro.porPagina,
        take: filtro.porPagina,
      }),
      this.prisma.pagamento.count({ where }),
    ]);
    return montarPagina(linhas.map(mapeadorDePagamento.paraDominio), total, filtro);
  }

  async registrar(pagamento: Pagamento): Promise<void> {
    await this.prisma.pagamento.create({ data: mapeadorDePagamento.paraPersistencia(pagamento) });
  }

  async salvar(pagamento: Pagamento): Promise<void> {
    const dados = mapeadorDePagamento.paraPersistencia(pagamento);
    await this.prisma.pagamento.update({ where: { id: dados.id }, data: dados });
  }

  /** Estorno preserva a linha e marca a flag — relatorio de caixa nao perde historico. */
  async estornarDaParcela(parcelaId: string): Promise<void> {
    await this.prisma.pagamento.updateMany({
      where: { parcelaId, estornado: false },
      data: { estornado: true },
    });
  }
}
