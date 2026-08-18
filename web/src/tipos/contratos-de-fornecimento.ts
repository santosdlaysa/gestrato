import type { RespostaPaginada } from './comum';

export type SituacaoDaEmpresa = 'CONTRATANTE' | 'CONTRATADA';
export type TipoDeItemContrato = 'SERVICO' | 'INSUMO';

export const SITUACOES_DA_EMPRESA: SituacaoDaEmpresa[] = ['CONTRATANTE', 'CONTRATADA'];
export const TIPOS_DE_ITEM: TipoDeItemContrato[] = ['SERVICO', 'INSUMO'];

/** Fornecedor resumido, como vem embutido no contrato. */
export interface FornecedorResumo {
  id: string;
  nome: string;
}

export interface ContratoDeFornecimento {
  id: string;
  numero: string;
  documento: string | null;
  situacaoDaEmpresa: SituacaoDaEmpresa;
  tipoDeItem: TipoDeItemContrato;
  objeto: string;
  empresa: string | null;
  fornecedorId: string | null;
  fornecedor: FornecedorResumo | null;
  tipoDoContrato: string | null;
  responsavel: string | null;
  dataDoContrato: string | null;
  dataBase: string | null;
  dataDeInicio: string | null;
  dataDeTermino: string | null;
  valorCentavos: number | null;
  observacaoInterna: string | null;
  ativo: boolean;
}

/** Corpo enviado para criar/atualizar. Datas em "AAAA-MM-DD" (ou null). */
export interface EntradaDeContratoDeFornecimento {
  numero: string;
  documento?: string | null;
  situacaoDaEmpresa: SituacaoDaEmpresa;
  tipoDeItem: TipoDeItemContrato;
  objeto: string;
  empresa?: string | null;
  fornecedorId?: string | null;
  tipoDoContrato?: string | null;
  responsavel?: string | null;
  dataDoContrato?: string | null;
  dataBase?: string | null;
  dataDeInicio?: string | null;
  dataDeTermino?: string | null;
  valorCentavos?: number | null;
  observacaoInterna?: string | null;
  ativo: boolean;
}

export type RespostaDeContratosDeFornecimento = RespostaPaginada<ContratoDeFornecimento>;
