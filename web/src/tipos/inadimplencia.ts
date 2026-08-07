import type { SituacaoDoContrato } from '@/tipos/contrato';

/** Degrau da escala de atraso; EM_DIA não aparece na consulta de inadimplência. */
export type RiscoDeInadimplencia = 'EM_ATRASO' | 'INADIMPLENTE' | 'SUJEITO_A_RETOMADA';

export interface UnidadeDoInadimplente {
  loteamento: string;
  quadra: string;
  lote: string;
}

export interface ContatoDoInadimplente {
  id: string;
  nome: string;
  documento: string;
  email: string | null;
  whatsapp: string | null;
  telefone: string | null;
}

/** Uma linha da consulta: o que um cliente deve, hoje, somando seus contratos. */
export interface Inadimplente {
  clienteId: string;
  cliente: ContatoDoInadimplente;
  totalEmAtrasoCentavos: number;
  principalCentavos: number;
  encargosCentavos: number;
  parcelasVencidas: number;
  contratosEmAtraso: number;
  diasDeAtrasoMaximo: number;
  vencimentoMaisAntigo: string;
  diasAteARetomada: number;
  risco: SituacaoDoContrato;
  unidadePrincipal: UnidadeDoInadimplente;
  contratoIds: string[];
}

/** Totais do conjunto filtrado — alimentam os cartões no topo da tela. */
export interface ResumoDaInadimplencia {
  clientes: number;
  totalEmAtrasoCentavos: number;
  principalCentavos: number;
  encargosCentavos: number;
  parcelasVencidas: number;
  porRisco: Record<string, number>;
}
