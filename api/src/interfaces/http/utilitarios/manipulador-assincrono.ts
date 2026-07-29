import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Express 4 nao captura rejeicao de promise: um `await` que falha dentro do
 * handler derruba o processo em vez de virar resposta 500. Este invólucro
 * encaminha o erro para o tratador central.
 */
export function assincrono<R extends Request = Request>(
  manipulador: (requisicao: R, resposta: Response, proximo: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (requisicao, resposta, proximo) => {
    manipulador(requisicao as R, resposta, proximo).catch(proximo);
  };
}
