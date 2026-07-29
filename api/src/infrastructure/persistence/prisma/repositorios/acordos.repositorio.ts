import type {
  RegistroDeReajuste,
  RepositorioDeReajustes,
  RepositorioDeRenegociacoes,
} from '../../../../application/ports/repositorios.js';
import { garantirIndiceReajuste } from '../../../../domain/contratos/tipos.js';
import type { Renegociacao } from '../../../../domain/contratos/renegociacao.js';
import type { ClientePrisma } from '../cliente-prisma.js';
import { deDataCivil, paraDataCivil } from '../mappers/conversores.js';
import { mapeadorDeRenegociacao } from '../mappers/renegociacao.mapper.js';

export class RepositorioDeRenegociacoesPrisma implements RepositorioDeRenegociacoes {
  constructor(private readonly prisma: ClientePrisma) {}

  async porId(id: string): Promise<Renegociacao | null> {
    const linha = await this.prisma.renegociacao.findUnique({
      where: { id },
      include: { parcelasSubstituidas: { select: { id: true } } },
    });
    if (!linha) return null;
    return mapeadorDeRenegociacao.paraDominio(
      linha,
      linha.parcelasSubstituidas.map((parcela) => parcela.id),
    );
  }

  async porContrato(contratoId: string): Promise<Renegociacao[]> {
    const linhas = await this.prisma.renegociacao.findMany({
      where: { contratoId },
      include: { parcelasSubstituidas: { select: { id: true } } },
      orderBy: { acordadoEm: 'desc' },
    });
    return linhas.map((linha) =>
      mapeadorDeRenegociacao.paraDominio(
        linha,
        linha.parcelasSubstituidas.map((parcela) => parcela.id),
      ),
    );
  }

  async salvar(renegociacao: Renegociacao): Promise<void> {
    const dados = mapeadorDeRenegociacao.paraPersistencia(renegociacao);
    await this.prisma.renegociacao.upsert({
      where: { id: dados.id },
      create: dados,
      update: dados,
    });
  }
}

export class RepositorioDeReajustesPrisma implements RepositorioDeReajustes {
  constructor(private readonly prisma: ClientePrisma) {}

  async porContrato(contratoId: string): Promise<RegistroDeReajuste[]> {
    const linhas = await this.prisma.reajuste.findMany({
      where: { contratoId },
      orderBy: { aplicadoAPartirDe: 'desc' },
    });
    return linhas.map((linha) => ({
      id: linha.id,
      contratoId: linha.contratoId,
      indice: linha.indice,
      percentual: linha.percentual,
      aplicadoAPartirDe: paraDataCivil(linha.aplicadoAPartirDe),
      parcelasAfetadas: linha.parcelasAfetadas,
      registradoPor: linha.registradoPor,
    }));
  }

  async registrar(reajuste: RegistroDeReajuste): Promise<void> {
    await this.prisma.reajuste.create({
      data: {
        id: reajuste.id,
        contratoId: reajuste.contratoId,
        indice: garantirIndiceReajuste(reajuste.indice),
        percentual: reajuste.percentual,
        aplicadoAPartirDe: deDataCivil(reajuste.aplicadoAPartirDe),
        parcelasAfetadas: reajuste.parcelasAfetadas,
        registradoPor: reajuste.registradoPor,
      },
    });
  }
}
