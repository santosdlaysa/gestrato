import { Quadra } from '../../../domain/cadastros/lote.js';
import { ErroDeConflito, ErroNaoEncontrado } from '../../../domain/shared/errors.js';
import { Identificador } from '../../../domain/shared/identificador.js';
import type { GeradorDeIdentificador } from '../../ports/comuns.js';
import type { RepositorioDeLoteamentos, RepositorioDeQuadras } from '../../ports/repositorios.js';

export interface EntradaDeCadastroDeQuadra {
  readonly loteamentoId: string;
  readonly nome: string;
}

export class CadastrarQuadra {
  constructor(
    private readonly quadras: RepositorioDeQuadras,
    private readonly loteamentos: RepositorioDeLoteamentos,
    private readonly geradorDeIdentificador: GeradorDeIdentificador,
  ) {}

  async executar(entrada: EntradaDeCadastroDeQuadra): Promise<Quadra> {
    const loteamento = await this.loteamentos.porId(entrada.loteamentoId);
    if (!loteamento) {
      throw new ErroNaoEncontrado('Loteamento', entrada.loteamentoId);
    }

    const quadra = Quadra.nova({
      id: Identificador.de(this.geradorDeIdentificador.gerar()),
      loteamentoId: loteamento.id,
      nome: entrada.nome,
    });

    // Comparacao feita depois de construir a quadra porque a entidade normaliza
    // o nome (aparas e caixa alta) — "a" e "A " sao a mesma quadra.
    const existentes = await this.quadras.porLoteamento(entrada.loteamentoId);
    if (existentes.some((candidata) => candidata.nome === quadra.nome)) {
      throw new ErroDeConflito(`Ja existe a quadra ${quadra.nome} no loteamento ${loteamento.nome}.`);
    }

    await this.quadras.salvar(quadra);
    return quadra;
  }
}
