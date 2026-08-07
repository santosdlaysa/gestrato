import { requisitar, type Parametros } from '../http';
import type { RespostaPaginada } from '@/tipos/comum';
import type { Inadimplente, ResumoDaInadimplencia } from '@/tipos/inadimplencia';

export interface FiltrosDeInadimplencia extends Parametros {
  loteamentoId?: string;
  clienteId?: string;
  busca?: string;
  risco?: string;
  ordenarPor?: string;
  pagina?: number;
  porPagina?: number;
}

/** A resposta traz a página de devedores e os totais do conjunto filtrado. */
export interface RespostaDeInadimplencia extends RespostaPaginada<Inadimplente> {
  resumo: ResumoDaInadimplencia;
}

export function listarInadimplentes(
  filtros: FiltrosDeInadimplencia,
  sinal?: AbortSignal,
): Promise<RespostaDeInadimplencia> {
  return requisitar<RespostaDeInadimplencia>('/inadimplentes', {
    parametros: filtros,
    sinal,
  });
}
