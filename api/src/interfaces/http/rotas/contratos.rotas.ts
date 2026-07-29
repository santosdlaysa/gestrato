import { Router } from 'express';
import type { ControladorDeContratos } from '../controllers/contratos.controller.js';
import { exigirPermissao } from '../middlewares/autenticacao.js';
import { assincrono } from '../utilitarios/manipulador-assincrono.js';
import type { RequisicaoAutenticada } from '../tipos.js';

/**
 * Rotas de contrato. A autenticacao e aplicada por quem monta o router; aqui
 * so declaramos a permissao especifica de cada operacao.
 */
export function criarRotasDeContratos(controlador: ControladorDeContratos): Router {
  const rotas = Router();

  // Simular nao grava nada: qualquer usuario autenticado pode usar para cotar.
  rotas.post('/contratos/simular', assincrono<RequisicaoAutenticada>(controlador.simular));

  rotas.get('/contratos', assincrono<RequisicaoAutenticada>(controlador.listar));
  rotas.get('/contratos/:id', assincrono<RequisicaoAutenticada>(controlador.obter));
  rotas.get('/contratos/:id/extrato', assincrono<RequisicaoAutenticada>(controlador.extrato));
  rotas.get('/contratos/:id/renegociacoes', assincrono<RequisicaoAutenticada>(controlador.listarRenegociacoes));

  rotas.post(
    '/contratos',
    exigirPermissao('GERIR_CONTRATOS'),
    assincrono<RequisicaoAutenticada>(controlador.criar),
  );
  rotas.patch(
    '/contratos/:id',
    exigirPermissao('GERIR_CONTRATOS'),
    assincrono<RequisicaoAutenticada>(controlador.atualizar),
  );

  rotas.post(
    '/contratos/:id/quitar',
    exigirPermissao('RECEBER_PAGAMENTO'),
    assincrono<RequisicaoAutenticada>(controlador.encerrar('QUITACAO')),
  );
  rotas.post(
    '/contratos/:id/cancelar',
    exigirPermissao('GERIR_CONTRATOS'),
    assincrono<RequisicaoAutenticada>(controlador.encerrar('CANCELAMENTO')),
  );
  rotas.post(
    '/contratos/:id/distratar',
    exigirPermissao('GERIR_CONTRATOS'),
    assincrono<RequisicaoAutenticada>(controlador.encerrar('DISTRATO')),
  );

  rotas.post(
    '/contratos/:id/reajuste',
    exigirPermissao('GERIR_CONTRATOS'),
    assincrono<RequisicaoAutenticada>(controlador.reajustar),
  );

  // Apurar e previa; renegociar grava o acordo — permissoes distintas.
  rotas.post(
    '/contratos/:id/renegociacoes/apurar',
    exigirPermissao('RENEGOCIAR'),
    assincrono<RequisicaoAutenticada>(controlador.apurarAcordo),
  );
  rotas.post(
    '/contratos/:id/renegociar',
    exigirPermissao('RENEGOCIAR'),
    assincrono<RequisicaoAutenticada>(controlador.renegociar),
  );

  return rotas;
}
