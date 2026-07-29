import { Router } from 'express';
import type { GeradorDeIdentificador } from '../../../application/ports/comuns.js';
import type { Repositorios } from '../../../application/ports/repositorios.js';
import { AtualizarCliente } from '../../../application/use-cases/cadastros/atualizar-cliente.js';
import { AtualizarLote } from '../../../application/use-cases/cadastros/atualizar-lote.js';
import { CadastrarCliente } from '../../../application/use-cases/cadastros/cadastrar-cliente.js';
import { CadastrarLote } from '../../../application/use-cases/cadastros/cadastrar-lote.js';
import { CadastrarLoteamento } from '../../../application/use-cases/cadastros/cadastrar-loteamento.js';
import { CadastrarQuadra } from '../../../application/use-cases/cadastros/cadastrar-quadra.js';
import { ContextoDeLotes } from '../../../application/use-cases/cadastros/contexto-de-lotes.js';
import { ListarClientes } from '../../../application/use-cases/cadastros/listar-clientes.js';
import { ListarLoteamentos } from '../../../application/use-cases/cadastros/listar-loteamentos.js';
import { ListarLotes } from '../../../application/use-cases/cadastros/listar-lotes.js';
import { ListarQuadrasDoLoteamento } from '../../../application/use-cases/cadastros/listar-quadras-do-loteamento.js';
import { ObterCliente } from '../../../application/use-cases/cadastros/obter-cliente.js';
import { ObterLote } from '../../../application/use-cases/cadastros/obter-lote.js';
import { ControladorDeCadastros } from '../controllers/cadastros.controller.js';
import { exigirPermissao } from '../middlewares/autenticacao.js';
import { assincrono } from '../utilitarios/manipulador-assincrono.js';

/**
 * Rotas dos cadastros de suporte (clientes, loteamentos, quadras e lotes).
 *
 * Sem prefixo `/api` e sem exigir autenticacao aqui: quem monta a aplicacao
 * decide o prefixo e ja aplica o middleware de autenticacao no router inteiro.
 * Escrita exige a permissao CADASTRAR; leitura fica liberada para qualquer
 * usuario autenticado, inclusive o perfil de consulta.
 */
export function criarRotasDeCadastros(dependencias: {
  repositorios: Repositorios;
  geradorDeIdentificador: GeradorDeIdentificador;
}): Router {
  const { repositorios, geradorDeIdentificador } = dependencias;
  const contextoDeLotes = new ContextoDeLotes(repositorios.quadras, repositorios.loteamentos);

  const controlador = new ControladorDeCadastros({
    cadastrarCliente: new CadastrarCliente(repositorios.clientes, geradorDeIdentificador),
    atualizarCliente: new AtualizarCliente(repositorios.clientes),
    listarClientes: new ListarClientes(repositorios.clientes),
    obterCliente: new ObterCliente(repositorios.clientes),
    cadastrarLoteamento: new CadastrarLoteamento(repositorios.loteamentos, geradorDeIdentificador),
    listarLoteamentos: new ListarLoteamentos(repositorios.loteamentos),
    cadastrarQuadra: new CadastrarQuadra(
      repositorios.quadras,
      repositorios.loteamentos,
      geradorDeIdentificador,
    ),
    listarQuadrasDoLoteamento: new ListarQuadrasDoLoteamento(
      repositorios.quadras,
      repositorios.loteamentos,
    ),
    cadastrarLote: new CadastrarLote(
      repositorios.lotes,
      repositorios.quadras,
      contextoDeLotes,
      geradorDeIdentificador,
    ),
    atualizarLote: new AtualizarLote(repositorios.lotes, contextoDeLotes),
    listarLotes: new ListarLotes(repositorios.lotes, contextoDeLotes),
    obterLote: new ObterLote(repositorios.lotes, contextoDeLotes),
  });

  const rotas = Router();

  rotas.get('/clientes', assincrono((requisicao, resposta) => controlador.listarClientes(requisicao, resposta)));
  rotas.post(
    '/clientes',
    exigirPermissao('CADASTRAR'),
    assincrono((requisicao, resposta) => controlador.cadastrarCliente(requisicao, resposta)),
  );
  rotas.get('/clientes/:id', assincrono((requisicao, resposta) => controlador.obterCliente(requisicao, resposta)));
  rotas.put(
    '/clientes/:id',
    exigirPermissao('CADASTRAR'),
    assincrono((requisicao, resposta) => controlador.atualizarCliente(requisicao, resposta)),
  );

  rotas.get(
    '/loteamentos',
    assincrono((requisicao, resposta) => controlador.listarLoteamentos(requisicao, resposta)),
  );
  rotas.post(
    '/loteamentos',
    exigirPermissao('CADASTRAR'),
    assincrono((requisicao, resposta) => controlador.cadastrarLoteamento(requisicao, resposta)),
  );
  rotas.get(
    '/loteamentos/:id/quadras',
    assincrono((requisicao, resposta) => controlador.listarQuadras(requisicao, resposta)),
  );
  rotas.post(
    '/loteamentos/:id/quadras',
    exigirPermissao('CADASTRAR'),
    assincrono((requisicao, resposta) => controlador.cadastrarQuadra(requisicao, resposta)),
  );

  rotas.get('/lotes', assincrono((requisicao, resposta) => controlador.listarLotes(requisicao, resposta)));
  rotas.post(
    '/lotes',
    exigirPermissao('CADASTRAR'),
    assincrono((requisicao, resposta) => controlador.cadastrarLote(requisicao, resposta)),
  );
  rotas.get('/lotes/:id', assincrono((requisicao, resposta) => controlador.obterLote(requisicao, resposta)));
  rotas.put(
    '/lotes/:id',
    exigirPermissao('CADASTRAR'),
    assincrono((requisicao, resposta) => controlador.atualizarLote(requisicao, resposta)),
  );

  return rotas;
}
