import type { Request } from 'express';
import type { Papel } from '../../domain/acesso/usuario.js';

/** Identidade extraida do token, anexada a requisicao autenticada. */
export interface UsuarioAutenticado {
  readonly id: string;
  readonly email: string;
  readonly papel: Papel;
}

/**
 * Em vez de aumentar o tipo global do Express (que vaza para todo o projeto e
 * deixa `req.usuario` "sempre presente" mesmo em rota publica), a rota
 * autenticada declara explicitamente que espera este tipo.
 */
export interface RequisicaoAutenticada extends Request {
  usuario?: UsuarioAutenticado;
}
