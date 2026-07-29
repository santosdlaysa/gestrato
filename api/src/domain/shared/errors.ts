/**
 * Erros de dominio. Nao conhecem HTTP, banco ou framework — a borda que traduz
 * cada tipo para o protocolo dela (ver `interfaces/http/middlewares/error-handler`).
 */

export abstract class ErroDeDominio extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = new.target.name;
  }
}

/** Dado de entrada invalido: viola uma invariante de valor ou entidade. */
export class ErroDeValidacao extends ErroDeDominio {}

/** Operacao proibida pelo estado atual do agregado (ex.: baixar parcela cancelada). */
export class ErroDeRegraDeNegocio extends ErroDeDominio {}

/** Agregado nao encontrado no repositorio. */
export class ErroNaoEncontrado extends ErroDeDominio {
  constructor(recurso: string, identificador?: string) {
    super(
      identificador
        ? `${recurso} nao encontrado(a): ${identificador}`
        : `${recurso} nao encontrado(a)`,
    );
  }
}

/** Violacao de unicidade percebida pela regra de negocio (ex.: numero de contrato repetido). */
export class ErroDeConflito extends ErroDeDominio {}

/** Usuario autenticado, porem sem permissao para a operacao. */
export class ErroDeAutorizacao extends ErroDeDominio {}
