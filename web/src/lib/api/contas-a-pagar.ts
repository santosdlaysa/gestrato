import { requisitar, type Parametros } from '../http';
import type { ContaAPagar, RespostaDeContasAPagar, StatusContaAPagar } from '@/tipos/contas-a-pagar';
import type { Fornecedor, EntradaDeFornecedor, RespostaDeFornecedores } from '@/tipos/contas-a-pagar';

export interface FiltrosDeContasAPagar extends Parametros {
  busca?: string;
  status?: StatusContaAPagar;
  fornecedorId?: string;
  de?: string;
  ate?: string;
  pagina?: number;
  porPagina?: number;
}

export function listarContasAPagar(
  filtros: FiltrosDeContasAPagar,
  sinal?: AbortSignal,
): Promise<RespostaDeContasAPagar> {
  return requisitar<RespostaDeContasAPagar>('/contas-a-pagar', { parametros: filtros, sinal });
}

export interface FiltrosDeFornecedores extends Parametros {
  busca?: string;
  ativo?: string;
  pagina?: number;
  porPagina?: number;
}

export function listarFornecedores(
  filtros: FiltrosDeFornecedores = {},
  sinal?: AbortSignal,
): Promise<RespostaDeFornecedores> {
  return requisitar<RespostaDeFornecedores>('/fornecedores', { parametros: filtros, sinal });
}

export interface EntradaDeContaAPagar {
  fornecedorId?: string | null;
  numeroDocumento?: string | null;
  descricao?: string | null;
  valorOriginalCentavos: number;
  vencimento: string;
  formaPagamento?: string | null;
  observacoes?: string | null;
}

export function criarContaAPagar(entrada: EntradaDeContaAPagar): Promise<ContaAPagar> {
  return requisitar<ContaAPagar>('/contas-a-pagar', { metodo: 'POST', corpo: entrada });
}

export function baixarContaAPagar(
  id: string,
  entrada: { valorCentavos: number; pagoEm: string; formaPagamento?: string },
): Promise<unknown> {
  return requisitar(`/contas-a-pagar/${id}/baixa`, { metodo: 'POST', corpo: entrada });
}

export function criarFornecedor(entrada: EntradaDeFornecedor): Promise<Fornecedor> {
  return requisitar<Fornecedor>('/fornecedores', { metodo: 'POST', corpo: entrada });
}

export function atualizarFornecedor(id: string, entrada: EntradaDeFornecedor): Promise<Fornecedor> {
  return requisitar<Fornecedor>(`/fornecedores/${id}`, { metodo: 'PUT', corpo: entrada });
}
