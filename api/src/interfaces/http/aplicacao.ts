import cors from 'cors';
import express, { type Express, type RequestHandler, type Router } from 'express';
import { ambiente } from '../../infrastructure/config/ambiente.js';
import type { Container } from '../../composicao/container.js';
import { ControladorDeAutenticacao } from './controllers/autenticacao.controller.js';
import { ControladorDeCobranca } from './controllers/cobranca.controller.js';
import { ControladorDeContratos } from './controllers/contratos.controller.js';
import { criarExigirAutenticacao } from './middlewares/autenticacao.js';
import { rotaNaoEncontrada, tratadorDeErros } from './middlewares/tratador-de-erros.js';
import { criarRotasDeAutenticacao } from './rotas/autenticacao.rotas.js';
import { criarRotasDeCadastros } from './rotas/cadastros.rotas.js';
import { criarRotasDeCobranca, criarRotasDeWebhook } from './rotas/cobranca.rotas.js';
import { criarRotasDeContratos } from './rotas/contratos.rotas.js';
import { criarRotasDePaineis } from './rotas/paineis.rotas.js';
import { criarRotasDeAnexos } from './rotas/anexos.rotas.js';
import { ControladorDeAnexos } from './controllers/anexos.controller.js';

/**
 * Prefixos que exigem token. Mantenha em sincronia com os routers protegidos —
 * um prefixo esquecido aqui deixa a rota aberta, entao vale conferir ao criar
 * um recurso novo.
 */
const PREFIXOS_PROTEGIDOS = [
  '/clientes',
  '/loteamentos',
  '/lotes',
  '/corretores',
  '/contratos',
  '/parcelas',
  '/cobrancas',
  '/regua',
  '/modelos-de-mensagem',
  '/politica-de-inadimplencia',
  '/dashboard',
  '/relatorios',
  '/anexos',
] as const;

/** Aplica o middleware apenas quando o caminho pertence a um dos prefixos. */
function filtrarPorPrefixo(prefixos: readonly string[], middleware: RequestHandler): RequestHandler {
  return (requisicao, resposta, proximo) => {
    const protegida = prefixos.some(
      (prefixo) => requisicao.path === prefixo || requisicao.path.startsWith(`${prefixo}/`),
    );
    if (!protegida) return proximo();
    return middleware(requisicao, resposta, proximo);
  };
}

/**
 * Monta a aplicacao HTTP a partir do container.
 *
 * A ordem importa: webhook antes da autenticacao (quem chama e o banco), rotas
 * protegidas depois, e o tratador de erros por ultimo — em Express, middleware
 * de erro registrado antes das rotas simplesmente nunca e alcancado.
 */
export function criarAplicacao(container: Container, rotasAdicionais: Router[] = []): Express {
  const aplicacao = express();

  aplicacao.use(cors({ origin: ambiente.origemPermitida.split(',').map((origem) => origem.trim()) }));
  aplicacao.use(express.json({ limit: '1mb' }));

  const controladorDeAutenticacao = new ControladorDeAutenticacao(container.autenticar);
  const controladorDeContratos = new ControladorDeContratos(
    container.casosDeUsoDeContratos,
    container.repositorios,
    container.relogio,
  );
  const controladorDeCobranca = new ControladorDeCobranca(
    container.casosDeUsoDeCobranca,
    container.repositorios,
    container.relogio,
  );

  aplicacao.get('/api/saude', (_requisicao, resposta) => {
    resposta.json({ estado: 'ok', gateway: container.gateway.nome, mensageria: container.mensageria.nome });
  });

  // Publico: o provedor de pagamento nao tem token do sistema.
  aplicacao.use('/api', criarRotasDeWebhook(controladorDeCobranca));

  const exigirAutenticacao = criarExigirAutenticacao(container.servicoDeToken);
  aplicacao.use('/api', criarRotasDeAutenticacao(controladorDeAutenticacao, exigirAutenticacao));

  const protegidas: Router[] = [
    criarRotasDeCadastros({
      repositorios: container.repositorios,
      geradorDeIdentificador: container.geradorDeIdentificador,
    }),
    criarRotasDeContratos(controladorDeContratos),
    criarRotasDeCobranca(controladorDeCobranca),
    criarRotasDeAnexos(new ControladorDeAnexos(container.casosDeUsoDeAnexos)),
    criarRotasDePaineis({
      consultasDePainel: container.consultasDePainel,
      consultasDeRelatorio: container.consultasDeRelatorio,
      relogio: container.relogio,
    }),
    ...rotasAdicionais,
  ];
  // A autenticacao so vale para prefixos que existem de verdade.
  //
  // Montar como `use('/api', exigirAutenticacao, rotas)` faria o middleware
  // rodar em QUALQUER caminho sob /api, inclusive nos que nenhum router atende:
  // um simples erro de digitacao na URL responderia "Informe o token" em vez de
  // 404, e o front passaria a acusar problema de sessao onde ha problema de
  // rota. Foi exatamente esse mascaramento que escondeu um bug de proxy.
  aplicacao.use('/api', filtrarPorPrefixo(PREFIXOS_PROTEGIDOS, exigirAutenticacao));
  for (const rotas of protegidas) {
    aplicacao.use('/api', rotas);
  }

  aplicacao.use(rotaNaoEncontrada);
  aplicacao.use(tratadorDeErros);

  return aplicacao;
}
