import type { Request, Response } from 'express';
import { z } from 'zod';
import type {
  ConsultasDePainel,
  ConsultasDeRelatorio,
  LinhaDeClienteEmAtraso,
  LinhaDeCobranca,
  LinhaDeComissao,
  LinhaDeContratoDoRelatorio,
  LinhaDeFluxoPrevisto,
  LinhaDeInadimplenciaPorLoteamento,
  LinhaDeLoteARetomar,
  LinhaDeRecebimentoPorCompetencia,
  TotalPorFaixaDeAging,
  TotalPorSituacaoDeAtraso,
} from '../../../application/ports/consultas-de-painel.js';
import {
  FAIXAS_DE_AGING,
  SITUACOES_EM_ATRASO,
} from '../../../application/ports/consultas-de-painel.js';
import type { Relogio } from '../../../application/ports/comuns.js';
import { ErroDeValidacao } from '../../../domain/shared/errors.js';
import type { DataCivil } from '../../../domain/value-objects/data-civil.js';
import {
  esquemaDeCanal,
  esquemaDeDataCivil,
  esquemaDeIdentificador,
  esquemaDeStatusCobranca,
  esquemaDeStatusContrato,
} from '../validacao/esquemas-comuns.js';
import {
  formatarDataHoraParaCsv,
  formatarDataParaCsv,
  formatarMoedaParaCsv,
  formatarNumeroParaCsv,
  gerarCsv,
  responderComCsv,
  type ColunaCsv,
} from '../utilitarios/csv.js';

/**
 * Painel e relatorios — o lado de leitura da API.
 *
 * O controller nao calcula nada: valida a querystring, delega para a consulta e
 * escolhe entre JSON e CSV. Toda a agregacao (multa, juros, aging) vive nas
 * consultas, em SQL.
 */

// ------------------------------------------------------------- validacao

/** Querystring vazia (`?data=`) e ausencia significam a mesma coisa. */
function opcional<T extends z.ZodTypeAny>(esquema: T) {
  return z.preprocess(
    (valor) => (valor === '' || valor === undefined ? undefined : valor),
    esquema.optional(),
  );
}

const esquemaDeFormato = z.enum(['json', 'csv']).default('json');

const esquemaDoPainel = z.object({
  data: opcional(esquemaDeDataCivil),
});

const esquemaDeInadimplencia = z.object({
  data: opcional(esquemaDeDataCivil),
  loteamentoId: opcional(esquemaDeIdentificador),
  formato: esquemaDeFormato,
});

const esquemaDePeriodo = z.object({
  de: opcional(esquemaDeDataCivil),
  ate: opcional(esquemaDeDataCivil),
  formato: esquemaDeFormato,
});

const esquemaDeFluxoPrevisto = z.object({
  data: opcional(esquemaDeDataCivil),
  meses: z.coerce.number().int().min(1, 'Informe ao menos 1 mes.').max(60).default(12),
  formato: esquemaDeFormato,
});

const esquemaDeClientesEmAtraso = z.object({
  data: opcional(esquemaDeDataCivil),
  diasMinimos: z.coerce.number().int().min(1, 'Dias minimos deve ser ao menos 1.').max(3650).default(1),
  formato: esquemaDeFormato,
});

const esquemaDeLotesARetomar = z.object({
  data: opcional(esquemaDeDataCivil),
  loteamentoId: opcional(esquemaDeIdentificador),
  formato: esquemaDeFormato,
});

const esquemaDeCobrancas = z.object({
  de: opcional(esquemaDeDataCivil),
  ate: opcional(esquemaDeDataCivil),
  canal: opcional(esquemaDeCanal),
  status: opcional(esquemaDeStatusCobranca),
  formato: esquemaDeFormato,
});

const esquemaDeContratos = z.object({
  data: opcional(esquemaDeDataCivil),
  status: opcional(esquemaDeStatusContrato),
  formato: esquemaDeFormato,
});

export interface DependenciasDoControladorDePaineis {
  readonly consultasDePainel: ConsultasDePainel;
  readonly consultasDeRelatorio: ConsultasDeRelatorio;
  readonly relogio: Relogio;
}

export class ControladorDePaineis {
  constructor(private readonly dependencias: DependenciasDoControladorDePaineis) {}

  async painel(requisicao: Request, resposta: Response): Promise<void> {
    const entrada = esquemaDoPainel.parse(requisicao.query);
    const resumo = await this.dependencias.consultasDePainel.resumo(this.referencia(entrada.data));
    resposta.json(resumo);
  }

  async inadimplencia(requisicao: Request, resposta: Response): Promise<void> {
    const entrada = esquemaDeInadimplencia.parse(requisicao.query);
    const data = this.referencia(entrada.data);
    const relatorio = await this.dependencias.consultasDeRelatorio.inadimplencia({
      data,
      loteamentoId: entrada.loteamentoId,
    });

    if (entrada.formato === 'csv') {
      responderComCsv(
        resposta,
        `inadimplencia-${data.paraIso()}.csv`,
        gerarCsv(colunasDeInadimplencia(), relatorio.itens),
      );
      return;
    }
    resposta.json(relatorio);
  }

  async lotesARetomar(requisicao: Request, resposta: Response): Promise<void> {
    const entrada = esquemaDeLotesARetomar.parse(requisicao.query);
    const data = this.referencia(entrada.data);
    const relatorio = await this.dependencias.consultasDeRelatorio.lotesARetomar({
      data,
      loteamentoId: entrada.loteamentoId,
    });

    if (entrada.formato === 'csv') {
      responderComCsv(
        resposta,
        `lotes-a-retomar-${data.paraIso()}.csv`,
        gerarCsv(colunasDeLotesARetomar(), relatorio.itens),
      );
      return;
    }
    resposta.json(relatorio);
  }

  async recebimentos(requisicao: Request, resposta: Response): Promise<void> {
    const entrada = esquemaDePeriodo.parse(requisicao.query);
    const periodo = this.periodo(entrada.de, entrada.ate);
    const relatorio = await this.dependencias.consultasDeRelatorio.recebimentos(periodo);

    if (entrada.formato === 'csv') {
      responderComCsv(
        resposta,
        `recebimentos-${relatorio.de}-a-${relatorio.ate}.csv`,
        gerarCsv(colunasDeRecebimentos(), relatorio.itens),
      );
      return;
    }
    resposta.json(relatorio);
  }

  async fluxoPrevisto(requisicao: Request, resposta: Response): Promise<void> {
    const entrada = esquemaDeFluxoPrevisto.parse(requisicao.query);
    const data = this.referencia(entrada.data);
    const relatorio = await this.dependencias.consultasDeRelatorio.fluxoPrevisto({
      data,
      meses: entrada.meses,
    });

    if (entrada.formato === 'csv') {
      responderComCsv(
        resposta,
        `fluxo-previsto-${data.paraIso()}.csv`,
        gerarCsv(colunasDeFluxoPrevisto(), relatorio.itens),
      );
      return;
    }
    resposta.json(relatorio);
  }

  async clientesEmAtraso(requisicao: Request, resposta: Response): Promise<void> {
    const entrada = esquemaDeClientesEmAtraso.parse(requisicao.query);
    const data = this.referencia(entrada.data);
    const relatorio = await this.dependencias.consultasDeRelatorio.clientesEmAtraso({
      data,
      diasMinimos: entrada.diasMinimos,
    });

    if (entrada.formato === 'csv') {
      responderComCsv(
        resposta,
        `clientes-em-atraso-${data.paraIso()}.csv`,
        gerarCsv(colunasDeClientesEmAtraso(), relatorio.itens),
      );
      return;
    }
    resposta.json(relatorio);
  }

  async contratos(requisicao: Request, resposta: Response): Promise<void> {
    const entrada = esquemaDeContratos.parse(requisicao.query);
    const data = this.referencia(entrada.data);
    const relatorio = await this.dependencias.consultasDeRelatorio.contratos({
      data,
      status: entrada.status,
    });

    if (entrada.formato === 'csv') {
      responderComCsv(
        resposta,
        `contratos-${data.paraIso()}.csv`,
        gerarCsv(colunasDeContratos(), relatorio.itens),
      );
      return;
    }
    resposta.json(relatorio);
  }

  async comissoes(requisicao: Request, resposta: Response): Promise<void> {
    const entrada = esquemaDePeriodo.parse(requisicao.query);
    const periodo = this.periodo(entrada.de, entrada.ate);
    const relatorio = await this.dependencias.consultasDeRelatorio.comissoes(periodo);

    if (entrada.formato === 'csv') {
      responderComCsv(
        resposta,
        `comissoes-${relatorio.de}-a-${relatorio.ate}.csv`,
        gerarCsv(colunasDeComissoes(), relatorio.itens),
      );
      return;
    }
    resposta.json(relatorio);
  }

  async cobrancas(requisicao: Request, resposta: Response): Promise<void> {
    const entrada = esquemaDeCobrancas.parse(requisicao.query);
    const periodo = this.periodo(entrada.de, entrada.ate);
    const relatorio = await this.dependencias.consultasDeRelatorio.cobrancas({
      ...periodo,
      canal: entrada.canal,
      status: entrada.status,
    });

    if (entrada.formato === 'csv') {
      responderComCsv(
        resposta,
        `cobrancas-${relatorio.de}-a-${relatorio.ate}.csv`,
        gerarCsv(colunasDeCobrancas(), relatorio.itens),
      );
      return;
    }
    resposta.json(relatorio);
  }

  /** Sem `?data=`, a referencia e hoje — pelo relogio injetado, nunca por `new Date()`. */
  private referencia(data: DataCivil | undefined): DataCivil {
    return data ?? this.dependencias.relogio.hoje();
  }

  /** Sem periodo informado, o padrao e o mes corrente. */
  private periodo(de: DataCivil | undefined, ate: DataCivil | undefined): { de: DataCivil; ate: DataCivil } {
    const hoje = this.dependencias.relogio.hoje();
    const inicio = de ?? hoje.primeiroDiaDoMes();
    const fim = ate ?? hoje.ultimoDiaDoMes();
    if (inicio.posteriorA(fim)) {
      throw new ErroDeValidacao('A data inicial nao pode ser posterior a data final.');
    }
    return { de: inicio, ate: fim };
  }
}

// ----------------------------------------------------------------- colunas

function valorDaFaixa(aging: readonly TotalPorFaixaDeAging[], faixa: string): TotalPorFaixaDeAging | undefined {
  return aging.find((item) => item.faixa === faixa);
}

/** Duas colunas por faixa de atraso — quantidade e valor — na ordem do painel. */
function colunasDeAging<T extends { readonly aging: readonly TotalPorFaixaDeAging[] }>(): ColunaCsv<T>[] {
  return FAIXAS_DE_AGING.flatMap((faixa) => [
    {
      titulo: `Qtd ${faixa} dias`,
      valor: (item: T) => valorDaFaixa(item.aging, faixa)?.quantidade ?? 0,
    },
    {
      titulo: `Valor ${faixa} dias`,
      valor: (item: T) => formatarMoedaParaCsv(valorDaFaixa(item.aging, faixa)?.valorCentavos ?? 0),
    },
  ]);
}

/** Contratos e valor por degrau da escala — duas colunas para cada situacao. */
function colunasDeSituacao<T extends { readonly porSituacao: readonly TotalPorSituacaoDeAtraso[] }>(): ColunaCsv<T>[] {
  return SITUACOES_EM_ATRASO.flatMap((situacao) => [
    {
      titulo: `Contratos ${rotuloDaSituacao(situacao)}`,
      valor: (item: T) => item.porSituacao.find((linha) => linha.situacao === situacao)?.contratos ?? 0,
    },
    {
      titulo: `Valor ${rotuloDaSituacao(situacao)} (R$)`,
      valor: (item: T) =>
        formatarMoedaParaCsv(
          item.porSituacao.find((linha) => linha.situacao === situacao)?.valorVencidoCentavos ?? 0,
        ),
    },
  ]);
}

function rotuloDaSituacao(situacao: string): string {
  return situacao.toLowerCase().replace(/_/g, ' ');
}

function colunasDeInadimplencia(): ColunaCsv<LinhaDeInadimplenciaPorLoteamento>[] {
  return [
    { titulo: 'Loteamento', valor: (linha) => linha.loteamento },
    { titulo: 'Cidade', valor: (linha) => linha.cidade },
    { titulo: 'UF', valor: (linha) => linha.uf },
    { titulo: 'Contratos inadimplentes', valor: (linha) => linha.contratosInadimplentes },
    { titulo: 'Clientes inadimplentes', valor: (linha) => linha.clientesInadimplentes },
    { titulo: 'Parcelas vencidas', valor: (linha) => linha.parcelasVencidas },
    { titulo: 'Valor vencido (R$)', valor: (linha) => formatarMoedaParaCsv(linha.valorVencidoCentavos) },
    ...colunasDeSituacao<LinhaDeInadimplenciaPorLoteamento>(),
    ...colunasDeAging<LinhaDeInadimplenciaPorLoteamento>(),
  ];
}

function colunasDeLotesARetomar(): ColunaCsv<LinhaDeLoteARetomar>[] {
  return [
    { titulo: 'Contrato', valor: (linha) => linha.numero },
    { titulo: 'Assinatura', valor: (linha) => formatarDataParaCsv(linha.dataAssinatura) },
    { titulo: 'Cliente', valor: (linha) => linha.cliente },
    { titulo: 'Documento', valor: (linha) => linha.documento },
    { titulo: 'E-mail', valor: (linha) => linha.email },
    { titulo: 'Telefone', valor: (linha) => linha.telefone },
    { titulo: 'WhatsApp', valor: (linha) => linha.whatsapp },
    { titulo: 'Loteamento', valor: (linha) => linha.loteamento },
    { titulo: 'Quadra', valor: (linha) => linha.quadra },
    { titulo: 'Lote', valor: (linha) => linha.lote },
    { titulo: 'Maior atraso (dias)', valor: (linha) => linha.diasDeAtrasoMaximo },
    { titulo: 'Valor vencido (R$)', valor: (linha) => formatarMoedaParaCsv(linha.valorVencidoCentavos) },
    { titulo: 'Saldo devedor (R$)', valor: (linha) => formatarMoedaParaCsv(linha.saldoDevedorCentavos) },
  ];
}

function colunasDeRecebimentos(): ColunaCsv<LinhaDeRecebimentoPorCompetencia>[] {
  return [
    { titulo: 'Competencia', valor: (linha) => linha.competencia },
    { titulo: 'Pagamentos', valor: (linha) => linha.quantidade },
    { titulo: 'Principal (R$)', valor: (linha) => formatarMoedaParaCsv(linha.principalCentavos) },
    { titulo: 'Juros (R$)', valor: (linha) => formatarMoedaParaCsv(linha.jurosCentavos) },
    { titulo: 'Multa (R$)', valor: (linha) => formatarMoedaParaCsv(linha.multaCentavos) },
    { titulo: 'Desconto (R$)', valor: (linha) => formatarMoedaParaCsv(linha.descontoCentavos) },
    { titulo: 'Total (R$)', valor: (linha) => formatarMoedaParaCsv(linha.totalCentavos) },
  ];
}

function colunasDeFluxoPrevisto(): ColunaCsv<LinhaDeFluxoPrevisto>[] {
  return [
    { titulo: 'Competencia', valor: (linha) => linha.competencia },
    { titulo: 'Parcelas', valor: (linha) => linha.quantidade },
    { titulo: 'A receber (R$)', valor: (linha) => formatarMoedaParaCsv(linha.valorCentavos) },
  ];
}

function colunasDeClientesEmAtraso(): ColunaCsv<LinhaDeClienteEmAtraso>[] {
  return [
    { titulo: 'Cliente', valor: (linha) => linha.cliente },
    { titulo: 'Documento', valor: (linha) => linha.documento },
    { titulo: 'E-mail', valor: (linha) => linha.email },
    { titulo: 'Telefone', valor: (linha) => linha.telefone },
    { titulo: 'WhatsApp', valor: (linha) => linha.whatsapp },
    { titulo: 'Contratos', valor: (linha) => linha.contratos },
    { titulo: 'Parcelas vencidas', valor: (linha) => linha.parcelasVencidas },
    { titulo: 'Valor atualizado (R$)', valor: (linha) => formatarMoedaParaCsv(linha.valorVencidoCentavos) },
    { titulo: 'Maior atraso (dias)', valor: (linha) => linha.maiorAtrasoEmDias },
  ];
}

function colunasDeContratos(): ColunaCsv<LinhaDeContratoDoRelatorio>[] {
  return [
    { titulo: 'Contrato', valor: (linha) => linha.numero },
    { titulo: 'Assinatura', valor: (linha) => formatarDataParaCsv(linha.dataAssinatura) },
    { titulo: 'Cliente', valor: (linha) => linha.cliente },
    { titulo: 'Documento', valor: (linha) => linha.documento },
    { titulo: 'Loteamento', valor: (linha) => linha.loteamento },
    { titulo: 'Quadra', valor: (linha) => linha.quadra },
    { titulo: 'Lote', valor: (linha) => linha.lote },
    { titulo: 'Valor total (R$)', valor: (linha) => formatarMoedaParaCsv(linha.valorTotalCentavos) },
    { titulo: 'Recebido (R$)', valor: (linha) => formatarMoedaParaCsv(linha.totalRecebidoCentavos) },
    { titulo: 'Saldo devedor (R$)', valor: (linha) => formatarMoedaParaCsv(linha.saldoDevedorCentavos) },
    { titulo: 'Parcelas em aberto', valor: (linha) => linha.parcelasEmAberto },
    { titulo: 'Parcelas vencidas', valor: (linha) => linha.parcelasVencidas },
    { titulo: 'Maior atraso (dias)', valor: (linha) => linha.diasDeAtrasoMaximo },
    { titulo: 'Status', valor: (linha) => linha.status },
    { titulo: 'Situacao', valor: (linha) => linha.situacao },
  ];
}

function colunasDeCobrancas(): ColunaCsv<LinhaDeCobranca>[] {
  return [
    { titulo: 'Data de referencia', valor: (linha) => formatarDataParaCsv(linha.dataDeReferencia) },
    { titulo: 'Enviada em', valor: (linha) => formatarDataHoraParaCsv(linha.enviadaEm) },
    { titulo: 'Cliente', valor: (linha) => linha.cliente },
    { titulo: 'Contrato', valor: (linha) => linha.contrato },
    { titulo: 'Parcela', valor: (linha) => linha.parcela },
    { titulo: 'Canal', valor: (linha) => linha.canal },
    { titulo: 'Destino', valor: (linha) => linha.destino },
    { titulo: 'Evento', valor: (linha) => linha.evento },
    { titulo: 'Status', valor: (linha) => linha.status },
    { titulo: 'Valor cobrado (R$)', valor: (linha) => formatarMoedaParaCsv(linha.valorCobradoCentavos) },
    { titulo: 'Ultimo erro', valor: (linha) => linha.ultimoErro },
  ];
}

function colunasDeComissoes(): ColunaCsv<LinhaDeComissao>[] {
  return [
    { titulo: 'Corretor', valor: (linha) => linha.corretor },
    { titulo: 'Documento', valor: (linha) => linha.documento },
    { titulo: 'Contratos', valor: (linha) => linha.contratos },
    { titulo: 'Valor vendido (R$)', valor: (linha) => formatarMoedaParaCsv(linha.valorVendidoCentavos) },
    { titulo: 'Comissao (%)', valor: (linha) => formatarNumeroParaCsv(linha.percentualDeComissao) },
    { titulo: 'Comissao prevista (R$)', valor: (linha) => formatarMoedaParaCsv(linha.comissaoPrevistaCentavos) },
  ];
}
