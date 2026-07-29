import { rotularEnum } from './formato';
import type { SituacaoDaParcela } from '@/tipos/parcela';
import type { SituacaoDoContrato } from '@/tipos/contrato';
import type { Canal } from '@/tipos/cobranca';

export type TomDoSelo = 'vencido' | 'atencao' | 'ok' | 'neutro' | 'info' | 'critico';

const SITUACOES_DA_PARCELA: Record<string, { texto: string; tom: TomDoSelo }> = {
  VENCIDA: { texto: 'Vencida', tom: 'vencido' },
  VENCE_HOJE: { texto: 'Vence hoje', tom: 'atencao' },
  A_VENCER: { texto: 'A vencer', tom: 'neutro' },
  PAGA: { texto: 'Paga', tom: 'ok' },
  RENEGOCIADA: { texto: 'Renegociada', tom: 'info' },
};

export function seloDaSituacaoDaParcela(situacao: SituacaoDaParcela | string): {
  texto: string;
  tom: TomDoSelo;
} {
  return SITUACOES_DA_PARCELA[situacao] ?? { texto: rotularEnum(situacao), tom: 'neutro' };
}

const SITUACOES_DO_CONTRATO: Record<string, { texto: string; tom: TomDoSelo }> = {
  EM_DIA: { texto: 'Em dia', tom: 'ok' },
  EM_ATRASO: { texto: 'Em atraso', tom: 'atencao' },
  INADIMPLENTE: { texto: 'Inadimplente', tom: 'vencido' },
  SUJEITO_A_RETOMADA: { texto: 'Sujeito a retomada', tom: 'critico' },
  QUITADO: { texto: 'Quitado', tom: 'info' },
  CANCELADO: { texto: 'Cancelado', tom: 'neutro' },
  DISTRATADO: { texto: 'Distratado', tom: 'neutro' },
};

export function seloDaSituacaoDoContrato(situacao: SituacaoDoContrato | string): {
  texto: string;
  tom: TomDoSelo;
} {
  return SITUACOES_DO_CONTRATO[situacao] ?? { texto: rotularEnum(situacao), tom: 'neutro' };
}

const STATUS_DE_COBRANCA: Record<string, TomDoSelo> = {
  ENVIADA: 'ok',
  FALHA: 'vencido',
  IGNORADA: 'neutro',
  CANCELADA: 'neutro',
  PENDENTE: 'atencao',
  PROGRAMADA: 'info',
  SIMULADA: 'info',
};

export function tomDoStatusDeCobranca(status: string): TomDoSelo {
  return STATUS_DE_COBRANCA[status] ?? 'neutro';
}

const CANAIS: Record<Canal | string, string> = {
  WHATSAPP: 'WhatsApp',
  EMAIL: 'E-mail',
  SMS: 'SMS',
};

export function rotuloDoCanal(canal: string): string {
  return CANAIS[canal] ?? rotularEnum(canal);
}

const TIPOS_DE_DOCUMENTO: Record<string, string> = {
  BOLETO_COM_PIX: 'boleto+Pix',
  BOLETO: 'boleto',
  PIX: 'Pix',
};

export function rotuloDoTipoDeDocumento(tipo: string): string {
  return TIPOS_DE_DOCUMENTO[tipo] ?? rotularEnum(tipo);
}

export function rotuloDoGatilho(gatilho: string, dias: number): string {
  if (gatilho === 'NO_VENCIMENTO') return 'No dia do vencimento';
  const plural = dias === 1 ? 'dia' : 'dias';
  if (gatilho === 'ANTES_DO_VENCIMENTO') return `${dias} ${plural} antes do vencimento`;
  if (gatilho === 'APOS_O_VENCIMENTO') return `${dias} ${plural} após o vencimento`;
  return rotularEnum(gatilho);
}
