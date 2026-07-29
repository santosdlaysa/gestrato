import { Lote } from '../../../domain/cadastros/lote.js';
import { ErroNaoEncontrado } from '../../../domain/shared/errors.js';
import { Identificador } from '../../../domain/shared/identificador.js';
import type { Dinheiro } from '../../../domain/value-objects/dinheiro.js';
import type { GeradorDeIdentificador } from '../../ports/comuns.js';
import type { RepositorioDeLotes, RepositorioDeQuadras } from '../../ports/repositorios.js';
import type { ContextoDeLotes, LoteDetalhado } from './contexto-de-lotes.js';

/**
 * `situacao` nao entra: o lote nasce DISPONIVEL e so muda pelo ciclo do
 * contrato (venda, distrato). Deixar o cadastro escrever "VENDIDO" criaria um
 * lote vendido sem contrato — e sem cobranca.
 */
export interface EntradaDeCadastroDeLote {
  readonly quadraId: string;
  readonly numero: string;
  readonly areaEmMetrosQuadrados: number;
  readonly valorDeTabela?: Dinheiro | null;
  readonly descricao?: string | null;
}

export class CadastrarLote {
  constructor(
    private readonly lotes: RepositorioDeLotes,
    private readonly quadras: RepositorioDeQuadras,
    private readonly contexto: ContextoDeLotes,
    private readonly geradorDeIdentificador: GeradorDeIdentificador,
  ) {}

  async executar(entrada: EntradaDeCadastroDeLote): Promise<LoteDetalhado> {
    const quadra = await this.quadras.porId(entrada.quadraId);
    if (!quadra) {
      throw new ErroNaoEncontrado('Quadra', entrada.quadraId);
    }

    const lote = Lote.novo({
      id: Identificador.de(this.geradorDeIdentificador.gerar()),
      quadraId: quadra.id,
      numero: entrada.numero,
      areaEmMetrosQuadrados: entrada.areaEmMetrosQuadrados,
      valorDeTabela: entrada.valorDeTabela,
      descricao: entrada.descricao,
    });

    await this.lotes.salvar(lote);
    return this.contexto.daQuadra(lote, quadra);
  }
}
