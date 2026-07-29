import { ErroDeValidacao } from '../shared/errors.js';

const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export class Email {
  private constructor(readonly valor: string) {}

  static de(entrada: string): Email {
    const normalizado = (entrada ?? '').trim().toLowerCase();
    if (!FORMATO_EMAIL.test(normalizado)) {
      throw new ErroDeValidacao(`E-mail invalido: ${entrada}.`);
    }
    return new Email(normalizado);
  }

  static opcional(entrada: string | null | undefined): Email | null {
    return entrada?.trim() ? Email.de(entrada) : null;
  }

  igualA(outro: Email): boolean {
    return this.valor === outro.valor;
  }

  toJSON(): string {
    return this.valor;
  }
}

/**
 * Telefone brasileiro com DDD (10 ou 11 digitos). Guardamos so os digitos;
 * `paraFormatoInternacional` acrescenta o codigo do pais exigido no envio.
 */
export class Telefone {
  private constructor(readonly digitos: string) {}

  static de(entrada: string): Telefone {
    const digitos = (entrada ?? '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
    if (digitos.length !== 10 && digitos.length !== 11) {
      throw new ErroDeValidacao(`Telefone deve ter DDD + numero (10 ou 11 digitos): ${entrada}.`);
    }
    return new Telefone(digitos);
  }

  static opcional(entrada: string | null | undefined): Telefone | null {
    return entrada?.trim() ? Telefone.de(entrada) : null;
  }

  ehCelular(): boolean {
    return this.digitos.length === 11;
  }

  /**
   * Formato exigido pelas APIs de mensageria: codigo do pais + DDD + numero
   * (ex.: 5595991371313). Guardamos so DDD + numero porque e o que a operacao
   * digita e confere; o codigo do pais entra na hora do envio.
   */
  paraFormatoInternacional(): string {
    return `55${this.digitos}`;
  }

  formatar(): string {
    const ddd = this.digitos.slice(0, 2);
    const numero = this.digitos.slice(2);
    const metade = numero.length === 9 ? 5 : 4;
    return `(${ddd}) ${numero.slice(0, metade)}-${numero.slice(metade)}`;
  }

  toJSON(): string {
    return this.digitos;
  }
}

export interface Endereco {
  readonly logradouro: string;
  readonly numero: string;
  readonly complemento: string | null;
  readonly bairro: string;
  readonly cidade: string;
  readonly uf: string;
  readonly cep: string;
}

const UNIDADES_FEDERATIVAS = new Set([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]);

export function normalizarEndereco(entrada: {
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  cep?: string | null;
}): Endereco {
  const uf = (entrada.uf ?? '').trim().toUpperCase();
  if (uf && !UNIDADES_FEDERATIVAS.has(uf)) {
    throw new ErroDeValidacao(`UF invalida: ${entrada.uf}.`);
  }
  const cep = (entrada.cep ?? '').replace(/\D/g, '');
  if (cep && cep.length !== 8) {
    throw new ErroDeValidacao(`CEP deve ter 8 digitos: ${entrada.cep}.`);
  }
  return {
    logradouro: (entrada.logradouro ?? '').trim(),
    numero: (entrada.numero ?? '').trim(),
    complemento: entrada.complemento?.trim() || null,
    bairro: (entrada.bairro ?? '').trim(),
    cidade: (entrada.cidade ?? '').trim(),
    uf,
    cep,
  };
}
