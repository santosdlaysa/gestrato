import { Entidade } from '../shared/entidade.js';
import { ErroDeValidacao } from '../shared/errors.js';
import { Identificador } from '../shared/identificador.js';
import { Email } from '../value-objects/contato.js';

export const PAPEIS = ['ADMINISTRADOR', 'FINANCEIRO', 'VENDEDOR', 'CONSULTA'] as const;
export type Papel = (typeof PAPEIS)[number];

/**
 * O que cada papel pode fazer.
 *
 * A matriz mora no dominio, nao no middleware: "vendedor nao da baixa em
 * parcela" e regra de negocio da loteadora, e precisa valer independentemente
 * de a chamada ter vindo do HTTP, de um job ou de um script.
 */
export const PERMISSOES = [
  'CADASTRAR',
  'GERIR_CONTRATOS',
  'RECEBER_PAGAMENTO',
  'EMITIR_DOCUMENTO',
  'ENVIAR_COBRANCA',
  'CONFIGURAR_REGUA',
  'RENEGOCIAR',
  'ANEXAR_ARQUIVO',
  'REMOVER_ANEXO',
  'GERIR_USUARIOS',
] as const;
export type Permissao = (typeof PERMISSOES)[number];

const PERMISSOES_POR_PAPEL: Record<Papel, readonly Permissao[]> = {
  ADMINISTRADOR: PERMISSOES,
  FINANCEIRO: [
    'CADASTRAR',
    'GERIR_CONTRATOS',
    'RECEBER_PAGAMENTO',
    'EMITIR_DOCUMENTO',
    'ENVIAR_COBRANCA',
    'CONFIGURAR_REGUA',
    'RENEGOCIAR',
    'ANEXAR_ARQUIVO',
    'REMOVER_ANEXO',
  ],
  // Vendedor anexa o contrato assinado e os documentos do cliente, mas nao
  // apaga: exclusao de documento e ato que precisa de responsavel pelo processo.
  VENDEDOR: ['CADASTRAR', 'GERIR_CONTRATOS', 'EMITIR_DOCUMENTO', 'ANEXAR_ARQUIVO'],
  CONSULTA: [],
};

/** Consulta a matriz sem precisar carregar o usuario — usada pelo middleware HTTP. */
export function papelPode(papel: Papel, permissao: Permissao): boolean {
  return PERMISSOES_POR_PAPEL[papel].includes(permissao);
}

export function permissoesDoPapel(papel: Papel): readonly Permissao[] {
  return PERMISSOES_POR_PAPEL[papel];
}

export function garantirPapel(valor: string): Papel {
  if (!(PAPEIS as readonly string[]).includes(valor)) {
    throw new ErroDeValidacao(`Papel invalido: "${valor}". Esperado um de: ${PAPEIS.join(', ')}.`);
  }
  return valor as Papel;
}

interface EstadoDoUsuario {
  id: Identificador;
  nome: string;
  email: Email;
  senhaHash: string;
  papel: Papel;
  ativo: boolean;
  ultimoAcesso: Date | null;
}

export class Usuario extends Entidade {
  private constructor(private readonly estado: EstadoDoUsuario) {
    super(estado.id);
  }

  static novo(entrada: {
    id: Identificador;
    nome: string;
    email: Email;
    senhaHash: string;
    papel: Papel;
  }): Usuario {
    const nome = entrada.nome?.trim();
    if (!nome) throw new ErroDeValidacao('Nome do usuario e obrigatorio.');
    if (!entrada.senhaHash) throw new ErroDeValidacao('Usuario precisa de senha.');
    return new Usuario({ ...entrada, nome, ativo: true, ultimoAcesso: null });
  }

  static restaurar(estado: EstadoDoUsuario): Usuario {
    return new Usuario({ ...estado });
  }

  get nome(): string {
    return this.estado.nome;
  }

  get email(): Email {
    return this.estado.email;
  }

  get senhaHash(): string {
    return this.estado.senhaHash;
  }

  get papel(): Papel {
    return this.estado.papel;
  }

  get ativo(): boolean {
    return this.estado.ativo;
  }

  get ultimoAcesso(): Date | null {
    return this.estado.ultimoAcesso;
  }

  pode(permissao: Permissao): boolean {
    return this.estado.ativo && PERMISSOES_POR_PAPEL[this.estado.papel].includes(permissao);
  }

  get permissoes(): readonly Permissao[] {
    return this.estado.ativo ? PERMISSOES_POR_PAPEL[this.estado.papel] : [];
  }

  registrarAcesso(quando = new Date()): void {
    this.estado.ultimoAcesso = quando;
  }

  trocarSenha(novoHash: string): void {
    if (!novoHash) throw new ErroDeValidacao('Hash de senha invalido.');
    this.estado.senhaHash = novoHash;
  }

  inativar(): void {
    this.estado.ativo = false;
  }

  paraEstado(): Readonly<EstadoDoUsuario> {
    return { ...this.estado };
  }
}
