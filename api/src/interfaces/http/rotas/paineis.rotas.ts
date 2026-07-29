import { Router } from 'express';
import type { Relogio } from '../../../application/ports/comuns.js';
import type {
  ConsultasDePainel,
  ConsultasDeRelatorio,
} from '../../../application/ports/consultas-de-painel.js';
import { ControladorDePaineis } from '../controllers/paineis.controller.js';
import { assincrono } from '../utilitarios/manipulador-assincrono.js';

export interface DependenciasDasRotasDePaineis {
  consultasDePainel: ConsultasDePainel;
  consultasDeRelatorio: ConsultasDeRelatorio;
  relogio: Relogio;
}

/**
 * Rotas de leitura: painel e relatorios.
 *
 * Montadas sob `/api` por quem cria a aplicacao, que tambem ja aplicou a
 * autenticacao — por isso nada de middleware de token aqui. Nenhuma rota exige
 * permissao especifica: consultar e o que qualquer papel, inclusive CONSULTA,
 * pode fazer.
 */
export function criarRotasDePaineis(dependencias: DependenciasDasRotasDePaineis): Router {
  const rotas = Router();
  const controlador = new ControladorDePaineis(dependencias);

  rotas.get('/dashboard', assincrono((requisicao, resposta) => controlador.painel(requisicao, resposta)));

  rotas.get(
    '/relatorios/inadimplencia',
    assincrono((requisicao, resposta) => controlador.inadimplencia(requisicao, resposta)),
  );
  rotas.get(
    '/relatorios/lotes-a-retomar',
    assincrono((requisicao, resposta) => controlador.lotesARetomar(requisicao, resposta)),
  );
  rotas.get(
    '/relatorios/recebimentos',
    assincrono((requisicao, resposta) => controlador.recebimentos(requisicao, resposta)),
  );
  rotas.get(
    '/relatorios/fluxo-previsto',
    assincrono((requisicao, resposta) => controlador.fluxoPrevisto(requisicao, resposta)),
  );
  rotas.get(
    '/relatorios/clientes-em-atraso',
    assincrono((requisicao, resposta) => controlador.clientesEmAtraso(requisicao, resposta)),
  );
  rotas.get(
    '/relatorios/contratos',
    assincrono((requisicao, resposta) => controlador.contratos(requisicao, resposta)),
  );
  rotas.get(
    '/relatorios/comissoes',
    assincrono((requisicao, resposta) => controlador.comissoes(requisicao, resposta)),
  );
  rotas.get(
    '/relatorios/cobrancas',
    assincrono((requisicao, resposta) => controlador.cobrancas(requisicao, resposta)),
  );

  return rotas;
}
