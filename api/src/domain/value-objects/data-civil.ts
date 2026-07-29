import { ErroDeValidacao } from '../shared/errors.js';

const MILISSEGUNDOS_POR_DIA = 86_400_000;
const FORMATO_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Data civil (ano-mes-dia), sem hora e sem fuso.
 *
 * Vencimento de parcela e um fato do calendario, nao um instante: "vence dia
 * 10/03" nao muda porque o servidor esta em UTC e o cliente em America/Sao_Paulo.
 * Internamente guardamos os campos separados e so materializamos um `Date` em
 * UTC quando a borda (Prisma, JSON) exige.
 */
export class DataCivil {
  private constructor(
    readonly ano: number,
    readonly mes: number,
    readonly dia: number,
  ) {}

  static de(ano: number, mes: number, dia: number): DataCivil {
    if (![ano, mes, dia].every(Number.isInteger)) {
      throw new ErroDeValidacao('Data invalida: componentes devem ser inteiros.');
    }
    if (mes < 1 || mes > 12) {
      throw new ErroDeValidacao(`Mes invalido: ${mes}.`);
    }
    if (dia < 1 || dia > diasNoMes(ano, mes)) {
      throw new ErroDeValidacao(`Dia invalido para ${mes}/${ano}: ${dia}.`);
    }
    return new DataCivil(ano, mes, dia);
  }

  /** Aceita "AAAA-MM-DD" ou ISO completo (a parte de hora e descartada). */
  static deIso(texto: string): DataCivil {
    const somenteData = texto?.trim().slice(0, 10) ?? '';
    const partes = FORMATO_ISO.exec(somenteData);
    if (!partes) {
      throw new ErroDeValidacao(`Data deve estar no formato AAAA-MM-DD: "${texto}".`);
    }
    return DataCivil.de(Number(partes[1]), Number(partes[2]), Number(partes[3]));
  }

  /** Le apenas os componentes UTC — o `Date` guardado pelo Prisma e sempre meia-noite UTC. */
  static deDate(data: Date): DataCivil {
    if (Number.isNaN(data.getTime())) {
      throw new ErroDeValidacao('Data invalida.');
    }
    return DataCivil.de(data.getUTCFullYear(), data.getUTCMonth() + 1, data.getUTCDate());
  }

  /** Data de hoje no fuso informado (padrao: America/Sao_Paulo). */
  static hoje(fuso = 'America/Sao_Paulo', agora = new Date()): DataCivil {
    const formatador = new Intl.DateTimeFormat('en-CA', {
      timeZone: fuso,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return DataCivil.deIso(formatador.format(agora));
  }

  /**
   * Soma meses preservando o dia quando possivel; quando o mes destino e mais
   * curto, ancora no ultimo dia (31/01 + 1 mes = 28/02 ou 29/02).
   */
  somarMeses(quantidade: number): DataCivil {
    if (!Number.isInteger(quantidade)) {
      throw new ErroDeValidacao('Quantidade de meses deve ser inteira.');
    }
    const totalMeses = this.ano * 12 + (this.mes - 1) + quantidade;
    const ano = Math.floor(totalMeses / 12);
    const mes = (totalMeses % 12) + 1;
    return DataCivil.de(ano, mes, Math.min(this.dia, diasNoMes(ano, mes)));
  }

  somarDias(quantidade: number): DataCivil {
    if (!Number.isInteger(quantidade)) {
      throw new ErroDeValidacao('Quantidade de dias deve ser inteira.');
    }
    return DataCivil.deDate(new Date(this.paraDateUtc().getTime() + quantidade * MILISSEGUNDOS_POR_DIA));
  }

  /** Dias corridos de `this` ate `outra` (negativo se `outra` for anterior). */
  diasAte(outra: DataCivil): number {
    return Math.round((outra.paraDateUtc().getTime() - this.paraDateUtc().getTime()) / MILISSEGUNDOS_POR_DIA);
  }

  anteriorA(outra: DataCivil): boolean {
    return this.comparar(outra) < 0;
  }

  posteriorA(outra: DataCivil): boolean {
    return this.comparar(outra) > 0;
  }

  igualA(outra: DataCivil): boolean {
    return this.comparar(outra) === 0;
  }

  entre(inicio: DataCivil, fim: DataCivil): boolean {
    return this.comparar(inicio) >= 0 && this.comparar(fim) <= 0;
  }

  comparar(outra: DataCivil): number {
    return this.paraIso().localeCompare(outra.paraIso());
  }

  /** Chave "AAAA-MM" — usada em agrupamentos de relatorio. */
  competencia(): string {
    return `${this.ano}-${String(this.mes).padStart(2, '0')}`;
  }

  primeiroDiaDoMes(): DataCivil {
    return DataCivil.de(this.ano, this.mes, 1);
  }

  ultimoDiaDoMes(): DataCivil {
    return DataCivil.de(this.ano, this.mes, diasNoMes(this.ano, this.mes));
  }

  paraIso(): string {
    return `${String(this.ano).padStart(4, '0')}-${String(this.mes).padStart(2, '0')}-${String(this.dia).padStart(2, '0')}`;
  }

  formatarBr(): string {
    return `${String(this.dia).padStart(2, '0')}/${String(this.mes).padStart(2, '0')}/${this.ano}`;
  }

  paraDateUtc(): Date {
    return new Date(Date.UTC(this.ano, this.mes - 1, this.dia));
  }

  static minima(datas: readonly DataCivil[]): DataCivil | null {
    return datas.reduce<DataCivil | null>(
      (menor, data) => (menor === null || data.anteriorA(menor) ? data : menor),
      null,
    );
  }

  toJSON(): string {
    return this.paraIso();
  }
}

function diasNoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}
