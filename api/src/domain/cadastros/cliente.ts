import { Entidade } from '../shared/entidade.js';
import { ErroDeValidacao } from '../shared/errors.js';
import { Identificador } from '../shared/identificador.js';
import { CpfCnpj } from '../value-objects/cpf-cnpj.js';
import { Email, Telefone, normalizarEndereco, type Endereco } from '../value-objects/contato.js';
import { DataCivil } from '../value-objects/data-civil.js';

interface EstadoDoCliente {
  id: Identificador;
  nome: string;
  documento: CpfCnpj;
  email: Email | null;
  telefone: Telefone | null;
  whatsapp: Telefone | null;
  dataNascimento: DataCivil | null;
  endereco: Endereco;
  observacoes: string | null;
  ativo: boolean;
}

/** O comprador do lote — destinatario de toda cobranca gerada pelo contrato. */
export class Cliente extends Entidade {
  private constructor(private readonly estado: EstadoDoCliente) {
    super(estado.id);
  }

  static novo(entrada: {
    id: Identificador;
    nome: string;
    documento: CpfCnpj;
    email?: Email | null;
    telefone?: Telefone | null;
    whatsapp?: Telefone | null;
    dataNascimento?: DataCivil | null;
    endereco: Endereco;
    observacoes?: string | null;
  }): Cliente {
    const nome = entrada.nome?.trim();
    if (!nome || nome.length < 3) {
      throw new ErroDeValidacao('Nome do cliente deve ter ao menos 3 caracteres.');
    }
    return new Cliente({
      id: entrada.id,
      nome,
      documento: entrada.documento,
      email: entrada.email ?? null,
      telefone: entrada.telefone ?? null,
      whatsapp: entrada.whatsapp ?? entrada.telefone ?? null,
      dataNascimento: entrada.dataNascimento ?? null,
      endereco: normalizarEndereco(entrada.endereco),
      observacoes: entrada.observacoes?.trim() || null,
      ativo: true,
    });
  }

  static restaurar(estado: EstadoDoCliente): Cliente {
    return new Cliente({ ...estado });
  }

  get nome(): string {
    return this.estado.nome;
  }

  get documento(): CpfCnpj {
    return this.estado.documento;
  }

  get email(): Email | null {
    return this.estado.email;
  }

  get telefone(): Telefone | null {
    return this.estado.telefone;
  }

  get whatsapp(): Telefone | null {
    return this.estado.whatsapp;
  }

  get dataNascimento(): DataCivil | null {
    return this.estado.dataNascimento;
  }

  get endereco(): Endereco {
    return this.estado.endereco;
  }

  get observacoes(): string | null {
    return this.estado.observacoes;
  }

  get ativo(): boolean {
    return this.estado.ativo;
  }

  /** Canais disponiveis definem quais avisos a regua consegue enviar. */
  podeReceberWhatsApp(): boolean {
    return this.estado.whatsapp !== null && this.estado.whatsapp.ehCelular();
  }

  podeReceberEmail(): boolean {
    return this.estado.email !== null;
  }

  atualizarDados(dados: {
    nome?: string;
    email?: Email | null;
    telefone?: Telefone | null;
    whatsapp?: Telefone | null;
    dataNascimento?: DataCivil | null;
    endereco?: Endereco;
    observacoes?: string | null;
  }): void {
    if (dados.nome !== undefined) {
      const nome = dados.nome.trim();
      if (nome.length < 3) throw new ErroDeValidacao('Nome do cliente deve ter ao menos 3 caracteres.');
      this.estado.nome = nome;
    }
    if (dados.email !== undefined) this.estado.email = dados.email;
    if (dados.telefone !== undefined) this.estado.telefone = dados.telefone;
    if (dados.whatsapp !== undefined) this.estado.whatsapp = dados.whatsapp;
    if (dados.dataNascimento !== undefined) this.estado.dataNascimento = dados.dataNascimento;
    if (dados.endereco !== undefined) this.estado.endereco = normalizarEndereco(dados.endereco);
    if (dados.observacoes !== undefined) this.estado.observacoes = dados.observacoes?.trim() || null;
  }

  inativar(): void {
    this.estado.ativo = false;
  }

  reativar(): void {
    this.estado.ativo = true;
  }

  paraEstado(): Readonly<EstadoDoCliente> {
    return { ...this.estado };
  }
}
