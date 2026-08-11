import { Entidade } from '../shared/entidade.js';
import { ErroDeValidacao } from '../shared/errors.js';
import { Identificador } from '../shared/identificador.js';
import { Email } from '../value-objects/contato.js';
import { Perfil } from './perfil.js';
import type { Permissao } from './permissao.js';

// Reexporta as permissoes para quem ja importava daqui (middleware, controllers).
export {
  PERMISSOES,
  ehPermissao,
  garantirPermissao,
  normalizarPermissoes,
  rotuloDaPermissao,
  type Permissao,
} from './permissao.js';

/**
 * Estado do usuario. O perfil e denormalizado no carregamento: guardamos o id do
 * perfil (o que de fato persiste) junto com o nome e as permissoes efetivas
 * daquele perfil, para que `pode()` continue self-contained e o login/apresentacao
 * nao precisem de uma segunda ida ao banco.
 */
interface EstadoDoUsuario {
  id: Identificador;
  nome: string;
  email: Email;
  senhaHash: string;
  perfilId: Identificador;
  perfilNome: string;
  permissoesDoPerfil: readonly Permissao[];
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
    perfil: Perfil;
  }): Usuario {
    const nome = entrada.nome?.trim();
    if (!nome) throw new ErroDeValidacao('Nome do usuario e obrigatorio.');
    if (!entrada.senhaHash) throw new ErroDeValidacao('Usuario precisa de senha.');
    return new Usuario({
      id: entrada.id,
      nome,
      email: entrada.email,
      senhaHash: entrada.senhaHash,
      perfilId: entrada.perfil.id,
      perfilNome: entrada.perfil.nome,
      permissoesDoPerfil: entrada.perfil.permissoes,
      ativo: true,
      ultimoAcesso: null,
    });
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

  get perfilId(): Identificador {
    return this.estado.perfilId;
  }

  get perfilNome(): string {
    return this.estado.perfilNome;
  }

  get ativo(): boolean {
    return this.estado.ativo;
  }

  get ultimoAcesso(): Date | null {
    return this.estado.ultimoAcesso;
  }

  pode(permissao: Permissao): boolean {
    return this.estado.ativo && this.estado.permissoesDoPerfil.includes(permissao);
  }

  /** Permissoes efetivas: usuario inativo nao pode nada, mesmo com perfil rico. */
  get permissoes(): readonly Permissao[] {
    return this.estado.ativo ? this.estado.permissoesDoPerfil : [];
  }

  renomear(nome: string): void {
    const limpo = nome?.trim();
    if (!limpo) throw new ErroDeValidacao('Nome do usuario e obrigatorio.');
    this.estado.nome = limpo;
  }

  alterarEmail(email: Email): void {
    this.estado.email = email;
  }

  atribuirPerfil(perfil: Perfil): void {
    this.estado.perfilId = perfil.id;
    this.estado.perfilNome = perfil.nome;
    this.estado.permissoesDoPerfil = perfil.permissoes;
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

  ativar(): void {
    this.estado.ativo = true;
  }

  paraEstado(): Readonly<EstadoDoUsuario> {
    return { ...this.estado };
  }
}
