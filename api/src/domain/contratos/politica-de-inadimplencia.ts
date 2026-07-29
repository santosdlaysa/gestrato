import { ErroDeValidacao } from '../shared/errors.js';

/**
 * Como o atraso escalona, do esquecimento ate a perda do lote.
 *
 * Separar "em atraso" de "inadimplente" nao e preciosismo de nomenclatura: um
 * cliente que esqueceu o boleto por tres dias nao pode entrar na mesma lista de
 * quem parou de pagar. Tratar os dois igual desgasta o bom pagador e esconde o
 * problema real no meio do ruido.
 */
export const SITUACOES_DE_ATRASO = ['EM_DIA', 'EM_ATRASO', 'INADIMPLENTE', 'SUJEITO_A_RETOMADA'] as const;
export type SituacaoDeAtraso = (typeof SITUACOES_DE_ATRASO)[number];

interface EntradaDaPolitica {
  /** A partir deste dia de atraso o contrato passa a contar como inadimplente. */
  diasParaInadimplencia: number;
  /** A partir deste dia o lote fica sujeito a retomada pela loteadora. */
  diasParaRetomadaDoLote: number;
}

export class PoliticaDeInadimplencia {
  private constructor(
    readonly diasParaInadimplencia: number,
    readonly diasParaRetomadaDoLote: number,
  ) {}

  /** 8 dias para inadimplencia, 3 meses para retomada do lote. */
  static readonly PADRAO = new PoliticaDeInadimplencia(8, 90);

  static de(entrada: EntradaDaPolitica): PoliticaDeInadimplencia {
    const { diasParaInadimplencia, diasParaRetomadaDoLote } = entrada;

    if (!Number.isInteger(diasParaInadimplencia) || diasParaInadimplencia < 1) {
      throw new ErroDeValidacao('Dias para inadimplencia deve ser inteiro maior que zero.');
    }
    if (!Number.isInteger(diasParaRetomadaDoLote) || diasParaRetomadaDoLote < 1) {
      throw new ErroDeValidacao('Dias para retomada do lote deve ser inteiro maior que zero.');
    }
    if (diasParaRetomadaDoLote <= diasParaInadimplencia) {
      throw new ErroDeValidacao(
        `A retomada do lote (${diasParaRetomadaDoLote} dias) precisa vir depois da inadimplencia (${diasParaInadimplencia} dias).`,
      );
    }
    if (diasParaRetomadaDoLote > 3650) {
      throw new ErroDeValidacao('Dias para retomada do lote nao pode passar de 3650.');
    }
    return new PoliticaDeInadimplencia(diasParaInadimplencia, diasParaRetomadaDoLote);
  }

  /**
   * Em que degrau da escala o contrato esta, pelo maior atraso entre suas
   * parcelas. Um contrato com uma parcela de 100 dias e outra de 2 esta sujeito
   * a retomada — vale sempre o pior caso.
   */
  classificar(diasDeAtrasoMaximo: number): SituacaoDeAtraso {
    if (diasDeAtrasoMaximo <= 0) return 'EM_DIA';
    if (diasDeAtrasoMaximo >= this.diasParaRetomadaDoLote) return 'SUJEITO_A_RETOMADA';
    if (diasDeAtrasoMaximo >= this.diasParaInadimplencia) return 'INADIMPLENTE';
    return 'EM_ATRASO';
  }

  /** Dias restantes ate o lote ficar sujeito a retomada. Zero quando ja passou. */
  diasAteARetomada(diasDeAtrasoMaximo: number): number {
    return Math.max(0, this.diasParaRetomadaDoLote - Math.max(0, diasDeAtrasoMaximo));
  }

  /**
   * Se hoje e exatamente o dia em que o contrato cruzou um marco.
   *
   * A comparacao e por igualdade, e nao por "maior ou igual", porque isto
   * alimenta alerta: avisar todo dia que o contrato continua inadimplente vira
   * ruido e a equipe para de ler. Avisa-se na virada.
   */
  cruzouInadimplenciaHoje(diasDeAtrasoMaximo: number): boolean {
    return diasDeAtrasoMaximo === this.diasParaInadimplencia;
  }

  cruzouRetomadaHoje(diasDeAtrasoMaximo: number): boolean {
    return diasDeAtrasoMaximo === this.diasParaRetomadaDoLote;
  }

  paraEstado(): Readonly<EntradaDaPolitica> {
    return {
      diasParaInadimplencia: this.diasParaInadimplencia,
      diasParaRetomadaDoLote: this.diasParaRetomadaDoLote,
    };
  }
}
