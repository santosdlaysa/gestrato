import type { Request, Response } from 'express';
import { ErroNaoEncontrado } from '../../../domain/shared/errors.js';
import { PoliticaDeInadimplencia } from '../../../domain/contratos/politica-de-inadimplencia.js';
import type { Relogio } from '../../../application/ports/comuns.js';
import type { Repositorios } from '../../../application/ports/repositorios.js';
import type { ObterRegua, SalvarModeloDeMensagem, SalvarRegua } from '../../../application/use-cases/cobranca/configurar-regua.js';
import type { EmitirDocumento } from '../../../application/use-cases/cobranca/emitir-documento.js';
import type { EnviarCobrancaAvulsa } from '../../../application/use-cases/cobranca/enviar-cobranca-avulsa.js';
import type { ExecutarRegua } from '../../../application/use-cases/cobranca/executar-regua.js';
import type { ListarParcelasParaCobranca } from '../../../application/use-cases/cobranca/listar-parcelas-para-cobranca.js';
import type { ProcessarWebhookDeCobranca } from '../../../application/use-cases/cobranca/processar-webhook.js';
import type { EstornarBaixa } from '../../../application/use-cases/parcelas/estornar-baixa.js';
import type { RegistrarBaixa } from '../../../application/use-cases/parcelas/registrar-baixa.js';
import { usuarioDaRequisicao } from '../middlewares/autenticacao.js';
import type { RequisicaoAutenticada } from '../tipos.js';
import {
  apresentarCobranca,
  apresentarDocumento,
  apresentarEventoDaRegua,
  apresentarLinhaDeCobranca,
  apresentarPagina,
  apresentarParcela,
} from '../apresentadores/cobranca.apresentador.js';
import { esquemaDeIdentificador } from '../validacao/esquemas-comuns.js';
import {
  esquemaDaRegua,
  esquemaDeBaixa,
  esquemaDeCobrancaAvulsa,
  esquemaDeEmissao,
  esquemaDeExecucaoDaRegua,
  esquemaDeFiltroDeCobrancas,
  esquemaDeFiltroDeParcelas,
  esquemaDeModeloDeMensagem,
  esquemaDaPoliticaDeInadimplencia,
} from '../validacao/esquemas-de-cobranca.js';

export interface CasosDeUsoDeCobranca {
  readonly listarParcelas: ListarParcelasParaCobranca;
  readonly registrarBaixa: RegistrarBaixa;
  readonly estornarBaixa: EstornarBaixa;
  readonly emitirDocumento: EmitirDocumento;
  readonly enviarCobrancaAvulsa: EnviarCobrancaAvulsa;
  readonly executarRegua: ExecutarRegua;
  readonly obterRegua: ObterRegua;
  readonly salvarRegua: SalvarRegua;
  readonly salvarModelo: SalvarModeloDeMensagem;
  readonly processarWebhook: ProcessarWebhookDeCobranca;
}

export class ControladorDeCobranca {
  constructor(
    private readonly casosDeUso: CasosDeUsoDeCobranca,
    private readonly repositorios: Repositorios,
    private readonly relogio: Relogio,
  ) {}

  // ------------------------------------------------------------- parcelas

  listarParcelas = async (requisicao: RequisicaoAutenticada, resposta: Response): Promise<void> => {
    const filtro = esquemaDeFiltroDeParcelas.parse(requisicao.query);
    const pagina = await this.casosDeUso.listarParcelas.executar({
      ...filtro,
      dataDeReferencia: filtro.data,
    });
    resposta.json(apresentarPagina(pagina, apresentarLinhaDeCobranca));
  };

  obterParcela = async (requisicao: RequisicaoAutenticada, resposta: Response): Promise<void> => {
    const id = esquemaDeIdentificador.parse(requisicao.params.id);
    const referencia = this.relogio.hoje();

    const parcela = await this.repositorios.parcelas.porId(id);
    if (!parcela) throw new ErroNaoEncontrado('Parcela', id);

    const contrato = await this.repositorios.contratos.porId(parcela.contratoId.paraString());
    if (!contrato) throw new ErroNaoEncontrado('Contrato', parcela.contratoId.paraString());

    resposta.json(
      apresentarParcela(parcela, {
        situacao: parcela.situacaoEm(referencia),
        demonstrativo: parcela.demonstrativoEm(contrato.politicaDeEncargos, referencia),
        documentoVigente: await this.repositorios.documentos.vigenteDaParcela(id),
      }),
    );
  };

  registrarBaixa = async (requisicao: RequisicaoAutenticada, resposta: Response): Promise<void> => {
    const id = esquemaDeIdentificador.parse(requisicao.params.id);
    const dados = esquemaDeBaixa.parse(requisicao.body);
    const usuario = usuarioDaRequisicao(requisicao);

    const saida = await this.casosDeUso.registrarBaixa.executar({
      parcelaId: id,
      valorPrincipal: dados.valorPrincipalCentavos,
      valorJuros: dados.valorJurosCentavos,
      valorMulta: dados.valorMultaCentavos,
      valorDesconto: dados.valorDescontoCentavos,
      pagoEm: dados.pagoEm,
      formaPagamento: dados.formaPagamento,
      observacoes: dados.observacoes,
      registradoPor: usuario.email,
    });

    resposta.json({
      parcelaId: saida.parcelaId,
      statusDaParcela: saida.statusDaParcela,
      saldoRestanteCentavos: saida.saldoRestante.centavos,
      totalRecebidoCentavos: saida.totalRecebido.centavos,
      contratoQuitado: saida.contratoQuitado,
    });
  };

  estornarBaixa = async (requisicao: RequisicaoAutenticada, resposta: Response): Promise<void> => {
    const id = esquemaDeIdentificador.parse(requisicao.params.id);
    resposta.json(await this.casosDeUso.estornarBaixa.executar(id));
  };

  // ------------------------------------------------------------ documentos

  emitirDocumento = async (requisicao: RequisicaoAutenticada, resposta: Response): Promise<void> => {
    const id = esquemaDeIdentificador.parse(requisicao.params.id);
    const dados = esquemaDeEmissao.parse(requisicao.body ?? {});

    const documento = await this.casosDeUso.emitirDocumento.executar({
      parcelaId: id,
      tipo: dados.tipo,
      reemitir: false,
      dataDeReferencia: dados.data,
    });
    resposta.status(201).json(apresentarDocumento(documento));
  };

  reemitirDocumento = async (requisicao: RequisicaoAutenticada, resposta: Response): Promise<void> => {
    const id = esquemaDeIdentificador.parse(requisicao.params.id);
    const dados = esquemaDeEmissao.parse(requisicao.body ?? {});

    const documento = await this.casosDeUso.emitirDocumento.executar({
      parcelaId: id,
      tipo: dados.tipo,
      reemitir: true,
      dataDeReferencia: dados.data,
    });
    resposta.status(201).json(apresentarDocumento(documento));
  };

  listarDocumentos = async (requisicao: RequisicaoAutenticada, resposta: Response): Promise<void> => {
    const id = esquemaDeIdentificador.parse(requisicao.params.id);
    const documentos = await this.repositorios.documentos.porParcela(id);
    resposta.json(documentos.map(apresentarDocumento));
  };

  // -------------------------------------------------------------- cobranca

  cobrar = async (requisicao: RequisicaoAutenticada, resposta: Response): Promise<void> => {
    const id = esquemaDeIdentificador.parse(requisicao.params.id);
    const dados = esquemaDeCobrancaAvulsa.parse(requisicao.body ?? {});

    const resultado = await this.casosDeUso.enviarCobrancaAvulsa.executar({
      parcelaId: id,
      canais: dados.canais,
      modelo: dados.modelo,
      dataDeReferencia: dados.data,
    });

    if (resultado.situacao === 'SEM_CANAL') {
      resposta.status(422).json({
        erro: { tipo: 'ErroDeRegraDeNegocio', mensagem: resultado.motivo },
      });
      return;
    }

    resposta.status(resultado.situacao === 'ENVIADA' ? 201 : 502).json({
      situacao: resultado.situacao,
      cobranca: apresentarCobranca(resultado.cobranca),
      ...(resultado.situacao === 'FALHA' ? { motivo: resultado.motivo } : {}),
    });
  };

  listarCobrancas = async (requisicao: RequisicaoAutenticada, resposta: Response): Promise<void> => {
    const filtro = esquemaDeFiltroDeCobrancas.parse(requisicao.query);
    const pagina = await this.repositorios.cobrancas.listar(filtro);
    resposta.json(apresentarPagina(pagina, apresentarCobranca));
  };

  // ----------------------------------------------------------------- regua

  obterRegua = async (_requisicao: RequisicaoAutenticada, resposta: Response): Promise<void> => {
    const { eventos, modelos, variaveisDisponiveis } = await this.casosDeUso.obterRegua.executar();
    resposta.json({
      eventos: eventos.map(apresentarEventoDaRegua),
      modelos,
      variaveisDisponiveis,
    });
  };

  salvarRegua = async (requisicao: RequisicaoAutenticada, resposta: Response): Promise<void> => {
    const { eventos } = esquemaDaRegua.parse(requisicao.body);
    const salva = await this.casosDeUso.salvarRegua.executar(eventos);
    resposta.json({ eventos: salva.eventos.map(apresentarEventoDaRegua) });
  };

  executarRegua = async (requisicao: RequisicaoAutenticada, resposta: Response): Promise<void> => {
    const dados = esquemaDeExecucaoDaRegua.parse(requisicao.body ?? {});
    resposta.json(await this.casosDeUso.executarRegua.executar(dados));
  };

  // ------------------------------------------- escala de inadimplencia

  obterPoliticaDeInadimplencia = async (
    _requisicao: RequisicaoAutenticada,
    resposta: Response,
  ): Promise<void> => {
    const politica = await this.repositorios.politicaDeInadimplencia.obter();
    resposta.json(politica.paraEstado());
  };

  salvarPoliticaDeInadimplencia = async (
    requisicao: RequisicaoAutenticada,
    resposta: Response,
  ): Promise<void> => {
    const dados = esquemaDaPoliticaDeInadimplencia.parse(requisicao.body);
    // A validacao de ordem (retomada depois da inadimplencia) mora no dominio,
    // nao no zod — e regra de negocio, nao formato de entrada.
    const politica = PoliticaDeInadimplencia.de(dados);
    await this.repositorios.politicaDeInadimplencia.salvar(politica);
    resposta.json(politica.paraEstado());
  };

  listarModelos = async (_requisicao: RequisicaoAutenticada, resposta: Response): Promise<void> => {
    resposta.json(await this.repositorios.modelos.listar());
  };

  salvarModelo = async (requisicao: RequisicaoAutenticada, resposta: Response): Promise<void> => {
    const chave = String(requisicao.params.chave ?? '').trim();
    const dados = esquemaDeModeloDeMensagem.parse(requisicao.body);
    resposta.json(await this.casosDeUso.salvarModelo.executar({ chave, ...dados }));
  };

  // --------------------------------------------------------------- webhook

  /**
   * Sem autenticacao por JWT — quem chama e o provedor de pagamento. Responde
   * 200 mesmo em falha interna, senao o provedor entra em retry infinito; o
   * problema fica registrado em `eventos_de_webhook` para reprocessamento.
   */
  receberWebhook = async (requisicao: Request, resposta: Response): Promise<void> => {
    const cabecalhos = Object.fromEntries(
      Object.entries(requisicao.headers).map(([chave, valor]) => [chave, String(valor ?? '')]),
    );
    resposta.status(200).json(await this.casosDeUso.processarWebhook.executar(requisicao.body, cabecalhos));
  };
}
