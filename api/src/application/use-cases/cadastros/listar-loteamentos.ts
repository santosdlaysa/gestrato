import type { Loteamento } from '../../../domain/cadastros/loteamento.js';
import type { RepositorioDeLoteamentos } from '../../ports/repositorios.js';

export class ListarLoteamentos {
  constructor(private readonly loteamentos: RepositorioDeLoteamentos) {}

  async executar(): Promise<Loteamento[]> {
    return this.loteamentos.listar();
  }
}
