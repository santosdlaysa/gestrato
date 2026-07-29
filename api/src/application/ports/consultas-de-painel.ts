import type { DataCivil } from '../../domain/value-objects/data-civil.js';
import type { Canal, Gatilho, StatusCobranca } from '../../domain/cobranca/tipos.js';
import type { SituacaoDeAtraso } from '../../domain/contratos/politica-de-inadimplencia.js';
import type { SituacaoContrato, StatusContrato } from '../../domain/contratos/tipos.js';

/**
 * Lado de leitura (CQRS-lite) do sistema.
 *
 * Painel e relatorios agregam dezenas de milhares de parcelas. Reconstituir as
 * entidades de dominio para somar seria caro e inutil: nenhuma regra de negocio
 * e *decidida* aqui, apenas apresentada. Por isso estas portas devolvem DTOs de
 * leitura ja prontos para virar JSON — dinheiro em centavos inteiros e datas em
 * "AAAA-MM-DD", exatamente como o contrato da API descreve.
 *
 * A implementacao (Prisma/SQL) fica em infrastructure; nada aqui conhece banco.
 */

// ------------------------------------------------------------------ comuns

/** Contagem + valor de um conjunto de parcelas. */
export interface TotalDeParcelas {
  readonly quantidade: number;
  readonly valorCentavos: number;
}

/** Faixas de vencido por dias de atraso, na ordem em que o painel as exibe. */
export const FAIXAS_DE_AGING = ['1-5', '6-15', '16-30', '31-60', '61-90', '90+'] as const;
export type FaixaDeAging = (typeof FAIXAS_DE_AGING)[number];

export interface TotalPorFaixaDeAging {
  readonly faixa: FaixaDeAging;
  readonly quantidade: number;
  readonly valorCentavos: number;
}

/** Limiares vigentes da escala de atraso, ecoados para o front rotular as telas. */
export interface LimiaresDeInadimplencia {
  readonly diasParaInadimplencia: number;
  readonly diasParaRetomadaDoLote: number;
}

/** Degraus de atraso que produzem cobranca, sem o `EM_DIA`. */
export const SITUACOES_EM_ATRASO = ['EM_ATRASO', 'INADIMPLENTE', 'SUJEITO_A_RETOMADA'] as const;

/** Quantos contratos e quanto valor em cada degrau da escala. */
export interface TotalPorSituacaoDeAtraso {
  readonly situacao: SituacaoDeAtraso;
  readonly contratos: number;
  readonly clientes: number;
  readonly valorVencidoCentavos: number;
}

/** Valor recebido (ou previsto) numa competencia "AAAA-MM". */
export interface TotalPorCompetencia {
  readonly competencia: string;
  readonly valorCentavos: number;
}

// ------------------------------------------------------------------ painel

/** Volume da regua de cobranca: o que saiu e o que falhou. */
export interface CobrancasEnviadasNoPainel {
  /** Envios com status ENVIADA cuja data de referencia e a propria data do painel. */
  readonly hoje: number;
  readonly ultimos30Dias: number;
  readonly falhasUltimos30Dias: number;
}

export interface ResumoDoPainel {
  /** Data de referencia usada nos calculos, em "AAAA-MM-DD". */
  readonly data: string;
  readonly contratosAtivos: number;
  readonly contratosQuitados: number;
  /**
   * Contratos ativos com atraso curto: de 1 dia ate `diasParaInadimplencia - 1`.
   * Ainda tratados pela regua, fora das listas de inadimplencia.
   */
  readonly contratosEmAtraso: number;
  /**
   * Contratos ativos cujo maior atraso ja alcancou `diasParaInadimplencia`
   * — inclui os sujeitos a retomada. Ate a escala existir, este numero contava
   * qualquer contrato com um dia de atraso; hoje respeita o limiar.
   */
  readonly contratosInadimplentes: number;
  /** Subconjunto do anterior: maior atraso >= `diasParaRetomadaDoLote`. */
  readonly contratosSujeitosARetomada: number;
  /** Clientes distintos com ao menos um contrato INADIMPLENTE ou SUJEITO_A_RETOMADA. */
  readonly clientesInadimplentes: number;
  /** Lotes distintos sujeitos a retomada e o vencido correspondente. */
  readonly lotesARetomar: {
    readonly quantidade: number;
    readonly valorVencidoCentavos: number;
  };
  /** Limiares que produziram as contagens acima, para o front nao ter que consultar de novo. */
  readonly politicaDeInadimplencia: LimiaresDeInadimplencia;
  /** Saldo principal das parcelas em aberto (sem encargos). */
  readonly totalAReceberCentavos: number;
  /** Pagamentos nao estornados na competencia da data de referencia. */
  readonly totalRecebidoNoMesCentavos: number;
  /** Saldo principal + multa + juros das parcelas ja vencidas. */
  readonly totalVencidoCentavos: number;
  /**
   * Fatia vencida da carteira, com uma casa decimal: saldo principal das
   * parcelas vencidas dividido pelo saldo principal de todas as em aberto.
   * Principal contra principal — sem mora nos dois lados.
   */
  readonly percentualDeInadimplencia: number;
  /**
   * Eficacia da cobranca sobre uma coorte fechada, com uma casa decimal.
   *
   * Das parcelas que *venceram* na janela de 30 dias encerrada na data de
   * referencia, o percentual do valor original que ja foi recebido de
   * principal: `SUM(valorPagoCentavos) / SUM(valorOriginalCentavos) * 100`.
   * Entram as parcelas com `vencimento` na janela, fora `CANCELADA` e
   * `RENEGOCIADA`, de contratos que nao estejam `CANCELADO`/`DISTRATADO`.
   *
   * So principal, sem mora — igual ao percentual de inadimplencia, para que o
   * indicador meça recuperacao e nao encargo acumulado. Como numerador e
   * denominador olham a mesma coorte, nao se mistura estoque com fluxo.
   * Denominador zero devolve `0`.
   */
  readonly taxaDeRecuperacao: number;
  readonly parcelasQueVencemHoje: TotalDeParcelas;
  readonly parcelasVencidas: TotalDeParcelas;
  readonly proximos7Dias: TotalDeParcelas;
  readonly cobrancasEnviadas: CobrancasEnviadasNoPainel;
  /** Ultimos 12 meses, do mais antigo ao mais recente, incluindo meses zerados. */
  readonly recebimentosPorMes: TotalPorCompetencia[];
  readonly aging: TotalPorFaixaDeAging[];
}

export interface ConsultasDePainel {
  /** Fotografia da carteira na data de referencia. */
  resumo(data: DataCivil): Promise<ResumoDoPainel>;
}

// -------------------------------------------------------------- relatorios

export interface FiltroDeInadimplencia {
  readonly data: DataCivil;
  readonly loteamentoId?: string;
}

export interface PosicaoDeInadimplencia {
  /** Contratos cujo maior atraso alcancou `diasParaInadimplencia`. */
  readonly contratosInadimplentes: number;
  readonly clientesInadimplentes: number;
  /**
   * Parcelas e valor cobrem *todo* o vencido, a partir de um dia de atraso —
   * sao grandezas de parcela, nao de contrato, e nao passam pela escala. O
   * mesmo vale para o `aging`.
   */
  readonly parcelasVencidas: number;
  readonly valorVencidoCentavos: number;
  readonly aging: TotalPorFaixaDeAging[];
  /** Contratos e valor em cada degrau da escala, do mais leve ao mais grave. */
  readonly porSituacao: TotalPorSituacaoDeAtraso[];
}

export interface LinhaDeInadimplenciaPorLoteamento extends PosicaoDeInadimplencia {
  readonly loteamentoId: string;
  readonly loteamento: string;
  readonly cidade: string;
  readonly uf: string;
}

export interface RelatorioDeInadimplencia {
  readonly data: string;
  readonly politicaDeInadimplencia: LimiaresDeInadimplencia;
  readonly itens: LinhaDeInadimplenciaPorLoteamento[];
  readonly total: PosicaoDeInadimplencia;
}

export interface FiltroDeLotesARetomar {
  readonly data: DataCivil;
  readonly loteamentoId?: string;
}

export interface LinhaDeLoteARetomar {
  readonly contratoId: string;
  readonly numero: string;
  readonly dataAssinatura: string;
  readonly clienteId: string;
  readonly cliente: string;
  readonly documento: string;
  readonly email: string | null;
  readonly telefone: string | null;
  readonly whatsapp: string | null;
  readonly loteamentoId: string;
  readonly loteamento: string;
  readonly quadra: string;
  readonly lote: string;
  /** Maior atraso entre as parcelas em aberto do contrato. */
  readonly diasDeAtrasoMaximo: number;
  /** Vencido atualizado: saldo principal + multa + juros. */
  readonly valorVencidoCentavos: number;
  /** Saldo principal de todas as parcelas em aberto, vencidas ou nao. */
  readonly saldoDevedorCentavos: number;
}

export interface RelatorioDeLotesARetomar {
  readonly data: string;
  readonly politicaDeInadimplencia: LimiaresDeInadimplencia;
  readonly itens: LinhaDeLoteARetomar[];
  readonly totalDeContratos: number;
  readonly valorVencidoCentavos: number;
  readonly saldoDevedorCentavos: number;
}

export interface PeriodoDoRelatorio {
  readonly de: DataCivil;
  readonly ate: DataCivil;
}

export interface LinhaDeRecebimentoPorCompetencia {
  readonly competencia: string;
  readonly quantidade: number;
  readonly principalCentavos: number;
  readonly jurosCentavos: number;
  readonly multaCentavos: number;
  readonly descontoCentavos: number;
  readonly totalCentavos: number;
}

export interface LinhaDeRecebimentoPorFormaDePagamento {
  readonly formaPagamento: string;
  readonly quantidade: number;
  readonly totalCentavos: number;
}

export interface RelatorioDeRecebimentos {
  readonly de: string;
  readonly ate: string;
  readonly itens: LinhaDeRecebimentoPorCompetencia[];
  readonly porFormaDePagamento: LinhaDeRecebimentoPorFormaDePagamento[];
  readonly total: Omit<LinhaDeRecebimentoPorCompetencia, 'competencia'>;
}

export interface FiltroDeFluxoPrevisto {
  readonly data: DataCivil;
  readonly meses: number;
}

export interface LinhaDeFluxoPrevisto {
  readonly competencia: string;
  readonly quantidade: number;
  readonly valorCentavos: number;
}

export interface RelatorioDeFluxoPrevisto {
  readonly de: string;
  readonly meses: number;
  readonly itens: LinhaDeFluxoPrevisto[];
  readonly totalCentavos: number;
}

export interface FiltroDeClientesEmAtraso {
  readonly data: DataCivil;
  /** Ignora atrasos menores que isto — util para separar esquecimento de inadimplencia. */
  readonly diasMinimos: number;
}

export interface LinhaDeClienteEmAtraso {
  readonly clienteId: string;
  readonly cliente: string;
  readonly documento: string;
  readonly email: string | null;
  readonly telefone: string | null;
  readonly whatsapp: string | null;
  readonly contratos: number;
  readonly parcelasVencidas: number;
  /** Saldo principal + multa + juros das parcelas vencidas do cliente. */
  readonly valorVencidoCentavos: number;
  readonly maiorAtrasoEmDias: number;
}

export interface RelatorioDeClientesEmAtraso {
  readonly data: string;
  readonly diasMinimos: number;
  readonly itens: LinhaDeClienteEmAtraso[];
  readonly totalCentavos: number;
}

export interface FiltroDeContratosDoRelatorio {
  readonly data: DataCivil;
  readonly status?: StatusContrato;
}

export interface LinhaDeContratoDoRelatorio {
  readonly contratoId: string;
  readonly numero: string;
  readonly dataAssinatura: string;
  readonly clienteId: string;
  readonly cliente: string;
  readonly documento: string;
  readonly loteamento: string;
  readonly quadra: string;
  readonly lote: string;
  readonly valorTotalCentavos: number;
  readonly totalRecebidoCentavos: number;
  readonly saldoDevedorCentavos: number;
  readonly parcelasEmAberto: number;
  readonly parcelasVencidas: number;
  /** Maior atraso entre as parcelas em aberto — o que define a `situacao`. */
  readonly diasDeAtrasoMaximo: number;
  readonly status: StatusContrato;
  readonly situacao: SituacaoContrato;
}

export interface RelatorioDeContratos {
  readonly data: string;
  readonly status: StatusContrato | null;
  readonly itens: LinhaDeContratoDoRelatorio[];
  readonly totalDeContratos: number;
  readonly valorTotalCentavos: number;
  readonly saldoDevedorCentavos: number;
}

export interface LinhaDeComissao {
  readonly corretorId: string;
  readonly corretor: string;
  readonly documento: string | null;
  readonly contratos: number;
  readonly valorVendidoCentavos: number;
  readonly percentualDeComissao: number;
  readonly comissaoPrevistaCentavos: number;
}

export interface RelatorioDeComissoes {
  readonly de: string;
  readonly ate: string;
  readonly itens: LinhaDeComissao[];
  readonly valorVendidoCentavos: number;
  readonly comissaoPrevistaCentavos: number;
}

export interface FiltroDeCobrancasDoRelatorio {
  readonly de: DataCivil;
  readonly ate: DataCivil;
  readonly canal?: Canal;
  readonly status?: StatusCobranca;
}

export interface ResumoDeCobrancas {
  readonly envios: number;
  readonly enviadas: number;
  readonly falhas: number;
  readonly canceladas: number;
  readonly valorCobradoCentavos: number;
  /** Clientes distintos que receberam ao menos um envio no periodo. */
  readonly clientesAlcancados: number;
}

export interface LinhaDeCobrancaPorCanal {
  readonly canal: Canal;
  readonly enviadas: number;
  readonly falhas: number;
  readonly valorCobradoCentavos: number;
}

export interface LinhaDeCobrancaPorEvento {
  /** `GATILHO:dias`, como na regua — ex.: "APOS_O_VENCIMENTO:5". */
  readonly evento: string;
  readonly gatilho: Gatilho;
  readonly dias: number;
  readonly enviadas: number;
  readonly falhas: number;
  readonly valorCobradoCentavos: number;
}

export interface LinhaDeCobranca {
  readonly cobrancaId: string;
  readonly dataDeReferencia: string;
  /** Carimbo de auditoria em ISO 8601 UTC; nulo enquanto nao foi enviada. */
  readonly enviadaEm: string | null;
  readonly clienteId: string;
  readonly cliente: string;
  readonly contratoId: string;
  readonly contrato: string;
  readonly parcelaId: string;
  readonly parcela: number;
  readonly canal: Canal;
  readonly destino: string;
  readonly evento: string;
  readonly status: StatusCobranca;
  readonly valorCobradoCentavos: number;
  readonly ultimoErro: string | null;
}

export interface RelatorioDeCobrancas {
  readonly de: string;
  readonly ate: string;
  readonly canal: Canal | null;
  readonly status: StatusCobranca | null;
  readonly resumo: ResumoDeCobrancas;
  readonly porCanal: LinhaDeCobrancaPorCanal[];
  readonly porEvento: LinhaDeCobrancaPorEvento[];
  readonly itens: LinhaDeCobranca[];
}

export interface ConsultasDeRelatorio {
  inadimplencia(filtro: FiltroDeInadimplencia): Promise<RelatorioDeInadimplencia>;
  lotesARetomar(filtro: FiltroDeLotesARetomar): Promise<RelatorioDeLotesARetomar>;
  recebimentos(periodo: PeriodoDoRelatorio): Promise<RelatorioDeRecebimentos>;
  fluxoPrevisto(filtro: FiltroDeFluxoPrevisto): Promise<RelatorioDeFluxoPrevisto>;
  clientesEmAtraso(filtro: FiltroDeClientesEmAtraso): Promise<RelatorioDeClientesEmAtraso>;
  contratos(filtro: FiltroDeContratosDoRelatorio): Promise<RelatorioDeContratos>;
  comissoes(periodo: PeriodoDoRelatorio): Promise<RelatorioDeComissoes>;
  cobrancas(filtro: FiltroDeCobrancasDoRelatorio): Promise<RelatorioDeCobrancas>;
}
