import type { Lote, Quadra } from '../../../domain/cadastros/lote.js';
import type { Loteamento } from '../../../domain/cadastros/loteamento.js';
import { ErroNaoEncontrado } from '../../../domain/shared/errors.js';
import type { Identificador } from '../../../domain/shared/identificador.js';
import type { FiltroDeLotes, RepositorioDeLoteamentos, RepositorioDeQuadras } from '../../ports/repositorios.js';

/** O lote com a quadra e o loteamento a que pertence — o formato que a API expoe. */
export interface LoteDetalhado {
  readonly lote: Lote;
  readonly quadra: Quadra;
  readonly loteamento: Loteamento;
}

/**
 * Resolve a que quadra e a que loteamento cada lote pertence.
 *
 * O agregado Lote guarda so o `quadraId`, mas o contrato da API devolve os
 * nomes. Buscar a quadra lote a lote seria um N+1 na listagem, entao a pagina
 * inteira e resolvida com um numero de consultas que depende do filtro, nunca
 * da quantidade de lotes retornados.
 */
export class ContextoDeLotes {
  constructor(
    private readonly quadras: RepositorioDeQuadras,
    private readonly loteamentos: RepositorioDeLoteamentos,
  ) {}

  async doLote(lote: Lote): Promise<LoteDetalhado> {
    const quadraId = lote.quadraId.paraString();
    const quadra = await this.quadras.porId(quadraId);
    if (!quadra) {
      throw new ErroNaoEncontrado('Quadra', quadraId);
    }
    return this.daQuadra(lote, quadra);
  }

  /** Atalho para quem ja carregou a quadra (o cadastro de lote, por exemplo). */
  async daQuadra(lote: Lote, quadra: Quadra): Promise<LoteDetalhado> {
    const loteamentoId = quadra.loteamentoId.paraString();
    const loteamento = await this.loteamentos.porId(loteamentoId);
    if (!loteamento) {
      throw new ErroNaoEncontrado('Loteamento', loteamentoId);
    }
    return { lote, quadra, loteamento };
  }

  async daPagina(lotes: readonly Lote[], filtro: FiltroDeLotes): Promise<LoteDetalhado[]> {
    if (lotes.length === 0) return [];

    const loteamentos = await this.loteamentosDaConsulta(filtro);
    const quadras = await this.quadrasDaConsulta(filtro, loteamentos);
    const quadrasPorId = indexarPorId(quadras);
    const loteamentosPorId = indexarPorId(loteamentos);

    return lotes.map((lote) => {
      const quadraId = lote.quadraId.paraString();
      const quadra = quadrasPorId.get(quadraId);
      if (!quadra) {
        throw new ErroNaoEncontrado('Quadra', quadraId);
      }
      const loteamentoId = quadra.loteamentoId.paraString();
      const loteamento = loteamentosPorId.get(loteamentoId);
      if (!loteamento) {
        throw new ErroNaoEncontrado('Loteamento', loteamentoId);
      }
      return { lote, quadra, loteamento };
    });
  }

  private async loteamentosDaConsulta(filtro: FiltroDeLotes): Promise<Loteamento[]> {
    if (!filtro.loteamentoId) {
      return this.loteamentos.listar();
    }
    const loteamento = await this.loteamentos.porId(filtro.loteamentoId);
    if (!loteamento) {
      throw new ErroNaoEncontrado('Loteamento', filtro.loteamentoId);
    }
    return [loteamento];
  }

  private async quadrasDaConsulta(filtro: FiltroDeLotes, loteamentos: readonly Loteamento[]): Promise<Quadra[]> {
    if (filtro.quadraId) {
      const quadra = await this.quadras.porId(filtro.quadraId);
      return quadra ? [quadra] : [];
    }
    const grupos = await Promise.all(
      loteamentos.map((loteamento) => this.quadras.porLoteamento(loteamento.id.paraString())),
    );
    return grupos.flat();
  }
}

function indexarPorId<T extends { readonly id: Identificador }>(itens: readonly T[]): Map<string, T> {
  return new Map(itens.map((item) => [item.id.paraString(), item]));
}
