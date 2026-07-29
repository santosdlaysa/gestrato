import type { RepositorioDeQuadras } from '../../../../application/ports/repositorios.js';
import type { Quadra } from '../../../../domain/cadastros/lote.js';
import { ErroDeConflito } from '../../../../domain/shared/errors.js';
import type { ClientePrisma } from '../cliente-prisma.js';
import { mapeadorDeQuadra } from '../mappers/lote.mapper.js';

export class RepositorioDeQuadrasPrisma implements RepositorioDeQuadras {
  constructor(private readonly prisma: ClientePrisma) {}

  async porId(id: string): Promise<Quadra | null> {
    const linha = await this.prisma.quadra.findUnique({ where: { id } });
    return linha ? mapeadorDeQuadra.paraDominio(linha) : null;
  }

  async porLoteamento(loteamentoId: string): Promise<Quadra[]> {
    const linhas = await this.prisma.quadra.findMany({
      where: { loteamentoId },
      orderBy: { nome: 'asc' },
    });
    return linhas.map(mapeadorDeQuadra.paraDominio);
  }

  async salvar(quadra: Quadra): Promise<void> {
    const dados = mapeadorDeQuadra.paraPersistencia(quadra);
    try {
      await this.prisma.quadra.upsert({
        where: { id: dados.id },
        create: dados,
        update: dados,
      });
    } catch (erro) {
      // O indice unico (loteamentoId, nome) e a ultima linha de defesa contra duas
      // requisicoes simultaneas: traduzimos para erro de dominio para a borda
      // responder 409 com mensagem util, em vez de vazar "P2002" ao usuario.
      if (ehViolacaoDeUnicidade(erro)) {
        throw new ErroDeConflito(`Ja existe a quadra ${dados.nome} neste loteamento.`);
      }
      throw erro;
    }
  }
}

/**
 * Checagem estrutural para nao importar `@prisma/client` fora dos mappers:
 * `P2002` e o codigo de violacao de restricao unica do Prisma.
 */
export function ehViolacaoDeUnicidade(erro: unknown): boolean {
  return erro instanceof Error && 'code' in erro && (erro as { code?: unknown }).code === 'P2002';
}
