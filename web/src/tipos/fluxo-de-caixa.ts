import type { RespostaPaginada } from './comum';

export type TipoLancamentoFinanceiro = 'ENTRADA' | 'SAIDA';

export type NaturezaFinanceira =
  | 'RECEBIVEL_VENDA'
  | 'APORTE'
  | 'TRANSFERENCIA'
  | 'DESPESA_FIXA'
  | 'DESPESA_VARIAVEL'
  | 'CUSTO_OBRA'
  | 'OUTRO';

export interface ContaBancaria {
  id: string;
  nome: string;
  instituicao: string | null;
  agencia: string | null;
  numero: string | null;
  saldoInicialCentavos: number;
  ativa: boolean;
  observacoes: string | null;
}

export interface SocioAportador {
  id: string;
  nome: string;
  documento: string | null;
  ativo: boolean;
  observacoes: string | null;
}

export interface EmpreendimentoFinanceiro {
  id: string;
  nome: string;
  loteamentoId: string | null;
  ativo: boolean;
  observacoes: string | null;
  loteamento: { id: string; nome: string } | null;
}

export interface CategoriaFinanceira {
  id: string;
  nome: string;
  tipo: TipoLancamentoFinanceiro;
  natureza: NaturezaFinanceira;
  ordem: number;
  ativa: boolean;
  observacoes: string | null;
}

export type RespostaDeContasBancarias = RespostaPaginada<ContaBancaria>;
export type RespostaDeSocios = RespostaPaginada<SocioAportador>;
export type RespostaDeEmpreendimentos = RespostaPaginada<EmpreendimentoFinanceiro>;
export type RespostaDeCategorias = RespostaPaginada<CategoriaFinanceira>;
