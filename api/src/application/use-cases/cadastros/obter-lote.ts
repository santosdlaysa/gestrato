import { ErroNaoEncontrado } from '../../../domain/shared/errors.js';
import type { RepositorioDeLotes } from '../../ports/repositorios.js';
import type { ContextoDeLotes, LoteDetalhado } from './contexto-de-lotes.js';

export class ObterLote {
  constructor(
    private readonly lotes: RepositorioDeLotes,
    private readonly contexto: ContextoDeLotes,
  ) {}

  async executar(entrada: { readonly id: string }): Promise<LoteDetalhado> {
    const lote = await this.lotes.porId(entrada.id);
    if (!lote) {
      throw new ErroNaoEncontrado('Lote', entrada.id);
    }
    return this.contexto.doLote(lote);
  }
}
