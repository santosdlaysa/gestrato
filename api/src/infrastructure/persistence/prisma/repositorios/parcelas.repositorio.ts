import type { Prisma } from '@prisma/client';
import { montarPagina, type Pagina } from '../../../../application/ports/comuns.js';
import type { FiltroDeParcelas, RepositorioDeParcelas } from '../../../../application/ports/repositorios.js';
import type { Parcela } from '../../../../domain/contratos/parcela.js';
import type { DataCivil } from '../../../../domain/value-objects/data-civil.js';
import type { ClientePrisma } from '../cliente-prisma.js';
import { mapeadorDeParcela } from '../mappers/parcela.mapper.js';

const STATUS_EM_ABERTO = ['PENDENTE', 'PAGA_PARCIAL'] as const;

export class RepositorioDeParcelasPrisma implements RepositorioDeParcelas {
  constructor(private readonly prisma: ClientePrisma) {}

  async porId(id: string): Promise<Parcela | null> {
    const linha = await this.prisma.parcela.findUnique({ where: { id } });
    return linha ? mapeadorDeParcela.paraDominio(linha) : null;
  }

  async porIds(ids: readonly string[]): Promise<Parcela[]> {
    if (ids.length === 0) return [];
    const linhas = await this.prisma.parcela.findMany({
      where: { id: { in: [...ids] } },
      orderBy: [{ numero: 'asc' }],
    });
    return linhas.map(mapeadorDeParcela.paraDominio);
  }

  async porContrato(contratoId: string): Promise<Parcela[]> {
    const linhas = await this.prisma.parcela.findMany({
      where: { contratoId },
      orderBy: [{ numero: 'asc' }],
    });
    return linhas.map(mapeadorDeParcela.paraDominio);
  }

  async porContratos(contratoIds: readonly string[]): Promise<Map<string, Parcela[]>> {
    const agrupadas = new Map<string, Parcela[]>();
    if (contratoIds.length === 0) return agrupadas;

    const linhas = await this.prisma.parcela.findMany({
      where: { contratoId: { in: [...contratoIds] } },
      orderBy: [{ contratoId: 'asc' }, { numero: 'asc' }],
    });
    for (const linha of linhas) {
      const lista = agrupadas.get(linha.contratoId) ?? [];
      lista.push(mapeadorDeParcela.paraDominio(linha));
      agrupadas.set(linha.contratoId, lista);
    }
    return agrupadas;
  }

  async listar(filtro: FiltroDeParcelas): Promise<Pagina<Parcela>> {
    const where = montarCondicoes(filtro);
    const [linhas, total] = await Promise.all([
      this.prisma.parcela.findMany({
        where,
        orderBy: [{ vencimento: 'asc' }, { numero: 'asc' }],
        skip: (filtro.pagina - 1) * filtro.porPagina,
        take: filtro.porPagina,
      }),
      this.prisma.parcela.count({ where }),
    ]);
    return montarPagina(linhas.map(mapeadorDeParcela.paraDominio), total, filtro);
  }

  /**
   * Sustentada pelo indice `(status, vencimento)`. Restringe a contratos ativos
   * porque contrato cancelado ou distratado nao deve gerar cobranca — a parcela
   * pode ter ficado em aberto por um encerramento antigo.
   */
  async emAbertoComVencimentoEntre(de: DataCivil, ate: DataCivil): Promise<Parcela[]> {
    const linhas = await this.prisma.parcela.findMany({
      where: {
        status: { in: [...STATUS_EM_ABERTO] },
        vencimento: { gte: de.paraDateUtc(), lte: ate.paraDateUtc() },
        contrato: { status: 'ATIVO' },
      },
      orderBy: [{ vencimento: 'asc' }],
    });
    return linhas.map(mapeadorDeParcela.paraDominio);
  }

  async salvar(parcela: Parcela): Promise<void> {
    const dados = mapeadorDeParcela.paraPersistencia(parcela);
    await this.prisma.parcela.update({ where: { id: dados.id }, data: dados });
  }

  /**
   * Atualiza varias parcelas. Usado na renegociacao e no reajuste, onde dezenas
   * de linhas mudam juntas — quem chama ja esta dentro de uma transacao, entao
   * ou tudo persiste ou nada persiste.
   */
  async salvarVarias(parcelas: readonly Parcela[]): Promise<void> {
    for (const parcela of parcelas) {
      await this.salvar(parcela);
    }
  }

  /** Insercao em lote das parcelas recem-geradas pelo contrato. */
  async criarVarias(parcelas: readonly Parcela[]): Promise<void> {
    if (parcelas.length === 0) return;
    await this.prisma.parcela.createMany({
      data: parcelas.map(mapeadorDeParcela.paraPersistencia),
    });
  }
}

function montarCondicoes(filtro: FiltroDeParcelas): Prisma.ParcelaWhereInput {
  const condicoes: Prisma.ParcelaWhereInput = {};

  if (filtro.contratoId) condicoes.contratoId = filtro.contratoId;
  if (filtro.somenteEmAberto) {
    condicoes.status = { in: [...STATUS_EM_ABERTO] };
  } else if (filtro.status && filtro.status.length > 0) {
    condicoes.status = { in: [...filtro.status] };
  }

  if (filtro.vencendoDe || filtro.vencendoAte) {
    condicoes.vencimento = {
      ...(filtro.vencendoDe ? { gte: filtro.vencendoDe.paraDateUtc() } : {}),
      ...(filtro.vencendoAte ? { lte: filtro.vencendoAte.paraDateUtc() } : {}),
    };
  }

  const condicoesDoContrato: Prisma.ContratoWhereInput = {};
  if (filtro.clienteId) condicoesDoContrato.clienteId = filtro.clienteId;
  if (filtro.loteamentoId) condicoesDoContrato.lote = { quadra: { loteamentoId: filtro.loteamentoId } };
  if (Object.keys(condicoesDoContrato).length > 0) condicoes.contrato = condicoesDoContrato;

  return condicoes;
}
