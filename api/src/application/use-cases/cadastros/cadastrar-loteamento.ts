import { Loteamento } from '../../../domain/cadastros/loteamento.js';
import { Identificador } from '../../../domain/shared/identificador.js';
import type { GeradorDeIdentificador } from '../../ports/comuns.js';
import type { RepositorioDeLoteamentos } from '../../ports/repositorios.js';

export interface EntradaDeCadastroDeLoteamento {
  readonly nome: string;
  readonly cidade: string;
  readonly uf: string;
  readonly registroImobiliario?: string | null;
}

export class CadastrarLoteamento {
  constructor(
    private readonly loteamentos: RepositorioDeLoteamentos,
    private readonly geradorDeIdentificador: GeradorDeIdentificador,
  ) {}

  async executar(entrada: EntradaDeCadastroDeLoteamento): Promise<Loteamento> {
    const loteamento = Loteamento.novo({
      id: Identificador.de(this.geradorDeIdentificador.gerar()),
      nome: entrada.nome,
      cidade: entrada.cidade,
      uf: entrada.uf,
      registroImobiliario: entrada.registroImobiliario,
    });

    await this.loteamentos.salvar(loteamento);
    return loteamento;
  }
}
