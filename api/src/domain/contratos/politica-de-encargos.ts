import { ErroDeValidacao } from '../shared/errors.js';
import { Dinheiro } from '../value-objects/dinheiro.js';
import { Percentual } from '../value-objects/percentual.js';

/** Dias usados como base do rateio de juros mensais para juros diarios. */
const DIAS_BASE_DO_MES = 30;

export interface Encargos {
  readonly multa: Dinheiro;
  readonly juros: Dinheiro;
  /** Dias corridos desde o vencimento — o que o cliente ve. */
  readonly diasDeAtraso: number;
  /** Dias efetivamente onerados, ja descontada a carencia. */
  readonly diasCobrados: number;
}

/**
 * Regra de mora do contrato: multa fixa sobre o saldo mais juros pro rata die.
 *
 * Convencao brasileira usual em loteamento — multa de 2% e juros de 1% ao mes
 * rateados por dia corrido (1% / 30 por dia). A carencia permite tolerar
 * atrasos curtos (fim de semana, feriado) sem cobrar encargo.
 */
export class PoliticaDeEncargos {
  private constructor(
    readonly multaPorAtraso: Percentual,
    readonly jurosAoMes: Percentual,
    readonly diasDeCarencia: number,
  ) {}

  static readonly PADRAO = new PoliticaDeEncargos(Percentual.de(2), Percentual.de(1), 0);

  static de(entrada: {
    multaPorAtraso: Percentual;
    jurosAoMes: Percentual;
    diasDeCarencia: number;
  }): PoliticaDeEncargos {
    if (!Number.isInteger(entrada.diasDeCarencia) || entrada.diasDeCarencia < 0) {
      throw new ErroDeValidacao('Dias de carencia deve ser inteiro nao negativo.');
    }
    if (entrada.diasDeCarencia > 90) {
      throw new ErroDeValidacao('Dias de carencia nao pode passar de 90.');
    }
    return new PoliticaDeEncargos(entrada.multaPorAtraso, entrada.jurosAoMes, entrada.diasDeCarencia);
  }

  /**
   * Dias de atraso cobraveis: dias corridos apos o vencimento, descontada a
   * carencia. Zero enquanto a carencia nao terminar.
   */
  diasCobraveis(diasCorridosDeAtraso: number): number {
    return Math.max(0, diasCorridosDeAtraso - this.diasDeCarencia);
  }

  /**
   * Multa incide uma unica vez sobre o saldo; juros incidem por dia cobravel.
   * Ambos calculados sobre o saldo devedor, nao sobre o valor original — quem
   * pagou parte da parcela so deve mora sobre o que falta.
   */
  calcular(saldoDevedor: Dinheiro, diasCorridosDeAtraso: number): Encargos {
    const diasDeAtraso = Math.max(0, diasCorridosDeAtraso);
    const diasCobrados = this.diasCobraveis(diasDeAtraso);

    if (diasCobrados <= 0 || !saldoDevedor.ehPositivo()) {
      return { multa: Dinheiro.ZERO, juros: Dinheiro.ZERO, diasDeAtraso, diasCobrados: 0 };
    }
    return {
      multa: saldoDevedor.multiplicarPor(this.multaPorAtraso.fator),
      juros: saldoDevedor.multiplicarPor((this.jurosAoMes.fator / DIAS_BASE_DO_MES) * diasCobrados),
      diasDeAtraso,
      diasCobrados,
    };
  }
}
