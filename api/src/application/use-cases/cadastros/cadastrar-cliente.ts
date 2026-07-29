import { Cliente } from '../../../domain/cadastros/cliente.js';
import { ErroDeConflito } from '../../../domain/shared/errors.js';
import { Identificador } from '../../../domain/shared/identificador.js';
import type { Email, Endereco, Telefone } from '../../../domain/value-objects/contato.js';
import type { CpfCnpj } from '../../../domain/value-objects/cpf-cnpj.js';
import type { DataCivil } from '../../../domain/value-objects/data-civil.js';
import type { GeradorDeIdentificador } from '../../ports/comuns.js';
import type { RepositorioDeClientes } from '../../ports/repositorios.js';

export interface EntradaDeCadastroDeCliente {
  readonly nome: string;
  readonly documento: CpfCnpj;
  readonly email?: Email | null;
  readonly telefone?: Telefone | null;
  readonly whatsapp?: Telefone | null;
  readonly dataNascimento?: DataCivil | null;
  readonly endereco: Endereco;
  readonly observacoes?: string | null;
}

/**
 * O documento e a identidade do devedor na cobranca: duplicar o cliente
 * significa dividir o historico dele em dois cadastros. Por isso a checagem
 * acontece antes de qualquer escrita.
 */
export class CadastrarCliente {
  constructor(
    private readonly clientes: RepositorioDeClientes,
    private readonly geradorDeIdentificador: GeradorDeIdentificador,
  ) {}

  async executar(entrada: EntradaDeCadastroDeCliente): Promise<Cliente> {
    const jaCadastrado = await this.clientes.porDocumento(entrada.documento.digitos);
    if (jaCadastrado) {
      throw new ErroDeConflito(
        `Documento ${entrada.documento.formatar()} ja cadastrado para ${jaCadastrado.nome}.`,
      );
    }

    const cliente = Cliente.novo({
      id: Identificador.de(this.geradorDeIdentificador.gerar()),
      nome: entrada.nome,
      documento: entrada.documento,
      email: entrada.email,
      telefone: entrada.telefone,
      whatsapp: entrada.whatsapp,
      dataNascimento: entrada.dataNascimento,
      endereco: entrada.endereco,
      observacoes: entrada.observacoes,
    });

    await this.clientes.salvar(cliente);
    return cliente;
  }
}
