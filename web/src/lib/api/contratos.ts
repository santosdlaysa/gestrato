import { requisitar, type Parametros } from '../http';
import type { RespostaPaginada } from '@/tipos/comum';
import type {
  Contrato,
  EntradaDeContrato,
  EntradaDeReajuste,
  EntradaDeRenegociacao,
  Extrato,
  Renegociacao,
  SimulacaoDeContrato,
} from '@/tipos/contrato';

export interface FiltrosDeContratos extends Parametros {
  busca?: string;
  status?: string;
  situacao?: string;
  clienteId?: string;
  loteamentoId?: string;
  pagina?: number;
  porPagina?: number;
}

export function listarContratos(
  filtros: FiltrosDeContratos,
  sinal?: AbortSignal,
): Promise<RespostaPaginada<Contrato>> {
  return requisitar<RespostaPaginada<Contrato>>('/contratos', { parametros: filtros, sinal });
}

export function buscarContrato(id: string, sinal?: AbortSignal): Promise<Contrato> {
  return requisitar<Contrato>(`/contratos/${id}`, { sinal });
}

export function buscarExtrato(id: string, data?: string, sinal?: AbortSignal): Promise<Extrato> {
  return requisitar<Extrato>(`/contratos/${id}/extrato`, { parametros: { data }, sinal });
}

export function simularContrato(
  entrada: EntradaDeContrato,
  sinal?: AbortSignal,
): Promise<SimulacaoDeContrato> {
  return requisitar<SimulacaoDeContrato>('/contratos/simular', {
    metodo: 'POST',
    corpo: entrada,
    sinal,
  });
}

export function criarContrato(entrada: EntradaDeContrato): Promise<Contrato> {
  return requisitar<Contrato>('/contratos', { metodo: 'POST', corpo: entrada });
}

export function atualizarContrato(
  id: string,
  campos: { observacoes?: string | null; politicaDeEncargos?: unknown },
): Promise<Contrato> {
  return requisitar<Contrato>(`/contratos/${id}`, { metodo: 'PATCH', corpo: campos });
}

export function quitarContrato(id: string): Promise<unknown> {
  return requisitar(`/contratos/${id}/quitar`, { metodo: 'POST', corpo: {} });
}

export function cancelarContrato(id: string): Promise<unknown> {
  return requisitar(`/contratos/${id}/cancelar`, { metodo: 'POST', corpo: {} });
}

export function distratarContrato(id: string): Promise<unknown> {
  return requisitar(`/contratos/${id}/distratar`, { metodo: 'POST', corpo: {} });
}

export function aplicarReajuste(id: string, entrada: EntradaDeReajuste): Promise<unknown> {
  return requisitar(`/contratos/${id}/reajuste`, { metodo: 'POST', corpo: entrada });
}

export function renegociar(id: string, entrada: EntradaDeRenegociacao): Promise<unknown> {
  return requisitar(`/contratos/${id}/renegociar`, { metodo: 'POST', corpo: entrada });
}

export function listarRenegociacoes(
  id: string,
  sinal?: AbortSignal,
): Promise<Renegociacao[] | RespostaPaginada<Renegociacao>> {
  return requisitar(`/contratos/${id}/renegociacoes`, { sinal });
}
