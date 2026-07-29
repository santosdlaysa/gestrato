import type { Quadra } from '../../../domain/cadastros/lote.js';
import { ErroNaoEncontrado } from '../../../domain/shared/errors.js';
import type { RepositorioDeLoteamentos, RepositorioDeQuadras } from '../../ports/repositorios.js';

export class ListarQuadrasDoLoteamento {
  constructor(
    private readonly quadras: RepositorioDeQuadras,
    private readonly loteamentos: RepositorioDeLoteamentos,
  ) {}

  async executar(entrada: { readonly loteamentoId: string }): Promise<Quadra[]> {
    const loteamento = await this.loteamentos.porId(entrada.loteamentoId);
    if (!loteamento) {
      throw new ErroNaoEncontrado('Loteamento', entrada.loteamentoId);
    }
    return this.quadras.porLoteamento(entrada.loteamentoId);
  }
}
