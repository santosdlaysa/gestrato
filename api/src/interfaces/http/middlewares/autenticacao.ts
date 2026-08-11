import type { NextFunction, RequestHandler, Response } from 'express';
import { ErroDeAutorizacao } from '../../../domain/shared/errors.js';
import { rotuloDaPermissao, type Permissao } from '../../../domain/acesso/permissao.js';
import type { ServicoDeToken } from '../../../application/ports/seguranca.js';
import type { RequisicaoAutenticada, UsuarioAutenticado } from '../tipos.js';
import { ErroDeAutenticacao } from './tratador-de-erros.js';

const PREFIXO_BEARER = /^Bearer\s+/i;

/**
 * Resolve a identidade autenticada a partir do id do token. Devolve `null`
 * quando o usuario nao existe mais ou esta inativo — nesses casos o token e
 * valido, mas a sessao nao deve continuar.
 */
export type ResolverIdentidade = (usuarioId: string) => Promise<UsuarioAutenticado | null>;

/**
 * Exige um token valido, resolve a identidade no banco e a anexa a requisicao.
 *
 * Recebe o servico de token e o resolvedor por parametro em vez de importar
 * instancias: o middleware nao decide qual implementacao usar, quem monta a
 * aplicacao decide. Resolver a identidade a cada requisicao (em vez de confiar
 * no que o token carrega) e o que torna a inativacao e a troca de perfil
 * imediatas.
 */
export function criarExigirAutenticacao(
  servicoDeToken: ServicoDeToken,
  resolverIdentidade: ResolverIdentidade,
): RequestHandler {
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

    resolverIdentidade(conteudo.usuarioId)
      .then((identidade) => {
        if (!identidade) {
          proximo(new ErroDeAutenticacao('Sessao encerrada. Entre novamente.'));
          return;
        }
        requisicao.usuario = identidade;
        proximo();
      })
      .catch(proximo);
  };
}

/**
 * Exige uma permissao especifica. As permissoes efetivas ja vieram resolvidas do
 * perfil do usuario na autenticacao, entao aqui e so uma checagem em memoria.
 */
export function exigirPermissao(permissao: Permissao): RequestHandler {
  return (requisicao: RequisicaoAutenticada, _resposta: Response, proximo: NextFunction) => {
    const usuario = requisicao.usuario;
    if (!usuario) {
      proximo(new ErroDeAutenticacao());
      return;
    }
    if (!usuario.permissoes.includes(permissao)) {
      proximo(
        new ErroDeAutorizacao(
          `Seu perfil (${usuario.perfilNome}) nao tem permissao para: ${rotuloDaPermissao(permissao).toLowerCase()}.`,
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
