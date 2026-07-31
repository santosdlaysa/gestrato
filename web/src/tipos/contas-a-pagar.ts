import type { RespostaPaginada } from './comum';

export type StatusContaAPagar = 'PENDENTE' | 'PAGA' | 'PAGA_PARCIAL' | 'CANCELADA';

export interface ContaAPagar {
  id: string;
  origemSiengeId: string | null;
  numeroDocumento: string | null;
  descricao: string | null;
  valorOriginalCentavos: number;
  valorPagoCentavos: number;
  jurosCentavos: number;
  multaCentavos: number;
  descontoCentavos: number;
  vencimento: string;
  status: StatusContaAPagar;
  pagoEm: string | null;
  formaPagamento: string | null;
  observacoes: string | null;
  fornecedor: { id: string; nome: string } | null;
}

export type RespostaDeContasAPagar = RespostaPaginada<ContaAPagar>;

export interface Fornecedor {
  id: string;
  nome: string;
  documento: string | null;
  email: string | null;
  telefone: string | null;
  ativo: boolean;
  observacoes: string | null;
}

export interface EntradaDeFornecedor {
  nome: string;
  documento?: string | null;
  email?: string | null;
  telefone?: string | null;
  ativo: boolean;
  observacoes?: string | null;
}

export type RespostaDeFornecedores = RespostaPaginada<Fornecedor>;
