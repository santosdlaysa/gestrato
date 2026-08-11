import type { Request } from 'express';
import type { Permissao } from '../../domain/acesso/permissao.js';

/**
 * Identidade resolvida a cada requisicao. Diferente do token (que so guarda id e
 * e-mail), aqui vem o perfil e as permissoes efetivas, lidos do banco — e por
 * isso que inativar um usuario ou mudar um perfil tem efeito imediato.
 */
export interface UsuarioAutenticado {
  readonly id: string;
  readonly nome: string;
  readonly email: string;
  readonly perfilId: string;
  readonly perfilNome: string;
  readonly permissoes: readonly Permissao[];
}

/**
 * Em vez de aumentar o tipo global do Express (que vaza para todo o projeto e
 * deixa `req.usuario` "sempre presente" mesmo em rota publica), a rota
 * autenticada declara explicitamente que espera este tipo.
 */
export interface RequisicaoAutenticada extends Request {
  usuario?: UsuarioAutenticado;
}
