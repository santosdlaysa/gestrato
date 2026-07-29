import { Router, type RequestHandler } from 'express';
import type { ControladorDeAutenticacao } from '../controllers/autenticacao.controller.js';
import { assincrono } from '../utilitarios/manipulador-assincrono.js';
import type { RequisicaoAutenticada } from '../tipos.js';

/**
 * `/auth/login` e publica por natureza; `/auth/eu` recebe o middleware de
 * autenticacao aqui dentro, porque este router e montado fora da area protegida.
 */
export function criarRotasDeAutenticacao(
  controlador: ControladorDeAutenticacao,
  exigirAutenticacao: RequestHandler,
): Router {
  const rotas = Router();
  rotas.post('/auth/login', assincrono<RequisicaoAutenticada>(controlador.entrar));
  rotas.get('/auth/eu', exigirAutenticacao, assincrono<RequisicaoAutenticada>(controlador.eu));
  return rotas;
}
