import { Router } from 'express';
import type { ControladorDeAcesso } from '../controllers/acesso.controller.js';
import { exigirPermissao } from '../middlewares/autenticacao.js';
import { assincrono } from '../utilitarios/manipulador-assincrono.js';
import type { RequisicaoAutenticada } from '../tipos.js';

/**
 * Acesso e area sensivel: tudo aqui — inclusive a LEITURA da lista de usuarios,
 * perfis e permissoes — exige GERIR_USUARIOS. Antes o GET ficava aberto a
 * qualquer autenticado, o que expunha a relacao de usuarios do sistema.
 */
export function criarRotasDeAcesso(controlador: ControladorDeAcesso): Router {
  const rotas = Router();
  const gerir = exigirPermissao('GERIR_USUARIOS');

  rotas.get('/usuarios', gerir, assincrono<RequisicaoAutenticada>(controlador.listarUsuarios));
  rotas.post('/usuarios', gerir, assincrono<RequisicaoAutenticada>(controlador.criarUsuario));
  rotas.put('/usuarios/:id', gerir, assincrono<RequisicaoAutenticada>(controlador.atualizarUsuario));
  rotas.put('/usuarios/:id/senha', gerir, assincrono<RequisicaoAutenticada>(controlador.redefinirSenha));
  rotas.delete('/usuarios/:id', gerir, assincrono<RequisicaoAutenticada>(controlador.excluirUsuario));

  rotas.get('/perfis', gerir, assincrono<RequisicaoAutenticada>(controlador.listarPerfis));
  rotas.post('/perfis', gerir, assincrono<RequisicaoAutenticada>(controlador.criarPerfil));
  rotas.put('/perfis/:id', gerir, assincrono<RequisicaoAutenticada>(controlador.atualizarPerfil));
  rotas.delete('/perfis/:id', gerir, assincrono<RequisicaoAutenticada>(controlador.excluirPerfil));

  rotas.get('/permissoes', gerir, assincrono<RequisicaoAutenticada>(controlador.listarPermissoes));
  return rotas;
}
