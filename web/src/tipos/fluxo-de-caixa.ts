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

// ---------------------------------------------------------------- lancamentos

export type FormaPagamento = 'DINHEIRO' | 'PIX' | 'BOLETO' | 'TRANSFERENCIA' | 'CARTAO' | 'CHEQUE' | 'PERMUTA';

export interface ReferenciaNomeada {
  id: string;
  nome: string;
}

export interface CategoriaResumida {
  id: string;
  nome: string;
  tipo: TipoLancamentoFinanceiro;
  natureza: NaturezaFinanceira;
}

/** Um lancamento realizado, com o contexto (conta/categoria/etc.) da leitura. */
export interface LancamentoFinanceiro {
  id: string;
  tipo: TipoLancamentoFinanceiro;
  data: string;
  valorCentavos: number;
  descricao: string;
  numeroDocumento: string | null;
  formaPagamento: FormaPagamento | null;
  conciliadoEm: string | null;
  contaBancariaId: string;
  categoriaId: string | null;
  empreendimentoFinanceiroId: string | null;
  socioAportadorId: string | null;
  transferenciaId: string | null;
  observacoes: string | null;
  contaBancaria: ReferenciaNomeada;
  categoria: CategoriaResumida | null;
  empreendimentoFinanceiro: ReferenciaNomeada | null;
  socioAportador: ReferenciaNomeada | null;
}

export interface ResumoDeMovimentacoes {
  totalEntradasCentavos: number;
  totalSaidasCentavos: number;
  saldoDoPeriodoCentavos: number;
}

export interface RespostaDeLancamentos extends RespostaPaginada<LancamentoFinanceiro> {
  resumo: ResumoDeMovimentacoes;
}

/** Uma linha do extrato: o lancamento mais o saldo corrente apos ele. */
export interface LinhaDeExtrato extends LancamentoFinanceiro {
  saldoCentavos: number;
}

export interface Extrato {
  conta: { id: string; nome: string; instituicao: string | null; agencia: string | null; numero: string | null };
  saldoInicialCentavos: number;
  saldoAnteriorCentavos: number;
  linhas: LinhaDeExtrato[];
  saldoFinalCentavos: number;
}

export interface SaldoDeConta {
  id: string;
  nome: string;
  instituicao: string | null;
  saldoInicialCentavos: number;
  entradasCentavos: number;
  saidasCentavos: number;
  saldoAtualCentavos: number;
}

export interface RespostaDeSaldos {
  itens: SaldoDeConta[];
}

export interface Transferencia {
  transferenciaId: string;
  saida: LancamentoFinanceiro;
  entrada: LancamentoFinanceiro;
}

// ------------------------------------------------------------------- orcamento

export interface OrcamentoFinanceiro {
  id: string;
  categoriaId: string;
  empreendimentoFinanceiroId: string;
  ano: number;
  mes: number;
  valorPrevistoCentavos: number;
  categoria: CategoriaResumida;
  empreendimentoFinanceiro: ReferenciaNomeada;
}

export interface RespostaDeOrcamento {
  ano: number;
  itens: OrcamentoFinanceiro[];
}

// ---------------------------------------------------------- painel orçado×real

export interface LinhaDoPainel {
  categoriaId: string;
  categoria: string;
  tipo: TipoLancamentoFinanceiro;
  previstoCentavos: number;
  realizadoCentavos: number;
}

export interface GrupoDoPainel {
  natureza: NaturezaFinanceira;
  ehReceita: boolean;
  previstoCentavos: number;
  realizadoCentavos: number;
  linhas: LinhaDoPainel[];
}

export interface TotaisDoPainel {
  receitasPrevistoCentavos: number;
  receitasRealizadoCentavos: number;
  despesasPrevistoCentavos: number;
  despesasRealizadoCentavos: number;
  resultadoPrevistoCentavos: number;
  resultadoRealizadoCentavos: number;
}

export interface PainelFinanceiro {
  ano: number;
  empreendimentoFinanceiroId: string | null;
  grupos: GrupoDoPainel[];
  totais: TotaisDoPainel;
}
