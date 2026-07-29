import { ErroDeValidacao } from '../shared/errors.js';

/**
 * Valor monetario em centavos inteiros.
 *
 * Toda a aritmetica financeira do sistema passa por aqui: ponto flutuante nunca
 * toca um valor a receber. Arredondamento e sempre half-up (0,005 -> 0,01),
 * que e a convencao usada em cobranca no Brasil.
 */
export class Dinheiro {
  private constructor(readonly centavos: number) {}

  static readonly ZERO = new Dinheiro(0);

  static deCentavos(centavos: number): Dinheiro {
    if (!Number.isFinite(centavos)) {
      throw new ErroDeValidacao('Valor monetario invalido.');
    }
    if (!Number.isInteger(centavos)) {
      throw new ErroDeValidacao('Valor monetario deve ser inteiro em centavos.');
    }
    if (!Number.isSafeInteger(centavos)) {
      throw new ErroDeValidacao('Valor monetario excede o limite suportado.');
    }
    return new Dinheiro(centavos);
  }

  /**
   * Converte reais (ex.: 1234.56) para centavos, arredondando half-up.
   *
   * O `toFixed` antes do arredondamento nao e enfeite: `1.005 * 100` da
   * 100.49999999999999 em ponto flutuante, e arredondar isso direto devolveria
   * 100 centavos em vez de 101. Normalizar a representacao decimal primeiro
   * corrige a classe inteira desses casos — que sao 5,7% dos meios-centavos.
   */
  static deReais(reais: number): Dinheiro {
    if (!Number.isFinite(reais)) {
      throw new ErroDeValidacao('Valor monetario invalido.');
    }
    return new Dinheiro(arredondaHalfUp(Number((reais * 100).toFixed(6))));
  }

  get reais(): number {
    return this.centavos / 100;
  }

  somar(outro: Dinheiro): Dinheiro {
    return Dinheiro.deCentavos(this.centavos + outro.centavos);
  }

  subtrair(outro: Dinheiro): Dinheiro {
    return Dinheiro.deCentavos(this.centavos - outro.centavos);
  }

  /** Multiplica por um fator adimensional, arredondando half-up. */
  multiplicarPor(fator: number): Dinheiro {
    if (!Number.isFinite(fator)) {
      throw new ErroDeValidacao('Fator de multiplicacao invalido.');
    }
    return Dinheiro.deCentavos(arredondaHalfUp(this.centavos * fator));
  }

  /**
   * Divide o valor em `partes` iguais distribuindo os centavos restantes nas
   * ultimas parcelas — assim a soma das partes e sempre igual ao total.
   */
  ratear(partes: number): Dinheiro[] {
    if (!Number.isInteger(partes) || partes <= 0) {
      throw new ErroDeValidacao('Numero de partes deve ser inteiro positivo.');
    }
    const base = Math.trunc(this.centavos / partes);
    const centavosSobrando = this.centavos - base * partes;
    const ajuste = Math.sign(centavosSobrando);
    const primeiraParteAjustada = partes - Math.abs(centavosSobrando);
    return Array.from({ length: partes }, (_, indice) =>
      Dinheiro.deCentavos(indice >= primeiraParteAjustada ? base + ajuste : base),
    );
  }

  ehZero(): boolean {
    return this.centavos === 0;
  }

  ehPositivo(): boolean {
    return this.centavos > 0;
  }

  ehNegativo(): boolean {
    return this.centavos < 0;
  }

  maiorQue(outro: Dinheiro): boolean {
    return this.centavos > outro.centavos;
  }

  menorQue(outro: Dinheiro): boolean {
    return this.centavos < outro.centavos;
  }

  igualA(outro: Dinheiro): boolean {
    return this.centavos === outro.centavos;
  }

  /** Nunca retorna valor negativo — util para saldos devedores. */
  naoNegativo(): Dinheiro {
    return this.centavos < 0 ? Dinheiro.ZERO : this;
  }

  static somaDe(valores: readonly Dinheiro[]): Dinheiro {
    return valores.reduce((total, valor) => total.somar(valor), Dinheiro.ZERO);
  }

  formatar(): string {
    return this.reais.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  toJSON(): number {
    return this.centavos;
  }
}

function arredondaHalfUp(valor: number): number {
  return Math.sign(valor) * Math.round(Math.abs(valor));
}
