import type { Parcela } from '../../domain/contratos/parcela.js';
import type { DataCivil } from '../../domain/value-objects/data-civil.js';

/**
 * Leitura dedicada da tela de inadimplencia.
 *
 * "Quem me deve, quanto e ha quanto tempo" e uma pergunta por cliente, mas a
 * mora e calculada parcela a parcela pela politica de cada contrato. Trazer as
 * parcelas vencidas ja com o contexto de cliente e unidade numa unica consulta
 * evita o N+1 que apareceria ao navegar parcela -> contrato -> cliente -> lote.
 */
export interface FiltroDeInadimplencia {
  /** Data de referencia; vencidas sao as parcelas em aberto com vencimento anterior a ela. */
  readonly ate: DataCivil;
  readonly loteamentoId?: string;
  readonly clienteId?: string;
  /** Nome (parcial, sem acento) ou documento (so digitos) do cliente. */
  readonly busca?: string;
}

/** Uma parcela vencida com o minimo para agregar por cliente e calcular a mora. */
export interface ParcelaVencidaDoCliente {
  readonly parcela: Parcela;
  readonly contratoId: string;
  readonly contratoNumero: string;

  readonly clienteId: string;
  readonly clienteNome: string;
  readonly clienteDocumento: string;
  readonly clienteEmail: string | null;
  readonly clienteTelefone: string | null;
  readonly clienteWhatsApp: string | null;

  readonly loteamento: string;
  readonly quadra: string;
  readonly lote: string;
}

export interface ConsultaDeInadimplencia {
  /**
   * Todas as parcelas em aberto e vencidas de contratos ATIVOS, aplicando os
   * filtros. Sem paginacao: a agregacao por cliente acontece na camada de
   * aplicacao, sobre o conjunto inteiro, para que os totais e a ordenacao por
   * valor devido sejam exatos.
   */
  parcelasVencidas(filtro: FiltroDeInadimplencia): Promise<ParcelaVencidaDoCliente[]>;
}
