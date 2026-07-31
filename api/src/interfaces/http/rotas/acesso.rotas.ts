import { Router } from 'express';
import type { ControladorDeAcesso } from '../controllers/acesso.controller.js';
import { exigirPermissao } from '../middlewares/autenticacao.js';
import { assincrono } from '../utilitarios/manipulador-assincrono.js';
import type { RequisicaoAutenticada } from '../tipos.js';

export function criarRotasDeAcesso(controlador: ControladorDeAcesso): Router {
  const rotas = Router();
  rotas.get('/usuarios', assincrono<RequisicaoAutenticada>(controlador.listarUsuarios));
  rotas.post('/usuarios', exigirPermissao('GERIR_USUARIOS'), assincrono<RequisicaoAutenticada>(controlador.criarUsuario));
  rotas.put('/usuarios/:id', exigirPermissao('GERIR_USUARIOS'), assincrono<RequisicaoAutenticada>(controlador.atualizarUsuario));
  rotas.get('/perfis', assincrono<RequisicaoAutenticada>(controlador.listarPerfis));
  rotas.get('/permissoes', assincrono<RequisicaoAutenticada>(controlador.listarPermissoes));
  return rotas;
}
