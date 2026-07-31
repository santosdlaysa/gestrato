import { requisitar, type Parametros } from '../http';
import type { RespostaPaginada } from '@/tipos/comum';
import type {
  Cliente,
  Corretor,
  EntradaDeCliente,
  Lote,
  Loteamento,
} from '@/tipos/cadastros';

export interface FiltrosDeClientes extends Parametros {
  busca?: string;
  ativo?: string;
  pagina?: number;
  porPagina?: number;
}

export function listarClientes(
  filtros: FiltrosDeClientes,
  sinal?: AbortSignal,
): Promise<RespostaPaginada<Cliente>> {
  return requisitar<RespostaPaginada<Cliente>>('/clientes', { parametros: filtros, sinal });
}

export function criarCliente(entrada: EntradaDeCliente): Promise<Cliente> {
  return requisitar<Cliente>('/clientes', { metodo: 'POST', corpo: entrada });
}

export function atualizarCliente(id: string, entrada: EntradaDeCliente): Promise<Cliente> {
  return requisitar<Cliente>(`/clientes/${id}`, { metodo: 'PUT', corpo: entrada });
}

export interface FiltrosDeLotes extends Parametros {
  loteamentoId?: string;
  quadraId?: string;
  situacao?: string;
  pagina?: number;
  porPagina?: number;
}

export function listarLotes(
  filtros: FiltrosDeLotes,
  sinal?: AbortSignal,
): Promise<RespostaPaginada<Lote>> {
  return requisitar<RespostaPaginada<Lote>>('/lotes', { parametros: filtros, sinal });
}

export function criarLote(entrada: Partial<Lote>): Promise<Lote> {
  return requisitar<Lote>('/lotes', { metodo: 'POST', corpo: entrada });
}

export function atualizarLote(id: string, entrada: Partial<Lote>): Promise<Lote> {
  return requisitar<Lote>(`/lotes/${id}`, { metodo: 'PUT', corpo: entrada });
}

export function listarLoteamentos(
  sinal?: AbortSignal,
): Promise<Loteamento[] | RespostaPaginada<Loteamento>> {
  return requisitar('/loteamentos', { parametros: { porPagina: 200 }, sinal });
}

export interface EntradaDeLoteamento {
  nome: string;
  cidade: string;
  uf: string;
  registroImobiliario?: string | null;
}

export function criarLoteamento(entrada: EntradaDeLoteamento): Promise<Loteamento> {
  return requisitar<Loteamento>('/loteamentos', { metodo: 'POST', corpo: entrada });
}

export interface Quadra {
  id: string;
  loteamentoId: string;
  nome: string;
}

export function listarQuadras(loteamentoId: string, sinal?: AbortSignal): Promise<Quadra[]> {
  return requisitar<Quadra[]>(`/loteamentos/${loteamentoId}/quadras`, { sinal });
}

export function criarQuadra(loteamentoId: string, nome: string): Promise<Quadra> {
  return requisitar<Quadra>(`/loteamentos/${loteamentoId}/quadras`, {
    metodo: 'POST',
    corpo: { nome },
  });
}

export function listarCorretores(
  sinal?: AbortSignal,
): Promise<Corretor[] | RespostaPaginada<Corretor>> {
  return requisitar('/corretores', { parametros: { porPagina: 200 }, sinal });
}
