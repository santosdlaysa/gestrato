import { requisitar, type Parametros } from '../http';
import type {
  ContratoDeFornecimento,
  EntradaDeContratoDeFornecimento,
  RespostaDeContratosDeFornecimento,
  SituacaoDaEmpresa,
  TipoDeItemContrato,
} from '@/tipos/contratos-de-fornecimento';

export interface FiltrosDeContratosDeFornecimento extends Parametros {
  busca?: string;
  ativo?: string;
  situacaoDaEmpresa?: SituacaoDaEmpresa;
  tipoDeItem?: TipoDeItemContrato;
  fornecedorId?: string;
  pagina?: number;
  porPagina?: number;
}

export function listarContratosDeFornecimento(
  filtros: FiltrosDeContratosDeFornecimento = {},
  sinal?: AbortSignal,
): Promise<RespostaDeContratosDeFornecimento> {
  return requisitar<RespostaDeContratosDeFornecimento>('/contratos-de-fornecimento', {
    parametros: filtros,
    sinal,
  });
}

export function criarContratoDeFornecimento(
  entrada: EntradaDeContratoDeFornecimento,
): Promise<ContratoDeFornecimento> {
  return requisitar<ContratoDeFornecimento>('/contratos-de-fornecimento', {
    metodo: 'POST',
    corpo: entrada,
  });
}

export function atualizarContratoDeFornecimento(
  id: string,
  entrada: EntradaDeContratoDeFornecimento,
): Promise<ContratoDeFornecimento> {
  return requisitar<ContratoDeFornecimento>(`/contratos-de-fornecimento/${id}`, {
    metodo: 'PUT',
    corpo: entrada,
  });
}
