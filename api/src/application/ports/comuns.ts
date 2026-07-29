import type { DataCivil } from '../../domain/value-objects/data-civil.js';

/** Resultado paginado devolvido pelas consultas de listagem. */
export interface Pagina<T> {
  readonly itens: T[];
  readonly total: number;
  readonly pagina: number;
  readonly porPagina: number;
  readonly totalDePaginas: number;
}

export interface ParametrosDePaginacao {
  readonly pagina: number;
  readonly porPagina: number;
}

export function montarPagina<T>(itens: T[], total: number, parametros: ParametrosDePaginacao): Pagina<T> {
  return {
    itens,
    total,
    pagina: parametros.pagina,
    porPagina: parametros.porPagina,
    totalDePaginas: Math.max(1, Math.ceil(total / parametros.porPagina)),
  };
}

/**
 * Fonte de tempo injetavel.
 *
 * Toda a cobranca depende de "que dia e hoje" — a regua dispara por data, os
 * juros contam dias de atraso. Sem esta porta, testar "o que acontece 30 dias
 * depois" exigiria mexer no relogio da maquina.
 */
export interface Relogio {
  hoje(): DataCivil;
  agora(): Date;
}

/** Geracao de identidade fica fora do dominio: e escolha de infraestrutura. */
export interface GeradorDeIdentificador {
  gerar(): string;
}
