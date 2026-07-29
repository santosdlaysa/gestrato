import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import {
  ErroDeAutorizacao,
  ErroDeConflito,
  ErroDeRegraDeNegocio,
  ErroDeValidacao,
  ErroNaoEncontrado,
} from '../../../domain/shared/errors.js';
import { estaEmProducao } from '../../../infrastructure/config/ambiente.js';

/** Erro de autenticacao — nasce na borda HTTP, nao no dominio. */
export class ErroDeAutenticacao extends Error {
  constructor(mensagem = 'Credenciais invalidas ou ausentes.') {
    super(mensagem);
    this.name = 'ErroDeAutenticacao';
  }
}

const STATUS_POR_ERRO: ReadonlyArray<readonly [new (...args: never[]) => Error, number]> = [
  [ErroDeValidacao, 422],
  [ErroNaoEncontrado, 404],
  [ErroDeConflito, 409],
  [ErroDeRegraDeNegocio, 409],
  [ErroDeAutorizacao, 403],
  [ErroDeAutenticacao, 401],
];

/**
 * Traduz erro de dominio para HTTP num unico lugar.
 *
 * O dominio nao conhece codigo de status — quem sabe que "regra de negocio
 * violada" vira 409 e a borda. Assim o mesmo caso de uso serve a um job ou a
 * um CLI sem arrastar semantica de web junto.
 */
export function tratadorDeErros(
  erro: unknown,
  _requisicao: Request,
  resposta: Response,
  proximo: NextFunction,
): void {
  if (resposta.headersSent) {
    proximo(erro);
    return;
  }

  if (erro instanceof ZodError) {
    resposta.status(422).json({
      erro: {
        tipo: 'ErroDeValidacao',
        mensagem: 'Dados invalidos na requisicao.',
        detalhes: erro.issues.map((problema) => ({
          campo: problema.path.join('.') || '(raiz)',
          mensagem: problema.message,
        })),
      },
    });
    return;
  }

  const correspondencia = STATUS_POR_ERRO.find(([classe]) => erro instanceof classe);
  if (correspondencia && erro instanceof Error) {
    resposta.status(correspondencia[1]).json({
      erro: { tipo: erro.name, mensagem: erro.message },
    });
    return;
  }

  const daBorda = interpretarErroDeBorda(erro);
  if (daBorda) {
    resposta.status(daBorda.status).json({ erro: { tipo: daBorda.tipo, mensagem: daBorda.mensagem } });
    return;
  }

  // Daqui para baixo e falha nossa: registra completo no servidor e devolve
  // uma mensagem generica, para nao vazar detalhe interno ao cliente.
  console.error('[erro-nao-tratado]', erro);
  resposta.status(500).json({
    erro: {
      tipo: 'ErroInterno',
      mensagem: 'Erro interno no servidor.',
      ...(estaEmProducao() ? {} : { detalhes: erro instanceof Error ? erro.message : String(erro) }),
    },
  });
}

/**
 * Erros levantados pelos middlewares antes de o controller rodar — na pratica,
 * o `express.json()` recusando o corpo.
 *
 * Sem isto, um JSON com virgula sobrando vira "Erro interno no servidor" (500),
 * culpando o servidor por um problema do cliente e escondendo do front a unica
 * informacao util: que o corpo enviado esta malformado.
 */
function interpretarErroDeBorda(
  erro: unknown,
): { status: number; tipo: string; mensagem: string } | null {
  if (typeof erro !== 'object' || erro === null) return null;
  const candidato = erro as { type?: unknown; status?: unknown; statusCode?: unknown; code?: unknown };

  // Erros do multer nao carregam status HTTP, so um codigo proprio.
  if (typeof candidato.code === 'string' && candidato.code.startsWith('LIMIT_')) {
    return candidato.code === 'LIMIT_FILE_SIZE'
      ? { status: 413, tipo: 'ErroDeValidacao', mensagem: 'Arquivo maior que o limite permitido.' }
      : {
          status: 422,
          tipo: 'ErroDeValidacao',
          mensagem: 'Envio invalido: mande um unico arquivo no campo "arquivo".',
        };
  }

  const status = typeof candidato.status === 'number' ? candidato.status : candidato.statusCode;
  if (typeof status !== 'number' || status < 400 || status >= 500) return null;

  switch (candidato.type) {
    case 'entity.parse.failed':
      return {
        status: 400,
        tipo: 'ErroDeRequisicao',
        mensagem: 'O corpo da requisicao nao e um JSON valido.',
      };
    case 'entity.too.large':
      return {
        status: 413,
        tipo: 'ErroDeRequisicao',
        mensagem: 'O corpo da requisicao excede o tamanho permitido.',
      };
    default:
      return {
        status,
        tipo: 'ErroDeRequisicao',
        mensagem: erro instanceof Error ? erro.message : 'Requisicao invalida.',
      };
  }
}

/** Rota inexistente — precisa vir depois de todas as outras. */
export function rotaNaoEncontrada(requisicao: Request, resposta: Response): void {
  resposta.status(404).json({
    erro: {
      tipo: 'ErroNaoEncontrado',
      mensagem: `Rota nao encontrada: ${requisicao.method} ${requisicao.originalUrl}`,
    },
  });
}
