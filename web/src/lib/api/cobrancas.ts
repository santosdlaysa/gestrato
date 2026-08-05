import { requisitar, type Parametros } from '../http';
import type { RespostaPaginada } from '@/tipos/comum';
import type { Cobranca, DetalheDeCobranca } from '@/tipos/cobranca';

export interface FiltrosDeCobrancas extends Parametros {
  contratoId?: string;
  parcelaId?: string;
  clienteId?: string;
  status?: string;
  de?: string;
  ate?: string;
  pagina?: number;
  porPagina?: number;
}

export function listarCobrancas(
  filtros: FiltrosDeCobrancas,
  sinal?: AbortSignal,
): Promise<RespostaPaginada<Cobranca>> {
  return requisitar<RespostaPaginada<Cobranca>>('/cobrancas', { parametros: filtros, sinal });
}

export function obterTransicoesDeCobranca(
  id: string,
  sinal?: AbortSignal,
): Promise<DetalheDeCobranca> {
  return requisitar<DetalheDeCobranca>(`/cobrancas/${id}/transicoes`, { sinal });
}
