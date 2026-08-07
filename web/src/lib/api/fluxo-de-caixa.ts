import { requisitar, type Parametros } from '../http';
import type {
  ContaBancaria,
  SocioAportador,
  EmpreendimentoFinanceiro,
  CategoriaFinanceira,
  NaturezaFinanceira,
  TipoLancamentoFinanceiro,
  FormaPagamento,
  LancamentoFinanceiro,
  RespostaDeLancamentos,
  Extrato,
  RespostaDeSaldos,
  Transferencia,
  OrcamentoFinanceiro,
  RespostaDeOrcamento,
  PainelFinanceiro,
  RespostaDeContasBancarias,
  RespostaDeSocios,
  RespostaDeEmpreendimentos,
  RespostaDeCategorias,
} from '@/tipos/fluxo-de-caixa';

export interface FiltrosDeCadastro extends Parametros {
  busca?: string;
  ativo?: string;
  pagina?: number;
  porPagina?: number;
}

// ---------------------------------------------------------------- contas bancarias

export interface EntradaDeContaBancaria {
  nome: string;
  instituicao?: string | null;
  agencia?: string | null;
  numero?: string | null;
  saldoInicialCentavos?: number;
  ativa?: boolean;
  observacoes?: string | null;
}

export function listarContasBancarias(filtros: FiltrosDeCadastro = {}, sinal?: AbortSignal): Promise<RespostaDeContasBancarias> {
  return requisitar<RespostaDeContasBancarias>('/contas-bancarias', { parametros: filtros, sinal });
}

export function criarContaBancaria(entrada: EntradaDeContaBancaria): Promise<ContaBancaria> {
  return requisitar<ContaBancaria>('/contas-bancarias', { metodo: 'POST', corpo: entrada });
}

export function atualizarContaBancaria(id: string, entrada: Partial<EntradaDeContaBancaria>): Promise<ContaBancaria> {
  return requisitar<ContaBancaria>(`/contas-bancarias/${id}`, { metodo: 'PUT', corpo: entrada });
}

// ------------------------------------------------------------------------- socios

export interface EntradaDeSocio {
  nome: string;
  documento?: string | null;
  ativo?: boolean;
  observacoes?: string | null;
}

export function listarSocios(filtros: FiltrosDeCadastro = {}, sinal?: AbortSignal): Promise<RespostaDeSocios> {
  return requisitar<RespostaDeSocios>('/socios-aportadores', { parametros: filtros, sinal });
}

export function criarSocio(entrada: EntradaDeSocio): Promise<SocioAportador> {
  return requisitar<SocioAportador>('/socios-aportadores', { metodo: 'POST', corpo: entrada });
}

export function atualizarSocio(id: string, entrada: Partial<EntradaDeSocio>): Promise<SocioAportador> {
  return requisitar<SocioAportador>(`/socios-aportadores/${id}`, { metodo: 'PUT', corpo: entrada });
}

// ------------------------------------------------------------------ empreendimentos

export interface EntradaDeEmpreendimento {
  nome: string;
  loteamentoId?: string | null;
  ativo?: boolean;
  observacoes?: string | null;
}

export function listarEmpreendimentos(filtros: FiltrosDeCadastro = {}, sinal?: AbortSignal): Promise<RespostaDeEmpreendimentos> {
  return requisitar<RespostaDeEmpreendimentos>('/empreendimentos-financeiros', { parametros: filtros, sinal });
}

export function criarEmpreendimento(entrada: EntradaDeEmpreendimento): Promise<EmpreendimentoFinanceiro> {
  return requisitar<EmpreendimentoFinanceiro>('/empreendimentos-financeiros', { metodo: 'POST', corpo: entrada });
}

export function atualizarEmpreendimento(id: string, entrada: Partial<EntradaDeEmpreendimento>): Promise<EmpreendimentoFinanceiro> {
  return requisitar<EmpreendimentoFinanceiro>(`/empreendimentos-financeiros/${id}`, { metodo: 'PUT', corpo: entrada });
}

// ------------------------------------------------------------------------ categorias

export interface FiltrosDeCategorias extends FiltrosDeCadastro {
  tipo?: TipoLancamentoFinanceiro;
  natureza?: NaturezaFinanceira;
}

export interface EntradaDeCategoria {
  nome: string;
  tipo: TipoLancamentoFinanceiro;
  natureza: NaturezaFinanceira;
  ordem?: number;
  ativa?: boolean;
  observacoes?: string | null;
}

export function listarCategorias(filtros: FiltrosDeCategorias = {}, sinal?: AbortSignal): Promise<RespostaDeCategorias> {
  return requisitar<RespostaDeCategorias>('/categorias-financeiras', { parametros: filtros, sinal });
}

export function criarCategoria(entrada: EntradaDeCategoria): Promise<CategoriaFinanceira> {
  return requisitar<CategoriaFinanceira>('/categorias-financeiras', { metodo: 'POST', corpo: entrada });
}

export function atualizarCategoria(id: string, entrada: Partial<EntradaDeCategoria>): Promise<CategoriaFinanceira> {
  return requisitar<CategoriaFinanceira>(`/categorias-financeiras/${id}`, { metodo: 'PUT', corpo: entrada });
}

// ----------------------------------------------------------------- lancamentos

export interface FiltrosDeLancamentos extends Parametros {
  contaBancariaId?: string;
  categoriaId?: string;
  empreendimentoFinanceiroId?: string;
  socioAportadorId?: string;
  tipo?: TipoLancamentoFinanceiro;
  natureza?: NaturezaFinanceira;
  de?: string;
  ate?: string;
  busca?: string;
  pagina?: number;
  porPagina?: number;
}

export interface EntradaDeLancamento {
  tipo?: TipoLancamentoFinanceiro;
  data: string;
  valorCentavos: number;
  descricao: string;
  numeroDocumento?: string | null;
  formaPagamento?: FormaPagamento | null;
  contaBancariaId: string;
  categoriaId?: string | null;
  empreendimentoFinanceiroId?: string | null;
  socioAportadorId?: string | null;
  observacoes?: string | null;
}

export function listarLancamentos(filtros: FiltrosDeLancamentos = {}, sinal?: AbortSignal): Promise<RespostaDeLancamentos> {
  return requisitar<RespostaDeLancamentos>('/lancamentos', { parametros: filtros, sinal });
}

export function criarLancamento(entrada: EntradaDeLancamento): Promise<LancamentoFinanceiro> {
  return requisitar<LancamentoFinanceiro>('/lancamentos', { metodo: 'POST', corpo: entrada });
}

export function atualizarLancamento(id: string, entrada: Partial<EntradaDeLancamento>): Promise<LancamentoFinanceiro> {
  return requisitar<LancamentoFinanceiro>(`/lancamentos/${id}`, { metodo: 'PUT', corpo: entrada });
}

export function excluirLancamento(id: string): Promise<void> {
  return requisitar<void>(`/lancamentos/${id}`, { metodo: 'DELETE' });
}

// -------------------------------------------------------------- transferencias

export interface EntradaDeTransferencia {
  contaOrigemId: string;
  contaDestinoId: string;
  data: string;
  valorCentavos: number;
  descricao?: string | null;
  numeroDocumento?: string | null;
  empreendimentoFinanceiroId?: string | null;
  observacoes?: string | null;
}

export function criarTransferencia(entrada: EntradaDeTransferencia): Promise<Transferencia> {
  return requisitar<Transferencia>('/transferencias', { metodo: 'POST', corpo: entrada });
}

// ------------------------------------------------------------- extrato / saldos

export interface FiltrosDeExtrato extends Parametros {
  contaBancariaId: string;
  de?: string;
  ate?: string;
}

export function obterExtrato(filtros: FiltrosDeExtrato, sinal?: AbortSignal): Promise<Extrato> {
  return requisitar<Extrato>('/extrato', { parametros: filtros, sinal });
}

export function listarSaldos(sinal?: AbortSignal): Promise<RespostaDeSaldos> {
  return requisitar<RespostaDeSaldos>('/contas-bancarias/saldos', { sinal });
}

// ------------------------------------------------------------------- orcamento

export interface FiltrosDeOrcamento extends Parametros {
  ano?: number;
  empreendimentoFinanceiroId?: string;
  natureza?: NaturezaFinanceira;
}

export interface EntradaDeOrcamento {
  categoriaId: string;
  empreendimentoFinanceiroId: string;
  ano: number;
  mes: number;
  valorPrevistoCentavos: number;
}

export function listarOrcamento(filtros: FiltrosDeOrcamento, sinal?: AbortSignal): Promise<RespostaDeOrcamento> {
  return requisitar<RespostaDeOrcamento>('/orcamentos', { parametros: filtros, sinal });
}

/** Upsert de uma célula. Valor zero apaga a linha (a API responde 204). */
export function salvarOrcamento(entrada: EntradaDeOrcamento): Promise<OrcamentoFinanceiro | void> {
  return requisitar<OrcamentoFinanceiro | void>('/orcamentos', { metodo: 'PUT', corpo: entrada });
}

// -------------------------------------------------------- painel orçado × real

export interface FiltrosDePainel extends Parametros {
  ano?: number;
  empreendimentoFinanceiroId?: string;
}

export function obterPainel(filtros: FiltrosDePainel, sinal?: AbortSignal): Promise<PainelFinanceiro> {
  return requisitar<PainelFinanceiro>('/painel', { parametros: filtros, sinal });
}
