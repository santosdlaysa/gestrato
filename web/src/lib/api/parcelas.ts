import { requisitar, type Parametros } from '../http';
import type { RespostaPaginada } from '@/tipos/comum';
import type {
  DocumentoDeCobranca,
  EntradaDeBaixa,
  ParcelaDeCobranca,
  TipoDeDocumento,
} from '@/tipos/parcela';

export interface FiltrosDeParcelas extends Parametros {
  situacao?: string;
  de?: string;
  ate?: string;
  contratoId?: string;
  clienteId?: string;
  loteamentoId?: string;
  pagina?: number;
  porPagina?: number;
}

export function listarParcelas(
  filtros: FiltrosDeParcelas,
  sinal?: AbortSignal,
): Promise<RespostaPaginada<ParcelaDeCobranca>> {
  return requisitar<RespostaPaginada<ParcelaDeCobranca>>('/parcelas', {
    parametros: filtros,
    sinal,
  });
}

export function buscarParcela(id: string, sinal?: AbortSignal): Promise<ParcelaDeCobranca> {
  return requisitar<ParcelaDeCobranca>(`/parcelas/${id}`, { sinal });
}

export function darBaixa(id: string, entrada: EntradaDeBaixa): Promise<unknown> {
  return requisitar(`/parcelas/${id}/baixa`, { metodo: 'POST', corpo: entrada });
}

export function estornar(id: string): Promise<unknown> {
  return requisitar(`/parcelas/${id}/estorno`, { metodo: 'POST', corpo: {} });
}

export function emitirDocumento(id: string, tipo: TipoDeDocumento): Promise<DocumentoDeCobranca> {
  return requisitar<DocumentoDeCobranca>(`/parcelas/${id}/documentos`, {
    metodo: 'POST',
    corpo: { tipo },
  });
}

export function reemitirDocumento(id: string, tipo: TipoDeDocumento): Promise<DocumentoDeCobranca> {
  return requisitar<DocumentoDeCobranca>(`/parcelas/${id}/documentos/reemitir`, {
    metodo: 'POST',
    corpo: { tipo },
  });
}

export function listarDocumentos(
  id: string,
  sinal?: AbortSignal,
): Promise<DocumentoDeCobranca[] | RespostaPaginada<DocumentoDeCobranca>> {
  return requisitar(`/parcelas/${id}/documentos`, { sinal });
}

export function cobrarAgora(
  id: string,
  canal?: string,
  modelo?: string,
): Promise<unknown> {
  return requisitar(`/parcelas/${id}/cobrar`, {
    metodo: 'POST',
    corpo: { canal: canal || undefined, modelo: modelo || undefined },
  });
}
