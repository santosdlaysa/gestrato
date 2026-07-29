import type { NextFunction, RequestHandler, Response } from 'express';
import { ErroDeAutorizacao } from '../../../domain/shared/errors.js';
import { papelPode, type Permissao } from '../../../domain/acesso/usuario.js';
import type { ServicoDeToken } from '../../../application/ports/seguranca.js';
import type { RequisicaoAutenticada } from '../tipos.js';
import { ErroDeAutenticacao } from './tratador-de-erros.js';

const PREFIXO_BEARER = /^Bearer\s+/i;

/**
 * Exige um token valido e anexa a identidade a requisicao.
 *
 * Recebe o servico de token por parametro em vez de importar uma instancia:
 * o middleware nao decide qual implementacao usar, quem monta a aplicacao decide.
 */
export function criarExigirAutenticacao(servicoDeToken: ServicoDeToken): RequestHandler {
  return (requisicao: RequisicaoAutenticada, _resposta: Response, proximo: NextFunction) => {
    const cabecalho = requisicao.headers.authorization;
    if (!cabecalho || !PREFIXO_BEARER.test(cabecalho)) {
      proximo(new ErroDeAutenticacao('Informe o token no cabecalho Authorization: Bearer <token>.'));
      return;
    }

    const conteudo = servicoDeToken.verificar(cabecalho.replace(PREFIXO_BEARER, '').trim());
    if (!conteudo) {
      proximo(new ErroDeAutenticacao('Token invalido ou expirado.'));
      return;
    }

    requisicao.usuario = { id: conteudo.usuarioId, email: conteudo.email, papel: conteudo.papel };
    proximo();
  };
}

/**
 * Exige uma permissao especifica. A matriz papel-permissao vive no dominio
 * (`domain/acesso/usuario.ts`), entao a mesma regra vale para HTTP, job e CLI.
 */
export function exigirPermissao(permissao: Permissao): RequestHandler {
  return (requisicao: RequisicaoAutenticada, _resposta: Response, proximo: NextFunction) => {
    const usuario = requisicao.usuario;
    if (!usuario) {
      proximo(new ErroDeAutenticacao());
      return;
    }
    if (!papelPode(usuario.papel, permissao)) {
      proximo(
        new ErroDeAutorizacao(
          `Seu perfil (${usuario.papel.toLowerCase()}) nao tem permissao para: ${permissao.toLowerCase().replace(/_/g, ' ')}.`,
        ),
      );
      return;
    }
    proximo();
  };
}

/** Identidade garantida — evita `req.usuario!` espalhado pelos controllers. */
export function usuarioDaRequisicao(requisicao: RequisicaoAutenticada) {
  if (!requisicao.usuario) {
    throw new ErroDeAutenticacao();
  }
  return requisicao.usuario;
}
