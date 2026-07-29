import { ErroDeValidacao } from '../shared/errors.js';

export type TipoPessoa = 'FISICA' | 'JURIDICA';

/**
 * CPF ou CNPJ com validacao de digitos verificadores.
 *
 * Guardamos sempre so os digitos: e a forma canonica para busca e unicidade.
 * A formatacao com pontos e barra e assunto de apresentacao.
 */
export class CpfCnpj {
  private constructor(
    readonly digitos: string,
    readonly tipoPessoa: TipoPessoa,
  ) {}

  static de(entrada: string): CpfCnpj {
    const digitos = (entrada ?? '').replace(/\D/g, '');

    if (digitos.length === 11) {
      if (!cpfEhValido(digitos)) throw new ErroDeValidacao(`CPF invalido: ${entrada}.`);
      return new CpfCnpj(digitos, 'FISICA');
    }
    if (digitos.length === 14) {
      if (!cnpjEhValido(digitos)) throw new ErroDeValidacao(`CNPJ invalido: ${entrada}.`);
      return new CpfCnpj(digitos, 'JURIDICA');
    }
    throw new ErroDeValidacao(`Documento deve ter 11 (CPF) ou 14 (CNPJ) digitos: ${entrada}.`);
  }

  ehPessoaFisica(): boolean {
    return this.tipoPessoa === 'FISICA';
  }

  formatar(): string {
    return this.ehPessoaFisica()
      ? this.digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
      : this.digitos.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }

  igualA(outro: CpfCnpj): boolean {
    return this.digitos === outro.digitos;
  }

  toJSON(): string {
    return this.digitos;
  }
}

function cpfEhValido(digitos: string): boolean {
  if (/^(\d)\1{10}$/.test(digitos)) return false;
  // Digito 1: pesos 10..2 sobre os 9 primeiros. Digito 2: pesos 11..2 sobre os 10 primeiros.
  return [9, 10].every((posicaoDoDigito) => {
    const pesoInicial = posicaoDoDigito + 1;
    const pesos = Array.from({ length: posicaoDoDigito }, (_, indice) => pesoInicial - indice);
    return digitoDeResto(somaPonderada(digitos, pesos)) === Number(digitos[posicaoDoDigito]);
  });
}

function cnpjEhValido(digitos: string): boolean {
  if (/^(\d)\1{13}$/.test(digitos)) return false;
  const pesosPorPosicao: Record<number, number[]> = {
    12: [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
    13: [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  };
  return [12, 13].every((posicaoDoDigito) => {
    const pesos = pesosPorPosicao[posicaoDoDigito]!;
    return digitoDeResto(somaPonderada(digitos, pesos)) === Number(digitos[posicaoDoDigito]);
  });
}

function somaPonderada(digitos: string, pesos: readonly number[]): number {
  return pesos.reduce((total, peso, indice) => total + Number(digitos[indice]) * peso, 0);
}

function digitoDeResto(soma: number): number {
  const resto = (soma * 10) % 11;
  return resto === 10 ? 0 : resto;
}
