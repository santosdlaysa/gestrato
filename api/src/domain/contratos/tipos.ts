import { ErroDeValidacao } from '../shared/errors.js';

/** Periodicidade das parcelas do financiamento. */
export const PERIODICIDADES = ['MENSAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL'] as const;
export type Periodicidade = (typeof PERIODICIDADES)[number];

const MESES_POR_PERIODICIDADE: Record<Periodicidade, number> = {
  MENSAL: 1,
  BIMESTRAL: 2,
  TRIMESTRAL: 3,
  SEMESTRAL: 6,
  ANUAL: 12,
};

export function mesesEntreParcelas(periodicidade: Periodicidade): number {
  return MESES_POR_PERIODICIDADE[periodicidade];
}

/**
 * Status persistido do contrato.
 *
 * "Inadimplente" nao entra aqui de proposito: e uma *situacao* derivada das
 * parcelas em atraso numa data de referencia, nao um estado que alguem grava.
 * Derivar evita o classico contrato marcado como inadimplente que continua
 * assim depois do cliente pagar.
 */
export const STATUS_CONTRATO = ['ATIVO', 'QUITADO', 'CANCELADO', 'DISTRATADO'] as const;
export type StatusContrato = (typeof STATUS_CONTRATO)[number];

/**
 * Situacao apresentavel do contrato, calculada a partir das parcelas.
 *
 * O atraso escalona em tres degraus, definidos pela politica de inadimplencia:
 * `EM_ATRASO` (atraso curto, ainda tratado pela regua), `INADIMPLENTE` (passou
 * do prazo configurado) e `SUJEITO_A_RETOMADA` (prazo em que o lote volta para
 * a loteadora). Ver `politica-de-inadimplencia.ts`.
 */
export const SITUACOES_CONTRATO = [
  'EM_DIA',
  'EM_ATRASO',
  'INADIMPLENTE',
  'SUJEITO_A_RETOMADA',
  'QUITADO',
  'CANCELADO',
  'DISTRATADO',
] as const;
export type SituacaoContrato = (typeof SITUACOES_CONTRATO)[number];

/**
 * Status persistido da parcela. "Vencida" tambem e derivado (PENDENTE com
 * vencimento no passado), o que dispensa job noturno para virar status.
 */
export const STATUS_PARCELA = ['PENDENTE', 'PAGA', 'PAGA_PARCIAL', 'CANCELADA', 'RENEGOCIADA'] as const;
export type StatusParcela = (typeof STATUS_PARCELA)[number];

/** Situacao apresentavel da parcela numa data de referencia. */
export const SITUACOES_PARCELA = ['A_VENCER', 'VENCE_HOJE', 'VENCIDA', 'PAGA', 'PAGA_PARCIAL', 'CANCELADA', 'RENEGOCIADA'] as const;
export type SituacaoParcela = (typeof SITUACOES_PARCELA)[number];

export const TIPOS_PARCELA = ['ENTRADA', 'FINANCIAMENTO', 'RENEGOCIACAO'] as const;
export type TipoParcela = (typeof TIPOS_PARCELA)[number];

export const FORMAS_PAGAMENTO = ['DINHEIRO', 'PIX', 'BOLETO', 'TRANSFERENCIA', 'CARTAO', 'CHEQUE', 'PERMUTA'] as const;
export type FormaPagamento = (typeof FORMAS_PAGAMENTO)[number];

export const INDICES_REAJUSTE = ['NENHUM', 'IGPM', 'IPCA', 'INCC', 'INPC'] as const;
export type IndiceReajuste = (typeof INDICES_REAJUSTE)[number];

export function garantirPeriodicidade(valor: string): Periodicidade {
  return garantirValorDaLista(PERIODICIDADES, valor, 'Periodicidade');
}

export function garantirStatusContrato(valor: string): StatusContrato {
  return garantirValorDaLista(STATUS_CONTRATO, valor, 'Status de contrato');
}

export function garantirStatusParcela(valor: string): StatusParcela {
  return garantirValorDaLista(STATUS_PARCELA, valor, 'Status de parcela');
}

export function garantirTipoParcela(valor: string): TipoParcela {
  return garantirValorDaLista(TIPOS_PARCELA, valor, 'Tipo de parcela');
}

export function garantirFormaPagamento(valor: string): FormaPagamento {
  return garantirValorDaLista(FORMAS_PAGAMENTO, valor, 'Forma de pagamento');
}

export function garantirIndiceReajuste(valor: string): IndiceReajuste {
  return garantirValorDaLista(INDICES_REAJUSTE, valor, 'Indice de reajuste');
}

function garantirValorDaLista<T extends string>(
  permitidos: readonly T[],
  valor: string,
  rotulo: string,
): T {
  if (!(permitidos as readonly string[]).includes(valor)) {
    throw new ErroDeValidacao(`${rotulo} invalido(a): "${valor}". Esperado um de: ${permitidos.join(', ')}.`);
  }
  return valor as T;
}
