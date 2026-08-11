/** Hash de senha — algoritmo e detalhe de infraestrutura. */
export interface ServicoDeSenha {
  gerarHash(senha: string): Promise<string>;
  conferir(senha: string, hash: string): Promise<boolean>;
}

/**
 * O token carrega apenas a identidade (id + e-mail). As permissoes NAO entram no
 * token: como os perfis sao editaveis em tempo real, a autorizacao e resolvida a
 * cada requisicao a partir do banco — assim mudar um perfil ou inativar um
 * usuario tem efeito imediato, sem esperar o token expirar.
 */
export interface ConteudoDoToken {
  readonly usuarioId: string;
  readonly email: string;
}

export interface ServicoDeToken {
  emitir(conteudo: ConteudoDoToken): string;
  /** Devolve `null` para token invalido ou expirado — nao lanca. */
  verificar(token: string): ConteudoDoToken | null;
}
