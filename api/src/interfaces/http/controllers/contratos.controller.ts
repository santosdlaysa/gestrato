import type { Response } from 'express';
import { z } from 'zod';
import { ErroNaoEncontrado } from '../../../domain/shared/errors.js';
import { PoliticaDeEncargos } from '../../../domain/contratos/politica-de-encargos.js';
import { Percentual } from '../../../domain/value-objects/percentual.js';
import type { Relogio } from '../../../application/ports/comuns.js';
import type { Repositorios } from '../../../application/ports/repositorios.js';
import type { AplicarReajuste } from '../../../application/use-cases/contratos/aplicar-reajuste.js';
import type { CriarContrato } from '../../../application/use-cases/contratos/criar-contrato.js';
import type { EncerrarContrato, MotivoDeEncerramento } from '../../../application/use-cases/contratos/encerrar-contrato.js';
import type { ObterExtratoDoContrato } from '../../../application/use-cases/contratos/obter-extrato-do-contrato.js';
import type { RenegociarContrato } from '../../../application/use-cases/contratos/renegociar-contrato.js';
import type { SimularContrato } from '../../../application/use-cases/contratos/simular-contrato.js';
import { usuarioDaRequisicao } from '../middlewares/autenticacao.js';
import type { RequisicaoAutenticada } from '../tipos.js';
import {
  apresentarContrato,
  apresentarExtrato,
  apresentarPagina,
  apresentarPosicao,
} from '../apresentadores/cobranca.apresentador.js';
import { esquemaDeIdentificador } from '../validacao/esquemas-comuns.js';
import {
  esquemaDeApuracaoDeAcordo,
  esquemaDeAtualizacaoDeContrato,
  esquemaDeCriacaoDeContrato,
  esquemaDeFiltroDeContratos,
  esquemaDeReajuste,
  esquemaDeRenegociacao,
  esquemaDeSimulacao,
} from '../validacao/esquemas-de-contrato.js';

export interface CasosDeUsoDeContratos {
  readonly simular: SimularContrato;
  readonly criar: CriarContrato;
  readonly obterExtrato: ObterExtratoDoContrato;
  readonly encerrar: EncerrarContrato;
  readonly aplicarReajuste: AplicarReajuste;
  readonly renegociar: RenegociarContrato;
}

/**
 * Controller fino: valida a entrada, chama o caso de uso, apresenta a saida.
 * Nenhuma regra de negocio mora aqui — se aparecer um `if` de negocio neste
 * arquivo, ele esta na camada errada.
 */
export class ControladorDeContratos {
  constructor(
    private readonly casosDeUso: CasosDeUsoDeContratos,
    private readonly repositorios: Repositorios,
    private readonly relogio: Relogio,
  ) {}

  simular = async (requisicao: RequisicaoAutenticada, resposta: Response): Promise<void> => {
    const condicoes = esquemaDeSimulacao.parse(requisicao.body);
    const { resumo, parcelas } = this.casosDeUso.simular.executar(this.paraCondicoes(condicoes));

    resposta.json({
      resumo: {
        valorTotalCentavos: resumo.valorTotal.centavos,
        valorEntradaCentavos: resumo.valorEntrada.centavos,
        valorFinanciadoCentavos: resumo.valorFinanciado.centavos,
        quantidadeDeParcelas: resumo.quantidadeDeParcelas,
        primeiraParcelaCentavos: resumo.primeiraParcela?.centavos ?? null,
        ultimaParcelaCentavos: resumo.ultimaParcela?.centavos ?? null,
        somaDoPlanoCentavos: resumo.somaDoPlano.centavos,
        primeiroVencimento: resumo.primeiroVencimento,
        ultimoVencimento: resumo.ultimoVencimento,
      },
      parcelas: parcelas.map((parcela) => ({
        numero: parcela.numero,
        tipo: parcela.tipo,
        descricao: parcela.descricao,
        valorCentavos: parcela.valor.centavos,
        vencimento: parcela.vencimento.paraIso(),
      })),
    });
  };

  criar = async (requisicao: RequisicaoAutenticada, resposta: Response): Promise<void> => {
    const dados = esquemaDeCriacaoDeContrato.parse(requisicao.body);
    const saida = await this.casosDeUso.criar.executar({
      ...this.paraCondicoes(dados),
      numero: dados.numero,
      clienteId: dados.clienteId,
      loteId: dados.loteId,
      corretorId: dados.corretorId,
      dataAssinatura: dados.dataAssinatura,
      observacoes: dados.observacoes,
    });
    resposta.status(201).json(saida);
  };

  listar = async (requisicao: RequisicaoAutenticada, resposta: Response): Promise<void> => {
    const filtro = esquemaDeFiltroDeContratos.parse(requisicao.query);
    const referencia = filtro.data ?? this.relogio.hoje();

    const politica = await this.repositorios.politicaDeInadimplencia.obter();
    const pagina = await this.repositorios.contratos.listar({
      ...filtro,
      dataDeReferencia: referencia,
      diasParaInadimplencia: politica.diasParaInadimplencia,
      diasParaRetomadaDoLote: politica.diasParaRetomadaDoLote,
    });

    // Uma consulta de parcelas para a pagina inteira; nunca uma por contrato.
    const parcelasPorContrato = await this.repositorios.parcelas.porContratos(
      pagina.itens.map((contrato) => contrato.id.paraString()),
    );

    resposta.json(
      apresentarPagina(pagina, (contrato) => ({
        ...apresentarContrato(contrato),
        posicao: apresentarPosicao(
          contrato.posicaoEm(parcelasPorContrato.get(contrato.id.paraString()) ?? [], referencia, politica),
        ),
      })),
    );
  };

  obter = async (requisicao: RequisicaoAutenticada, resposta: Response): Promise<void> => {
    const id = esquemaDeIdentificador.parse(requisicao.params.id);
    const data = esquemaDeFiltroDeContratos.shape.data.parse(requisicao.query.data);
    resposta.json(apresentarExtrato(await this.casosDeUso.obterExtrato.executar(id, data)));
  };

  extrato = this.obter;

  atualizar = async (requisicao: RequisicaoAutenticada, resposta: Response): Promise<void> => {
    const id = esquemaDeIdentificador.parse(requisicao.params.id);
    const dados = esquemaDeAtualizacaoDeContrato.parse(requisicao.body);

    const contrato = await this.repositorios.contratos.porId(id);
    if (!contrato) throw new ErroNaoEncontrado('Contrato', id);

    if (dados.observacoes !== undefined) contrato.alterarObservacoes(dados.observacoes);
    if (this.alterouPolitica(dados)) {
      const atual = contrato.politicaDeEncargos;
      contrato.alterarPoliticaDeEncargos(
        PoliticaDeEncargos.de({
          multaPorAtraso: Percentual.de(dados.multaPorAtrasoPercentual ?? atual.multaPorAtraso.valor),
          jurosAoMes: Percentual.de(dados.jurosAoMesPercentual ?? atual.jurosAoMes.valor),
          diasDeCarencia: dados.diasDeCarencia ?? atual.diasDeCarencia,
        }),
      );
    }

    await this.repositorios.contratos.salvar(contrato);
    resposta.json(apresentarContrato(contrato));
  };

  encerrar = (motivo: MotivoDeEncerramento) => async (
    requisicao: RequisicaoAutenticada,
    resposta: Response,
  ): Promise<void> => {
    const id = esquemaDeIdentificador.parse(requisicao.params.id);
    resposta.json(await this.casosDeUso.encerrar.executar(id, motivo));
  };

  reajustar = async (requisicao: RequisicaoAutenticada, resposta: Response): Promise<void> => {
    const id = esquemaDeIdentificador.parse(requisicao.params.id);
    const dados = esquemaDeReajuste.parse(requisicao.body);
    const usuario = usuarioDaRequisicao(requisicao);

    const saida = await this.casosDeUso.aplicarReajuste.executar({
      contratoId: id,
      indice: dados.indice,
      percentual: dados.percentual,
      aplicadoAPartirDe: dados.aplicadoAPartirDe,
      registradoPor: usuario.email,
    });

    resposta.json({
      contratoId: saida.contratoId,
      parcelasAfetadas: saida.parcelasAfetadas,
      acrescimoTotalCentavos: saida.acrescimoTotal.centavos,
    });
  };

  /** Previa do acordo: o operador confere o valor antes de fechar. */
  apurarAcordo = async (requisicao: RequisicaoAutenticada, resposta: Response): Promise<void> => {
    const id = esquemaDeIdentificador.parse(requisicao.params.id);
    const dados = esquemaDeApuracaoDeAcordo.parse(requisicao.body);

    const apuracao = await this.casosDeUso.renegociar.apurar(this.repositorios, {
      contratoId: id,
      parcelaIds: dados.parcelaIds,
      incluirEncargos: dados.incluirEncargos,
      desconto: dados.descontoCentavos,
      dataDeApuracao: dados.dataDeApuracao,
    });

    resposta.json({
      saldoOriginalCentavos: apuracao.saldoOriginal.centavos,
      encargosCentavos: apuracao.encargos.centavos,
      descontoCentavos: apuracao.desconto.centavos,
      valorNegociadoCentavos: apuracao.valorNegociado.centavos,
    });
  };

  renegociar = async (requisicao: RequisicaoAutenticada, resposta: Response): Promise<void> => {
    const id = esquemaDeIdentificador.parse(requisicao.params.id);
    const dados = esquemaDeRenegociacao.parse(requisicao.body);
    const usuario = usuarioDaRequisicao(requisicao);

    const saida = await this.casosDeUso.renegociar.executar({
      contratoId: id,
      parcelaIds: dados.parcelaIds,
      incluirEncargos: dados.incluirEncargos,
      desconto: dados.descontoCentavos,
      entradaDoAcordo: dados.entradaCentavos,
      dataDaEntrada: dados.dataEntrada,
      quantidadeDeParcelas: dados.quantidadeDeParcelas,
      primeiroVencimento: dados.primeiroVencimento,
      periodicidade: dados.periodicidade,
      acordadoEm: dados.acordadoEm,
      motivo: dados.motivo,
      registradoPor: usuario.email,
    });

    resposta.status(201).json({
      renegociacaoId: saida.renegociacaoId,
      parcelasSubstituidas: saida.parcelasSubstituidas,
      parcelasGeradas: saida.parcelasGeradas,
      apuracao: {
        saldoOriginalCentavos: saida.apuracao.saldoOriginal.centavos,
        encargosCentavos: saida.apuracao.encargos.centavos,
        descontoCentavos: saida.apuracao.desconto.centavos,
        valorNegociadoCentavos: saida.apuracao.valorNegociado.centavos,
      },
    });
  };

  listarRenegociacoes = async (requisicao: RequisicaoAutenticada, resposta: Response): Promise<void> => {
    const id = esquemaDeIdentificador.parse(requisicao.params.id);
    const acordos = await this.repositorios.renegociacoes.porContrato(id);

    resposta.json(
      acordos.map((acordo) => ({
        id: acordo.id.paraString(),
        status: acordo.status,
        acordadoEm: acordo.acordadoEm.paraIso(),
        motivo: acordo.motivo,
        registradoPor: acordo.registradoPor,
        saldoOriginalCentavos: acordo.apuracao.saldoOriginal.centavos,
        encargosCentavos: acordo.apuracao.encargos.centavos,
        descontoCentavos: acordo.apuracao.desconto.centavos,
        valorNegociadoCentavos: acordo.apuracao.valorNegociado.centavos,
        quantidadeDeParcelas: acordo.termos.quantidadeDeParcelas,
        parcelasSubstituidas: acordo.parcelasSubstituidasIds.length,
      })),
    );
  };

  private alterouPolitica(dados: z.infer<typeof esquemaDeAtualizacaoDeContrato>): boolean {
    return (
      dados.multaPorAtrasoPercentual !== undefined ||
      dados.jurosAoMesPercentual !== undefined ||
      dados.diasDeCarencia !== undefined
    );
  }

  /** O zod ja converteu centavos e datas em value objects; aqui so renomeamos. */
  private paraCondicoes(dados: z.infer<typeof esquemaDeSimulacao>) {
    return {
      valorTotal: dados.valorTotalCentavos,
      valorEntrada: dados.valorEntradaCentavos,
      dataEntrada: dados.dataEntrada,
      formaPagamentoEntrada: dados.formaPagamentoEntrada,
      quantidadeDeParcelas: dados.quantidadeDeParcelas,
      valorDaParcela: dados.valorDaParcelaCentavos,
      primeiroVencimento: dados.primeiroVencimento,
      periodicidade: dados.periodicidade,
      multaPorAtrasoPercentual: dados.multaPorAtrasoPercentual,
      jurosAoMesPercentual: dados.jurosAoMesPercentual,
      diasDeCarencia: dados.diasDeCarencia,
      indiceReajuste: dados.indiceReajuste,
    };
  }
}
