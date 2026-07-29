import { ErroDeValidacao } from '../shared/errors.js';

/**
 * Percentual expresso na forma humana: `Percentual.de(2)` significa 2%.
 *
 * Guardamos com no maximo 4 casas decimais — suficiente para taxas diarias
 * derivadas de juros mensais (1% a.m. / 30 = 0,0333% a.d.).
 */
export class Percentual {
  private constructor(readonly valor: number) {}

  static readonly ZERO = new Percentual(0);

  static de(valor: number): Percentual {
    if (!Number.isFinite(valor)) {
      throw new ErroDeValidacao('Percentual invalido.');
    }
    if (valor < 0) {
      throw new ErroDeValidacao('Percentual nao pode ser negativo.');
    }
    if (valor > 100) {
      throw new ErroDeValidacao('Percentual nao pode ser maior que 100%.');
    }
    return new Percentual(Math.round(valor * 10_000) / 10_000);
  }

  /** Fator multiplicador equivalente: 2% -> 0,02. */
  get fator(): number {
    return this.valor / 100;
  }

  ehZero(): boolean {
    return this.valor === 0;
  }

  formatar(): string {
    return `${this.valor.toLocaleString('pt-BR', { maximumFractionDigits: 4 })}%`;
  }

  toJSON(): number {
    return this.valor;
  }
}
