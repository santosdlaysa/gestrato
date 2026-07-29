import { ErroNaoEncontrado } from '../../../domain/shared/errors.js';
import type { Dinheiro } from '../../../domain/value-objects/dinheiro.js';
import type { RepositorioDeLotes } from '../../ports/repositorios.js';
import type { ContextoDeLotes, LoteDetalhado } from './contexto-de-lotes.js';

/** Nem `situacao` nem `quadraId`: mudar de quadra e recadastrar, mudar de situacao e vender. */
export interface EntradaDeAtualizacaoDeLote {
  readonly id: string;
  readonly numero?: string;
  readonly areaEmMetrosQuadrados?: number;
  readonly valorDeTabela?: Dinheiro | null;
  readonly descricao?: string | null;
}

export class AtualizarLote {
  constructor(
    private readonly lotes: RepositorioDeLotes,
    private readonly contexto: ContextoDeLotes,
  ) {}

  async executar(entrada: EntradaDeAtualizacaoDeLote): Promise<LoteDetalhado> {
    const lote = await this.lotes.porId(entrada.id);
    if (!lote) {
      throw new ErroNaoEncontrado('Lote', entrada.id);
    }

    lote.atualizarDados({
      numero: entrada.numero,
      areaEmMetrosQuadrados: entrada.areaEmMetrosQuadrados,
      valorDeTabela: entrada.valorDeTabela,
      descricao: entrada.descricao,
    });

    await this.lotes.salvar(lote);
    return this.contexto.doLote(lote);
  }
}
