import type { Cliente } from '../../../domain/cadastros/cliente.js';
import type { Pagina } from '../../ports/comuns.js';
import type { FiltroDeClientes, RepositorioDeClientes } from '../../ports/repositorios.js';

export class ListarClientes {
  constructor(private readonly clientes: RepositorioDeClientes) {}

  async executar(filtro: FiltroDeClientes): Promise<Pagina<Cliente>> {
    return this.clientes.listar(filtro);
  }
}
