import { reaisParaCentavos } from './dinheiro';
import type { EntradaDeContrato } from '@/tipos/contrato';
import type { Periodicidade } from '@/tipos/comum';

export interface FormularioDeContrato {
  numero: string;
  clienteId: string;
  loteamentoId: string;
  loteId: string;
  corretorId: string;
  valorTotal: string;
  valorEntrada: string;
  dataEntrada: string;
  formaPagamentoEntrada: string;
  quantidadeDeParcelas: string;
  valorDaParcela: string;
  primeiroVencimento: string;
  periodicidade: Periodicidade;
  multaPorAtrasoPercentual: string;
  jurosAoMesPercentual: string;
  diasDeCarencia: string;
  indiceReajuste: string;
  dataAssinatura: string;
  observacoes: string;
}

export const FORMULARIO_INICIAL: FormularioDeContrato = {
  numero: '',
  clienteId: '',
  loteamentoId: '',
  loteId: '',
  corretorId: '',
  valorTotal: '',
  valorEntrada: '0,00',
  dataEntrada: '',
  formaPagamentoEntrada: 'PIX',
  quantidadeDeParcelas: '120',
  valorDaParcela: '',
  primeiroVencimento: '',
  periodicidade: 'MENSAL',
  multaPorAtrasoPercentual: '2',
  jurosAoMesPercentual: '1',
  diasDeCarencia: '0',
  indiceReajuste: 'IGPM',
  dataAssinatura: '',
  observacoes: '',
};

function numero(texto: string): number {
  const convertido = Number(texto.replace(',', '.'));
  return Number.isFinite(convertido) ? convertido : 0;
}

export function montarEntradaDeContrato(formulario: FormularioDeContrato): EntradaDeContrato {
  return {
    numero: formulario.numero.trim(),
    clienteId: formulario.clienteId,
    loteId: formulario.loteId,
    corretorId: formulario.corretorId || null,
    valorTotalCentavos: reaisParaCentavos(formulario.valorTotal) ?? 0,
    valorEntradaCentavos: reaisParaCentavos(formulario.valorEntrada) ?? 0,
    dataEntrada: formulario.dataEntrada || null,
    formaPagamentoEntrada: formulario.formaPagamentoEntrada || null,
    quantidadeDeParcelas: numero(formulario.quantidadeDeParcelas),
    valorDaParcelaCentavos: reaisParaCentavos(formulario.valorDaParcela),
    primeiroVencimento: formulario.primeiroVencimento,
    periodicidade: formulario.periodicidade,
    multaPorAtrasoPercentual: numero(formulario.multaPorAtrasoPercentual),
    jurosAoMesPercentual: numero(formulario.jurosAoMesPercentual),
    diasDeCarencia: numero(formulario.diasDeCarencia),
    indiceReajuste: formulario.indiceReajuste || null,
    dataAssinatura: formulario.dataAssinatura || null,
    observacoes: formulario.observacoes.trim() || null,
  };
}

/** A simulação só faz sentido com valor, quantidade de parcelas e 1º vencimento. */
export function podeSimular(formulario: FormularioDeContrato): boolean {
  const total = reaisParaCentavos(formulario.valorTotal) ?? 0;
  return (
    total > 0 && numero(formulario.quantidadeDeParcelas) > 0 && Boolean(formulario.primeiroVencimento)
  );
}

export function faltamCamposObrigatorios(formulario: FormularioDeContrato): string | null {
  if (!formulario.numero.trim()) return 'Informe o número do contrato.';
  if (!formulario.clienteId) return 'Selecione o cliente.';
  if (!formulario.loteId) return 'Selecione o lote.';
  if (!podeSimular(formulario)) return 'Informe valor total, parcelas e primeiro vencimento.';
  return null;
}
