export type SituacaoDaParcela = 'VENCIDA' | 'VENCE_HOJE' | 'A_VENCER' | 'PAGA' | 'RENEGOCIADA';

export type StatusDaParcela =
  | 'PENDENTE'
  | 'PAGA'
  | 'PARCIAL'
  | 'CANCELADA'
  | 'RENEGOCIADA';

export type TipoDeParcela = 'ENTRADA' | 'FINANCIAMENTO' | 'RENEGOCIACAO' | 'AVULSA';

export type TipoDeDocumento = 'BOLETO' | 'PIX' | 'BOLETO_COM_PIX';

export const TIPOS_DE_DOCUMENTO: TipoDeDocumento[] = ['BOLETO_COM_PIX', 'BOLETO', 'PIX'];

export interface DemonstrativoDaParcela {
  saldoPrincipalCentavos: number;
  multaCentavos: number;
  jurosCentavos: number;
  totalCentavos: number;
  diasDeAtraso: number;
  diasCobrados: number;
}

export interface DocumentoDeCobranca {
  id: string;
  tipo: TipoDeDocumento;
  linhaDigitavel: string | null;
  pixCopiaECola: string | null;
  urlDoDocumento: string | null;
  status: string;
  valorCentavos?: number;
  criadoEm?: string;
}

export interface Parcela {
  id: string;
  numero: number;
  tipo: TipoDeParcela;
  descricao: string;
  valorOriginalCentavos: number;
  vencimento: string;
  status: StatusDaParcela;
  situacao: SituacaoDaParcela;
  valorPagoCentavos: number;
  demonstrativo: DemonstrativoDaParcela | null;
  documentoVigente: DocumentoDeCobranca | null;
}

export interface ResumoDoContratoNaParcela {
  id?: string;
  numero?: string;
}

export interface ResumoDoClienteNaParcela {
  id?: string;
  nome?: string;
  telefone?: string | null;
  whatsapp?: string | null;
}

/** Linha da tela de cobrança: parcela com os dados do contrato/cliente embutidos. */
export interface ParcelaDeCobranca extends Parcela {
  contratoId?: string;
  contrato?: ResumoDoContratoNaParcela | string | null;
  clienteId?: string;
  cliente?: ResumoDoClienteNaParcela | string | null;
  loteamentoId?: string;
  loteamento?: string | null;
  quadra?: string | null;
  lote?: string | null;
  totalDeParcelas?: number;
}

export interface EntradaDeBaixa {
  valorPrincipalCentavos: number;
  valorJurosCentavos: number;
  valorMultaCentavos: number;
  valorDescontoCentavos: number;
  pagoEm: string;
  formaPagamento: string;
  observacoes: string | null;
}
