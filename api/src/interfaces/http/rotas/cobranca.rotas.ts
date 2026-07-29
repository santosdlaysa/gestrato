import { Router } from 'express';
import type { ControladorDeCobranca } from '../controllers/cobranca.controller.js';
import { exigirPermissao } from '../middlewares/autenticacao.js';
import { assincrono } from '../utilitarios/manipulador-assincrono.js';
import type { RequisicaoAutenticada } from '../tipos.js';

/** Rotas do nucleo de cobranca. Autenticacao aplicada por quem monta. */
export function criarRotasDeCobranca(controlador: ControladorDeCobranca): Router {
  const rotas = Router();

  rotas.get('/parcelas', assincrono<RequisicaoAutenticada>(controlador.listarParcelas));
  rotas.get('/parcelas/:id', assincrono<RequisicaoAutenticada>(controlador.obterParcela));
  rotas.get('/parcelas/:id/documentos', assincrono<RequisicaoAutenticada>(controlador.listarDocumentos));
  rotas.get('/cobrancas', assincrono<RequisicaoAutenticada>(controlador.listarCobrancas));
  rotas.get('/regua', assincrono<RequisicaoAutenticada>(controlador.obterRegua));
  rotas.get('/modelos-de-mensagem', assincrono<RequisicaoAutenticada>(controlador.listarModelos));
  rotas.get(
    '/politica-de-inadimplencia',
    assincrono<RequisicaoAutenticada>(controlador.obterPoliticaDeInadimplencia),
  );
  rotas.put(
    '/politica-de-inadimplencia',
    exigirPermissao('CONFIGURAR_REGUA'),
    assincrono<RequisicaoAutenticada>(controlador.salvarPoliticaDeInadimplencia),
  );

  rotas.post(
    '/parcelas/:id/baixa',
    exigirPermissao('RECEBER_PAGAMENTO'),
    assincrono<RequisicaoAutenticada>(controlador.registrarBaixa),
  );
  rotas.post(
    '/parcelas/:id/estorno',
    exigirPermissao('RECEBER_PAGAMENTO'),
    assincrono<RequisicaoAutenticada>(controlador.estornarBaixa),
  );

  rotas.post(
    '/parcelas/:id/documentos',
    exigirPermissao('EMITIR_DOCUMENTO'),
    assincrono<RequisicaoAutenticada>(controlador.emitirDocumento),
  );
  rotas.post(
    '/parcelas/:id/documentos/reemitir',
    exigirPermissao('EMITIR_DOCUMENTO'),
    assincrono<RequisicaoAutenticada>(controlador.reemitirDocumento),
  );

  rotas.post(
    '/parcelas/:id/cobrar',
    exigirPermissao('ENVIAR_COBRANCA'),
    assincrono<RequisicaoAutenticada>(controlador.cobrar),
  );

  rotas.put(
    '/regua',
    exigirPermissao('CONFIGURAR_REGUA'),
    assincrono<RequisicaoAutenticada>(controlador.salvarRegua),
  );
  rotas.put(
    '/modelos-de-mensagem/:chave',
    exigirPermissao('CONFIGURAR_REGUA'),
    assincrono<RequisicaoAutenticada>(controlador.salvarModelo),
  );
  rotas.post(
    '/regua/executar',
    exigirPermissao('ENVIAR_COBRANCA'),
    assincrono<RequisicaoAutenticada>(controlador.executarRegua),
  );

  return rotas;
}

/**
 * Webhook do provedor de pagamento — montado ANTES da autenticacao, porque quem
 * chama e o banco, nao um usuario do sistema.
 */
export function criarRotasDeWebhook(controlador: ControladorDeCobranca): Router {
  const rotas = Router();
  rotas.post('/webhooks/cobranca/:provedor', assincrono(controlador.receberWebhook));
  return rotas;
}
