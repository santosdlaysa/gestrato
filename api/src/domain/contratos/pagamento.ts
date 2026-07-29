import { Entidade } from '../shared/entidade.js';
import { ErroDeValidacao } from '../shared/errors.js';
import { Identificador } from '../shared/identificador.js';
import { DataCivil } from '../value-objects/data-civil.js';
import { Dinheiro } from '../value-objects/dinheiro.js';
import type { Baixa } from './parcela.js';
import type { FormaPagamento } from './tipos.js';

/** Marca de quem confirmou o recebimento: "MANUAL" ou o nome do provedor. */
export const ORIGEM_MANUAL = 'MANUAL';

interface EstadoDoPagamento {
  id: Identificador;
  contratoId: Identificador;
  parcelaId: Identificador;
  valorPrincipal: Dinheiro;
  valorJuros: Dinheiro;
  valorMulta: Dinheiro;
  valorDesconto: Dinheiro;
  pagoEm: DataCivil;
  formaPagamento: FormaPagamento;
  origem: string;
  documentoId: Identificador | null;
  registradoPor: string | null;
  observacoes: string | null;
  estornado: boolean;
  criadoEm: Date;
}

/**
 * Lancamento de recebimento — imutavel por natureza.
 *
 * A parcela guarda o estado atual ("quanto falta"); o pagamento guarda o fato
 * ("no dia 17/10 entraram R$ 860,29 via Pix"). Estornar nao apaga a linha,
 * marca `estornado`: relatorio de caixa que perde historico nao serve.
 */
export class Pagamento extends Entidade {
  private constructor(private readonly estado: EstadoDoPagamento) {
    super(estado.id);
  }

  static registrar(entrada: {
    id: Identificador;
    contratoId: Identificador;
    parcelaId: Identificador;
    baixa: Baixa;
    origem?: string;
    documentoId?: Identificador | null;
    registradoPor?: string | null;
    observacoes?: string | null;
    criadoEm?: Date;
  }): Pagamento {
    const { baixa } = entrada;
    if (!baixa.valorPrincipal.ehPositivo() && !baixa.valorDesconto.ehPositivo()) {
      throw new ErroDeValidacao('Pagamento precisa ter principal ou desconto.');
    }
    return new Pagamento({
      id: entrada.id,
      contratoId: entrada.contratoId,
      parcelaId: entrada.parcelaId,
      valorPrincipal: baixa.valorPrincipal,
      valorJuros: baixa.valorJuros,
      valorMulta: baixa.valorMulta,
      valorDesconto: baixa.valorDesconto,
      pagoEm: baixa.pagoEm,
      formaPagamento: baixa.formaPagamento,
      origem: entrada.origem ?? ORIGEM_MANUAL,
      documentoId: entrada.documentoId ?? null,
      registradoPor: entrada.registradoPor ?? null,
      observacoes: entrada.observacoes?.trim() || null,
      estornado: false,
      criadoEm: entrada.criadoEm ?? new Date(),
    });
  }

  static restaurar(estado: EstadoDoPagamento): Pagamento {
    return new Pagamento({ ...estado });
  }

  get contratoId(): Identificador {
    return this.estado.contratoId;
  }

  get parcelaId(): Identificador {
    return this.estado.parcelaId;
  }

  get valorPrincipal(): Dinheiro {
    return this.estado.valorPrincipal;
  }

  get valorJuros(): Dinheiro {
    return this.estado.valorJuros;
  }

  get valorMulta(): Dinheiro {
    return this.estado.valorMulta;
  }

  get valorDesconto(): Dinheiro {
    return this.estado.valorDesconto;
  }

  /** O que efetivamente entrou no caixa. Desconto nao entra: e valor abatido. */
  get valorTotal(): Dinheiro {
    return this.estado.valorPrincipal.somar(this.estado.valorJuros).somar(this.estado.valorMulta);
  }

  get pagoEm(): DataCivil {
    return this.estado.pagoEm;
  }

  get formaPagamento(): FormaPagamento {
    return this.estado.formaPagamento;
  }

  get origem(): string {
    return this.estado.origem;
  }

  get documentoId(): Identificador | null {
    return this.estado.documentoId;
  }

  get registradoPor(): string | null {
    return this.estado.registradoPor;
  }

  get observacoes(): string | null {
    return this.estado.observacoes;
  }

  get estornado(): boolean {
    return this.estado.estornado;
  }

  get criadoEm(): Date {
    return this.estado.criadoEm;
  }

  foiConfirmadoPeloBanco(): boolean {
    return this.estado.origem !== ORIGEM_MANUAL;
  }

  estornar(): void {
    this.estado.estornado = true;
  }

  paraEstado(): Readonly<EstadoDoPagamento> {
    return { ...this.estado };
  }
}
