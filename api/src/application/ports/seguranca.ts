import type { Papel } from '../../domain/acesso/usuario.js';

/** Hash de senha — algoritmo e detalhe de infraestrutura. */
export interface ServicoDeSenha {
  gerarHash(senha: string): Promise<string>;
  conferir(senha: string, hash: string): Promise<boolean>;
}

export interface ConteudoDoToken {
  readonly usuarioId: string;
  readonly email: string;
  readonly papel: Papel;
}

export interface ServicoDeToken {
  emitir(conteudo: ConteudoDoToken): string;
  /** Devolve `null` para token invalido ou expirado — nao lanca. */
  verificar(token: string): ConteudoDoToken | null;
}
