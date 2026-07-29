import type { FaixaDeAging } from './dashboard';
import type { RespostaPaginada } from './comum';
import type { PoliticaDeInadimplencia } from './politica';

export interface QuebraPorSituacao {
  situacao: string;
  contratos?: number;
  quantidade?: number;
  valorVencidoCentavos?: number;
  valorCentavos?: number;
}

export interface LoteARetomar {
  contratoId: string;
  numero: string;
  dataAssinatura: string | null;
  clienteId?: string;
  cliente: string;
  documento?: string | null;
  email?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  loteamentoId?: string;
  loteamento?: string | null;
  quadra?: string | null;
  lote?: string | null;
  diasDeAtrasoMaximo: number;
  valorVencidoCentavos: number;
  saldoDevedorCentavos: number;
}

/** O envelope traz os totais oficiais — não conte por `itens.length`. */
export interface RelatorioDeLotesARetomar {
  data?: string;
  politicaDeInadimplencia?: PoliticaDeInadimplencia;
  itens?: LoteARetomar[];
  totalDeContratos?: number;
  valorVencidoCentavos?: number;
  saldoDevedorCentavos?: number;
}

export interface InadimplenciaPorLoteamento {
  loteamentoId?: string;
  loteamento: string;
  cidade?: string | null;
  uf?: string | null;
  contratos?: number;
  contratosInadimplentes?: number;
  clientes?: number;
  clientesInadimplentes?: number;
  parcelasVencidas?: number;
  valorVencidoCentavos?: number;
  /** Nome alternativo aceito para o mesmo valor. */
  totalVencidoCentavos?: number;
  percentualDeInadimplencia?: number;
  aging?: FaixaDeAging[];
  porSituacao?: QuebraPorSituacao[];
}

export interface RecebimentoPorCompetencia {
  competencia: string;
  quantidade?: number;
  totalCentavos?: number;
  /** Nome alternativo aceito para o total recebido. */
  valorCentavos?: number;
  principalCentavos?: number;
  jurosCentavos?: number;
  multaCentavos?: number;
  descontoCentavos?: number;
}

export interface PrevisaoDeFluxo {
  competencia: string;
  quantidade?: number;
  valorCentavos: number;
}

export type StatusDoRelatorioDeCobrancas = 'ENVIADA' | 'FALHA' | 'CANCELADA' | 'PENDENTE';

export const STATUS_DO_RELATORIO_DE_COBRANCAS: StatusDoRelatorioDeCobrancas[] = [
  'ENVIADA',
  'FALHA',
  'CANCELADA',
  'PENDENTE',
];

export interface ResumoDeCobrancas {
  envios: number;
  enviadas: number;
  falhas: number;
  canceladas?: number;
  valorCobradoCentavos?: number;
  /** Nome alternativo aceito para o valor cobrado. */
  valorTotalCobradoCentavos?: number;
  clientesAlcancados: number;
}

/** Uma linha de quebra: `canal` ou `evento` identifica o agrupamento. */
export interface QuebraDeCobrancas {
  canal?: string;
  evento?: string;
  envios?: number;
  enviadas?: number;
  falhas?: number;
  valorCentavos?: number;
}

export interface CobrancaRealizada {
  id?: string;
  dataDeReferencia?: string | null;
  enviadaEm?: string | null;
  criadaEm?: string | null;
  cliente?: string | null;
  contrato?: string | null;
  contratoId?: string | null;
  parcela?: number | null;
  canal: string;
  destino?: string | null;
  evento?: string | null;
  status: string;
  valorCentavos?: number;
  erro?: string | null;
}

export interface RelatorioDeCobrancas {
  resumo?: ResumoDeCobrancas | null;
  porCanal?: QuebraDeCobrancas[] | RespostaPaginada<QuebraDeCobrancas>;
  porEvento?: QuebraDeCobrancas[] | RespostaPaginada<QuebraDeCobrancas>;
  itens?: CobrancaRealizada[] | RespostaPaginada<CobrancaRealizada>;
}

export interface ClienteEmAtraso {
  clienteId?: string;
  cliente: string;
  documento?: string | null;
  email?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  contratos?: number;
  parcelasVencidas: number;
  maiorAtrasoEmDias?: number;
  /** Nome alternativo aceito para o maior atraso. */
  diasDeAtrasoMaximo?: number;
  valorVencidoCentavos?: number;
  /** Nome alternativo aceito para o valor vencido. */
  totalVencidoCentavos?: number;
}
