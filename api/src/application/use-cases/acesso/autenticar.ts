import type { Papel } from '../../../domain/acesso/usuario.js';
import { ErroDeAutorizacao } from '../../../domain/shared/errors.js';
import type { RepositorioDeUsuarios } from '../../ports/repositorios.js';
import type { ServicoDeSenha, ServicoDeToken } from '../../ports/seguranca.js';

export interface EntradaDeAutenticacao {
  readonly email: string;
  readonly senha: string;
}

export interface SaidaDeAutenticacao {
  readonly token: string;
  readonly usuario: {
    readonly id: string;
    readonly nome: string;
    readonly email: string;
    readonly papel: Papel;
    readonly permissoes: readonly string[];
  };
}

/**
 * Login por e-mail e senha.
 *
 * A mensagem de erro e a mesma para e-mail inexistente e senha errada — dizer
 * qual dos dois falhou entrega ao atacante quais e-mails existem no sistema.
 */
export class Autenticar {
  constructor(
    private readonly usuarios: RepositorioDeUsuarios,
    private readonly servicoDeSenha: ServicoDeSenha,
    private readonly servicoDeToken: ServicoDeToken,
  ) {}

  async executar(entrada: EntradaDeAutenticacao): Promise<SaidaDeAutenticacao> {
    const usuario = await this.usuarios.porEmail(entrada.email.trim().toLowerCase());

    const senhaConfere =
      usuario !== null && (await this.servicoDeSenha.conferir(entrada.senha, usuario.senhaHash));

    if (!usuario || !senhaConfere) {
      throw new ErroDeAutorizacao('E-mail ou senha invalidos.');
    }
    if (!usuario.ativo) {
      throw new ErroDeAutorizacao('Usuario inativo. Procure o administrador.');
    }

    usuario.registrarAcesso();
    await this.usuarios.salvar(usuario);

    return {
      token: this.servicoDeToken.emitir({
        usuarioId: usuario.id.paraString(),
        email: usuario.email.valor,
        papel: usuario.papel,
      }),
      usuario: {
        id: usuario.id.paraString(),
        nome: usuario.nome,
        email: usuario.email.valor,
        papel: usuario.papel,
        permissoes: usuario.permissoes,
      },
    };
  }
}
