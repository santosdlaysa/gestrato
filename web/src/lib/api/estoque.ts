import { requisitar, type Parametros } from '../http';
import type { RespostaDeSaldosDeEstoque } from '@/tipos/estoque';

export interface FiltrosDeSaldoEstoque extends Parametros {
  busca?: string;
  pagina?: number;
  porPagina?: number;
}

export function listarSaldosDeEstoque(filtros: FiltrosDeSaldoEstoque = {}, sinal?: AbortSignal): Promise<RespostaDeSaldosDeEstoque> {
  return requisitar<RespostaDeSaldosDeEstoque>('/estoque/saldos', { parametros: filtros, sinal });
}
