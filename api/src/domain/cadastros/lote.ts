import { Entidade } from '../shared/entidade.js';
import { ErroDeRegraDeNegocio, ErroDeValidacao } from '../shared/errors.js';
import { Identificador } from '../shared/identificador.js';
import { Dinheiro } from '../value-objects/dinheiro.js';

export const SITUACOES_LOTE = ['DISPONIVEL', 'RESERVADO', 'VENDIDO', 'INDISPONIVEL'] as const;
export type SituacaoLote = (typeof SITUACOES_LOTE)[number];

interface EstadoDaQuadra {
  id: Identificador;
  loteamentoId: Identificador;
  nome: string;
}

/** Agrupamento de lotes dentro do loteamento. */
export class Quadra extends Entidade {
  private constructor(private readonly estado: EstadoDaQuadra) {
    super(estado.id);
  }

  static nova(entrada: { id: Identificador; loteamentoId: Identificador; nome: string }): Quadra {
    const nome = entrada.nome?.trim().toUpperCase();
    if (!nome) throw new ErroDeValidacao('Nome da quadra e obrigatorio.');
    return new Quadra({ ...entrada, nome });
  }

  static restaurar(estado: EstadoDaQuadra): Quadra {
    return new Quadra({ ...estado });
  }

  get loteamentoId(): Identificador {
    return this.estado.loteamentoId;
  }

  get nome(): string {
    return this.estado.nome;
  }

  paraEstado(): Readonly<EstadoDaQuadra> {
    return { ...this.estado };
  }
}

interface EstadoDoLote {
  id: Identificador;
  quadraId: Identificador;
  numero: string;
  areaEmMetrosQuadrados: number;
  valorDeTabela: Dinheiro | null;
  situacao: SituacaoLote;
  descricao: string | null;
}

/**
 * O imovel vendido. A situacao e controlada pelo ciclo do contrato: vender
 * exige lote disponivel ou reservado, e o distrato devolve o lote ao estoque.
 */
export class Lote extends Entidade {
  private constructor(private readonly estado: EstadoDoLote) {
    super(estado.id);
  }

  static novo(entrada: {
    id: Identificador;
    quadraId: Identificador;
    numero: string;
    areaEmMetrosQuadrados: number;
    valorDeTabela?: Dinheiro | null;
    descricao?: string | null;
  }): Lote {
    const numero = entrada.numero?.trim().toUpperCase();
    if (!numero) throw new ErroDeValidacao('Numero do lote e obrigatorio.');
    if (!Number.isFinite(entrada.areaEmMetrosQuadrados) || entrada.areaEmMetrosQuadrados <= 0) {
      throw new ErroDeValidacao('Area do lote deve ser maior que zero.');
    }
    return new Lote({
      id: entrada.id,
      quadraId: entrada.quadraId,
      numero,
      areaEmMetrosQuadrados: Math.round(entrada.areaEmMetrosQuadrados * 100) / 100,
      valorDeTabela: entrada.valorDeTabela ?? null,
      situacao: 'DISPONIVEL',
      descricao: entrada.descricao?.trim() || null,
    });
  }

  static restaurar(estado: EstadoDoLote): Lote {
    return new Lote({ ...estado });
  }

  get quadraId(): Identificador {
    return this.estado.quadraId;
  }

  get numero(): string {
    return this.estado.numero;
  }

  get areaEmMetrosQuadrados(): number {
    return this.estado.areaEmMetrosQuadrados;
  }

  get valorDeTabela(): Dinheiro | null {
    return this.estado.valorDeTabela;
  }

  get situacao(): SituacaoLote {
    return this.estado.situacao;
  }

  get descricao(): string | null {
    return this.estado.descricao;
  }

  estaDisponivelParaVenda(): boolean {
    return this.estado.situacao === 'DISPONIVEL' || this.estado.situacao === 'RESERVADO';
  }

  reservar(): void {
    if (this.estado.situacao !== 'DISPONIVEL') {
      throw new ErroDeRegraDeNegocio(`Lote ${this.estado.numero} nao esta disponivel para reserva.`);
    }
    this.estado.situacao = 'RESERVADO';
  }

  vender(): void {
    if (!this.estaDisponivelParaVenda()) {
      throw new ErroDeRegraDeNegocio(
        `Lote ${this.estado.numero} esta ${this.estado.situacao.toLowerCase()} e nao pode ser vendido.`,
      );
    }
    this.estado.situacao = 'VENDIDO';
  }

  /** Distrato ou cancelamento devolve o lote ao estoque. */
  liberar(): void {
    this.estado.situacao = 'DISPONIVEL';
  }

  atualizarDados(dados: {
    numero?: string;
    areaEmMetrosQuadrados?: number;
    valorDeTabela?: Dinheiro | null;
    descricao?: string | null;
  }): void {
    if (dados.numero !== undefined) {
      const numero = dados.numero.trim().toUpperCase();
      if (!numero) throw new ErroDeValidacao('Numero do lote e obrigatorio.');
      this.estado.numero = numero;
    }
    if (dados.areaEmMetrosQuadrados !== undefined) {
      if (dados.areaEmMetrosQuadrados <= 0) throw new ErroDeValidacao('Area do lote deve ser maior que zero.');
      this.estado.areaEmMetrosQuadrados = Math.round(dados.areaEmMetrosQuadrados * 100) / 100;
    }
    if (dados.valorDeTabela !== undefined) this.estado.valorDeTabela = dados.valorDeTabela;
    if (dados.descricao !== undefined) this.estado.descricao = dados.descricao?.trim() || null;
  }

  paraEstado(): Readonly<EstadoDoLote> {
    return { ...this.estado };
  }
}
