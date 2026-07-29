import type { Cliente } from '../../../domain/cadastros/cliente.js';
import { ErroNaoEncontrado } from '../../../domain/shared/errors.js';
import type { Email, Endereco, Telefone } from '../../../domain/value-objects/contato.js';
import type { DataCivil } from '../../../domain/value-objects/data-civil.js';
import type { RepositorioDeClientes } from '../../ports/repositorios.js';

/**
 * Campo ausente significa "nao mexer"; `null` significa "apagar". O documento
 * nao entra: trocar o CPF de um cliente com contrato ativo e outra operacao,
 * nao uma edicao de ficha.
 */
export interface EntradaDeAtualizacaoDeCliente {
  readonly id: string;
  readonly nome?: string;
  readonly email?: Email | null;
  readonly telefone?: Telefone | null;
  readonly whatsapp?: Telefone | null;
  readonly dataNascimento?: DataCivil | null;
  readonly endereco?: Endereco;
  readonly observacoes?: string | null;
  readonly ativo?: boolean;
}

export class AtualizarCliente {
  constructor(private readonly clientes: RepositorioDeClientes) {}

  async executar(entrada: EntradaDeAtualizacaoDeCliente): Promise<Cliente> {
    const cliente = await this.clientes.porId(entrada.id);
    if (!cliente) {
      throw new ErroNaoEncontrado('Cliente', entrada.id);
    }

    cliente.atualizarDados({
      nome: entrada.nome,
      email: entrada.email,
      telefone: entrada.telefone,
      whatsapp: entrada.whatsapp,
      dataNascimento: entrada.dataNascimento,
      endereco: entrada.endereco,
      observacoes: entrada.observacoes,
    });

    if (entrada.ativo !== undefined) {
      if (entrada.ativo) cliente.reativar();
      else cliente.inativar();
    }

    await this.clientes.salvar(cliente);
    return cliente;
  }
}
