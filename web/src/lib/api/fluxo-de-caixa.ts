import { requisitar, type Parametros } from '../http';
import type {
  ContaBancaria,
  SocioAportador,
  EmpreendimentoFinanceiro,
  CategoriaFinanceira,
  NaturezaFinanceira,
  TipoLancamentoFinanceiro,
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
