import { montarPagina, type Pagina } from '../../../../application/ports/comuns.js';
import type { FiltroDeLotes, RepositorioDeLotes } from '../../../../application/ports/repositorios.js';
import type { Lote } from '../../../../domain/cadastros/lote.js';
import { ErroDeConflito } from '../../../../domain/shared/errors.js';
import type { ClientePrisma } from '../cliente-prisma.js';
import { mapeadorDeLote } from '../mappers/lote.mapper.js';
import { ehViolacaoDeUnicidade } from './quadras.repositorio.js';

export class RepositorioDeLotesPrisma implements RepositorioDeLotes {
  constructor(private readonly prisma: ClientePrisma) {}

  async porId(id: string): Promise<Lote | null> {
    const linha = await this.prisma.lote.findUnique({ where: { id } });
    return linha ? mapeadorDeLote.paraDominio(linha) : null;
  }

  async listar(filtro: FiltroDeLotes): Promise<Pagina<Lote>> {
    const condicao = condicaoDeBusca(filtro);
    const [linhas, total] = await Promise.all([
      this.prisma.lote.findMany({
        where: condicao,
        orderBy: [{ quadra: { nome: 'asc' } }, { numero: 'asc' }],
        skip: (filtro.pagina - 1) * filtro.porPagina,
        take: filtro.porPagina,
      }),
      this.prisma.lote.count({ where: condicao }),
    ]);
    return montarPagina(linhas.map(mapeadorDeLote.paraDominio), total, filtro);
  }

  async salvar(lote: Lote): Promise<void> {
    const dados = mapeadorDeLote.paraPersistencia(lote);
    try {
      await this.prisma.lote.upsert({
        where: { id: dados.id },
        create: dados,
        update: dados,
      });
    } catch (erro) {
      // Indice unico (quadraId, numero) — ver a mesma traducao em quadras.repositorio.
      if (ehViolacaoDeUnicidade(erro)) {
        throw new ErroDeConflito(`Ja existe o lote ${dados.numero} nesta quadra.`);
      }
      throw erro;
    }
  }
}

/** O lote nao guarda o loteamento: filtrar por empreendimento e navegar pela quadra. */
function condicaoDeBusca(filtro: FiltroDeLotes) {
  const termo = filtro.busca?.trim();
  return {
    ...(filtro.quadraId ? { quadraId: filtro.quadraId } : {}),
    ...(filtro.loteamentoId ? { quadra: { loteamentoId: filtro.loteamentoId } } : {}),
    ...(filtro.situacao ? { situacao: filtro.situacao } : {}),
    ...(termo
      ? {
          OR: [
            { numero: { contains: termo, mode: 'insensitive' as const } },
            { quadra: { nome: { contains: termo, mode: 'insensitive' as const } } },
          ],
        }
      : {}),
  };
}
