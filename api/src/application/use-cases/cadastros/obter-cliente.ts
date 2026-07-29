import type { Cliente } from '../../../domain/cadastros/cliente.js';
import { ErroNaoEncontrado } from '../../../domain/shared/errors.js';
import type { RepositorioDeClientes } from '../../ports/repositorios.js';

export class ObterCliente {
  constructor(private readonly clientes: RepositorioDeClientes) {}

  async executar(entrada: { readonly id: string }): Promise<Cliente> {
    const cliente = await this.clientes.porId(entrada.id);
    if (!cliente) {
      throw new ErroNaoEncontrado('Cliente', entrada.id);
    }
    return cliente;
  }
}
