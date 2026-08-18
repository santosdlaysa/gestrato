import type { IndiceReajuste } from '../../../domain/contratos/tipos.js';
import type { DataCivil } from '../../../domain/value-objects/data-civil.js';
import type { AplicarReajuste } from './aplicar-reajuste.js';

export interface EntradaDoReajusteEmLote {
  readonly contratoIds: readonly string[];
  readonly indice: IndiceReajuste;
  readonly percentual: number;
  readonly aplicadoAPartirDe: DataCivil;
  readonly registradoPor: string | null;
}

export interface ItemDoReajuste {
  readonly contratoId: string;
  readonly resultado: 'REAJUSTADO' | 'FALHA';
  readonly parcelasAfetadas: number;
  readonly acrescimoTotalCentavos: number;
  readonly motivo?: string;
}

export interface SaidaDoReajusteEmLote {
  readonly processados: number;
  readonly totalParcelasAfetadas: number;
  readonly acrescimoTotalCentavos: number;
  readonly itens: readonly ItemDoReajuste[];
}

/**
 * Aplica o mesmo reajuste percentual a vários contratos de uma vez.
 *
 * Reaproveita `AplicarReajuste` (que só toca parcela pendente futura e registra
 * o histórico). Cada contrato é isolado: um que não tem parcela a reajustar vira
 * FALHA naquele item e o lote segue — nunca derruba os demais.
 */
export class ReajustarEmLote {
  constructor(private readonly aplicarReajuste: AplicarReajuste) {}

  async executar(entrada: EntradaDoReajusteEmLote): Promise<SaidaDoReajusteEmLote> {
    const itens: ItemDoReajuste[] = [];
    for (const contratoId of entrada.contratoIds) {
      try {
        const saida = await this.aplicarReajuste.executar({
          contratoId,
          indice: entrada.indice,
          percentual: entrada.percentual,
          aplicadoAPartirDe: entrada.aplicadoAPartirDe,
          registradoPor: entrada.registradoPor,
        });
        itens.push({
          contratoId,
          resultado: 'REAJUSTADO',
          parcelasAfetadas: saida.parcelasAfetadas,
          acrescimoTotalCentavos: saida.acrescimoTotal.centavos,
        });
      } catch (erro) {
        itens.push({
          contratoId,
          resultado: 'FALHA',
          parcelasAfetadas: 0,
          acrescimoTotalCentavos: 0,
          motivo: erro instanceof Error ? erro.message : String(erro),
        });
      }
    }

    return {
      processados: itens.length,
      totalParcelasAfetadas: itens.reduce((soma, item) => soma + item.parcelasAfetadas, 0),
      acrescimoTotalCentavos: itens.reduce((soma, item) => soma + item.acrescimoTotalCentavos, 0),
      itens,
    };
  }
}
