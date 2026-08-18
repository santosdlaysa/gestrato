import type { Periodicidade } from './comum';
import type { Cliente, Lote } from './cadastros';
import type { Parcela } from './parcela';

export type SituacaoDoContrato =
  | 'EM_DIA'
  | 'EM_ATRASO'
  | 'INADIMPLENTE'
  | 'SUJEITO_A_RETOMADA'
  | 'QUITADO'
  | 'CANCELADO'
  | 'DISTRATADO';

export type StatusDoContrato = 'ATIVO' | 'QUITADO' | 'CANCELADO' | 'DISTRATADO';

/** Situações oferecidas como filtro na lista de contratos. */
export const SITUACOES_DO_CONTRATO: SituacaoDoContrato[] = [
  'EM_DIA',
  'EM_ATRASO',
  'INADIMPLENTE',
  'SUJEITO_A_RETOMADA',
  'QUITADO',
];

export const STATUS_DO_CONTRATO: StatusDoContrato[] = [
  'ATIVO',
  'QUITADO',
  'CANCELADO',
  'DISTRATADO',
];

export interface PosicaoFinanceira {
  valorTotalCentavos: number;
  totalRecebidoCentavos: number;
  saldoDevedorCentavos: number;
  totalVencidoCentavos: number;
  totalAVencerCentavos: number;
  encargosAcumuladosCentavos: number;
  parcelasPagas: number;
  parcelasEmAberto: number;
  parcelasVencidas: number;
  proximoVencimento: string | null;
  diasDeAtrasoMaximo: number;
  situacao: SituacaoDoContrato;
  /** Dias restantes até o lote ficar sujeito a retomada; 0 quando o prazo já passou. */
  diasAteARetomada?: number | null;
}

export interface Contrato {
  id: string;
  numero: string;
  clienteId: string;
  loteId: string;
  corretorId: string | null;
  cliente?: Cliente | { id: string; nome: string } | null;
  lote?: Lote | null;
  loteamento?: string | null;
  valorTotalCentavos: number;
  valorEntradaCentavos: number;
  quantidadeDeParcelas: number;
  primeiroVencimento: string;
  periodicidade: Periodicidade;
  status: StatusDoContrato;
  /** Na listagem a situação vem apenas dentro de `posicao`. */
  situacao?: SituacaoDoContrato;
  dataAssinatura: string | null;
  observacoes: string | null;
  posicao?: PosicaoFinanceira | null;
}

export interface EntradaDeContrato {
  numero: string;
  clienteId: string;
  loteId: string;
  corretorId: string | null;
  valorTotalCentavos: number;
  valorEntradaCentavos: number;
  dataEntrada: string | null;
  formaPagamentoEntrada: string | null;
  quantidadeDeParcelas: number;
  valorDaParcelaCentavos: number | null;
  primeiroVencimento: string;
  periodicidade: Periodicidade;
  multaPorAtrasoPercentual: number;
  jurosAoMesPercentual: number;
  diasDeCarencia: number;
  indiceReajuste: string | null;
  dataAssinatura: string | null;
  observacoes: string | null;
}

export interface ParcelaSimulada {
  numero: number;
  tipo: string;
  descricao?: string;
  vencimento: string;
  valorCentavos?: number;
  valorOriginalCentavos?: number;
}

/** Cabeçalho da simulação, como a API devolve em POST /contratos/simular. */
export interface ResumoDaSimulacao {
  valorTotalCentavos: number;
  valorEntradaCentavos: number;
  valorFinanciadoCentavos: number;
  quantidadeDeParcelas: number;
  primeiraParcelaCentavos: number | null;
  ultimaParcelaCentavos: number | null;
  somaDoPlanoCentavos: number;
  primeiroVencimento: string | null;
  ultimoVencimento: string | null;
}

export interface SimulacaoDeContrato {
  resumo: ResumoDaSimulacao;
  parcelas: ParcelaSimulada[];
}

export interface Extrato {
  contratoId?: string;
  data?: string;
  posicao: PosicaoFinanceira;
  parcelas: Parcela[];
}

export interface EntradaDeReajuste {
  indice: string;
  percentual: number;
  aPartirDe: string;
}

export interface EntradaDeRenegociacao {
  parcelaIds: string[];
  incluirEncargos: boolean;
  descontoCentavos: number;
  entradaCentavos: number;
  dataEntrada: string | null;
  quantidadeDeParcelas: number;
  primeiroVencimento: string;
  periodicidade: Periodicidade;
  acordadoEm: string;
  motivo: string | null;
}

export interface Renegociacao {
  id: string;
  acordadoEm: string;
  motivo: string | null;
  saldoRenegociadoCentavos?: number;
  entradaCentavos?: number;
  quantidadeDeParcelas?: number;
  parcelasOrigem?: number;
}

// --- Geração de parcelas em lote ---

export interface ContratoSemParcelas {
  contratoId: string;
  numero: string;
  clienteNome: string;
  quantidadeDeParcelas: number;
  valorTotalCentavos: number;
}

export type ResultadoDaGeracao = 'GERADAS' | 'JA_TINHA' | 'NAO_ENCONTRADO' | 'FALHA';

export interface ItemDaGeracao {
  contratoId: string;
  numero: string;
  resultado: ResultadoDaGeracao;
  parcelasGeradas: number;
  motivo?: string;
}

export interface ResultadoDaGeracaoEmLote {
  processados: number;
  totalGeradas: number;
  itens: ItemDaGeracao[];
}

// --- Reajuste (recálculo) em lote ---

export interface EntradaDeReajusteEmLote {
  contratoIds: string[];
  indice: string;
  percentual: number;
  aplicadoAPartirDe: string;
}

export interface ItemDoReajusteEmLote {
  contratoId: string;
  resultado: 'REAJUSTADO' | 'FALHA';
  parcelasAfetadas: number;
  acrescimoTotalCentavos: number;
  motivo?: string;
}

export interface ResultadoDoReajusteEmLote {
  processados: number;
  totalParcelasAfetadas: number;
  acrescimoTotalCentavos: number;
  itens: ItemDoReajusteEmLote[];
}
