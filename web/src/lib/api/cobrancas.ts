import { requisitar, type Parametros } from '../http';
import type { RespostaPaginada } from '@/tipos/comum';
import type { Cobranca } from '@/tipos/cobranca';

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
