import type { RepositorioDeLoteamentos } from '../../../../application/ports/repositorios.js';
import type { Loteamento } from '../../../../domain/cadastros/loteamento.js';
import type { ClientePrisma } from '../cliente-prisma.js';
import { mapeadorDeLoteamento } from '../mappers/loteamento.mapper.js';

/** Tabela pequena por natureza (uma loteadora tem dezenas, nao milhares) — listagem sem paginacao. */
export class RepositorioDeLoteamentosPrisma implements RepositorioDeLoteamentos {
  constructor(private readonly prisma: ClientePrisma) {}

  async porId(id: string): Promise<Loteamento | null> {
    const linha = await this.prisma.loteamento.findUnique({ where: { id } });
    return linha ? mapeadorDeLoteamento.paraDominio(linha) : null;
  }

  async listar(): Promise<Loteamento[]> {
    const linhas = await this.prisma.loteamento.findMany({ orderBy: { nome: 'asc' } });
    return linhas.map(mapeadorDeLoteamento.paraDominio);
  }

  async salvar(loteamento: Loteamento): Promise<void> {
    const dados = mapeadorDeLoteamento.paraPersistencia(loteamento);
    await this.prisma.loteamento.upsert({
      where: { id: dados.id },
      create: dados,
      update: dados,
    });
  }
}
