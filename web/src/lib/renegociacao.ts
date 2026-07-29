import { somarPeriodos } from './datas';
import { valorAtualizadoCentavos } from './parcela';
import type { ParcelaDeCobranca } from '@/tipos/parcela';

export interface ParcelaDaPrevia {
  numero: number;
  vencimento: string;
  valorCentavos: number;
}

export function calcularSaldoRenegociado(
  parcelas: ParcelaDeCobranca[],
  incluirEncargos: boolean,
): number {
  return parcelas.reduce(
    (soma, parcela) =>
      soma + (incluirEncargos ? valorAtualizadoCentavos(parcela) : parcela.valorOriginalCentavos),
    0,
  );
}

/**
 * Prévia local do novo plano — só divisão inteira de centavos; a sobra vai
 * para a primeira parcela, como a API costuma fazer.
 */
export function montarPreviaDoAcordo(
  saldoCentavos: number,
  descontoCentavos: number,
  entradaCentavos: number,
  quantidade: number,
  primeiroVencimento: string,
  periodicidade: string,
): ParcelaDaPrevia[] {
  const aParcelar = saldoCentavos - descontoCentavos - entradaCentavos;
  if (quantidade <= 0 || aParcelar <= 0 || !primeiroVencimento) return [];

  const base = Math.floor(aParcelar / quantidade);
  const sobra = aParcelar - base * quantidade;

  return Array.from({ length: quantidade }, (_, indice) => ({
    numero: indice + 1,
    vencimento: somarPeriodos(primeiroVencimento, periodicidade, indice),
    valorCentavos: indice === 0 ? base + sobra : base,
  }));
}
