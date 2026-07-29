import { Identificador } from './identificador.js';

/**
 * Base de entidade: identidade estavel, igualdade por id (nao por atributos).
 */
export abstract class Entidade {
  protected constructor(readonly id: Identificador) {}

  igualA(outra: Entidade): boolean {
    return this.constructor === outra.constructor && this.id.igualA(outra.id);
  }
}
