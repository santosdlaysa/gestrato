import { ErroDeValidacao } from './errors.js';

/**
 * Identidade de entidade. O dominio nao sabe como o id e gerado (uuid, cuid,
 * sequencial); apenas que existe e e comparavel por valor.
 */
export class Identificador {
  private constructor(private readonly valor: string) {}

  static de(valor: string): Identificador {
    const limpo = valor?.trim();
    if (!limpo) throw new ErroDeValidacao('Identificador nao pode ser vazio.');
    return new Identificador(limpo);
  }

  paraString(): string {
    return this.valor;
  }

  igualA(outro: Identificador): boolean {
    return this.valor === outro.valor;
  }

  toJSON(): string {
    return this.valor;
  }
}
