import { ErroDeValidacao } from '../shared/errors.js';

/** Momento do ciclo da parcela em que a cobranca dispara. */
export const GATILHOS = ['ANTES_DO_VENCIMENTO', 'NO_VENCIMENTO', 'APOS_O_VENCIMENTO'] as const;
export type Gatilho = (typeof GATILHOS)[number];

export const CANAIS = ['WHATSAPP', 'SMS', 'EMAIL'] as const;
export type Canal = (typeof CANAIS)[number];

export const STATUS_COBRANCA = ['PENDENTE', 'ENVIADA', 'FALHA', 'CANCELADA'] as const;
export type StatusCobranca = (typeof STATUS_COBRANCA)[number];

/** Meio de pagamento emitido para a parcela. */
export const TIPOS_DOCUMENTO = ['BOLETO', 'PIX', 'BOLETO_COM_PIX'] as const;
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];

export const STATUS_DOCUMENTO = ['EMITIDO', 'PAGO', 'CANCELADO', 'EXPIRADO', 'FALHA'] as const;
export type StatusDocumento = (typeof STATUS_DOCUMENTO)[number];

export function garantirGatilho(valor: string): Gatilho {
  return garantirValorDaLista(GATILHOS, valor, 'Gatilho');
}

export function garantirCanal(valor: string): Canal {
  return garantirValorDaLista(CANAIS, valor, 'Canal');
}

export function garantirStatusCobranca(valor: string): StatusCobranca {
  return garantirValorDaLista(STATUS_COBRANCA, valor, 'Status de cobranca');
}

export function garantirTipoDocumento(valor: string): TipoDocumento {
  return garantirValorDaLista(TIPOS_DOCUMENTO, valor, 'Tipo de documento');
}

export function garantirStatusDocumento(valor: string): StatusDocumento {
  return garantirValorDaLista(STATUS_DOCUMENTO, valor, 'Status de documento');
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
