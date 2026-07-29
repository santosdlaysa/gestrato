import { Entidade } from '../shared/entidade.js';
import { ErroDeRegraDeNegocio, ErroDeValidacao } from '../shared/errors.js';
import { Identificador } from '../shared/identificador.js';
import { DataCivil } from '../value-objects/data-civil.js';
import { Dinheiro } from '../value-objects/dinheiro.js';
import { PoliticaDeEncargos } from './politica-de-encargos.js';
import type { FormaPagamento, SituacaoParcela, StatusParcela, TipoParcela } from './tipos.js';

export interface Baixa {
  readonly valorPrincipal: Dinheiro;
  readonly valorJuros: Dinheiro;
  readonly valorMulta: Dinheiro;
  readonly valorDesconto: Dinheiro;
  readonly pagoEm: DataCivil;
  readonly formaPagamento: FormaPagamento;
}

/** Quanto o cliente deve numa data, com a mora ja aplicada. */
export interface DemonstrativoDeDebito {
  readonly saldoPrincipal: Dinheiro;
  readonly multa: Dinheiro;
  readonly juros: Dinheiro;
  readonly total: Dinheiro;
  readonly diasDeAtraso: number;
  readonly diasCobrados: number;
}

interface EstadoDaParcela {
  id: Identificador;
  contratoId: Identificador;
  numero: number;
  tipo: TipoParcela;
  valorOriginal: Dinheiro;
  vencimento: DataCivil;
  status: StatusParcela;
  valorPago: Dinheiro;
  jurosRecebidos: Dinheiro;
  multaRecebida: Dinheiro;
  descontoConcedido: Dinheiro;
  pagoEm: DataCivil | null;
  formaPagamento: FormaPagamento | null;
  descricao: string | null;
}

/**
 * Uma cobranca individual do contrato.
 *
 * Guarda apenas o que foi *decidido* (valor, vencimento) e o que *aconteceu*
 * (baixas). Estar vencida e consequencia do calendario, entao e calculado sob
 * demanda em `situacaoEm` — nada precisa reescrever a linha quando o dia vira.
 */
export class Parcela extends Entidade {
  private constructor(private readonly estado: EstadoDaParcela) {
    super(estado.id);
  }

  static nova(entrada: {
    id: Identificador;
    contratoId: Identificador;
    numero: number;
    tipo: TipoParcela;
    valorOriginal: Dinheiro;
    vencimento: DataCivil;
    descricao?: string | null;
  }): Parcela {
    if (!Number.isInteger(entrada.numero) || entrada.numero < 0) {
      throw new ErroDeValidacao('Numero da parcela deve ser inteiro nao negativo.');
    }
    if (!entrada.valorOriginal.ehPositivo()) {
      throw new ErroDeValidacao(`Parcela ${entrada.numero} precisa ter valor positivo.`);
    }
    return new Parcela({
      ...entrada,
      status: 'PENDENTE',
      valorPago: Dinheiro.ZERO,
      jurosRecebidos: Dinheiro.ZERO,
      multaRecebida: Dinheiro.ZERO,
      descontoConcedido: Dinheiro.ZERO,
      pagoEm: null,
      formaPagamento: null,
      descricao: entrada.descricao ?? null,
    });
  }

  /** Reidrata a entidade a partir do repositorio, sem revalidar regras de criacao. */
  static restaurar(estado: EstadoDaParcela): Parcela {
    return new Parcela({ ...estado });
  }

  get contratoId(): Identificador {
    return this.estado.contratoId;
  }

  get numero(): number {
    return this.estado.numero;
  }

  get tipo(): TipoParcela {
    return this.estado.tipo;
  }

  get valorOriginal(): Dinheiro {
    return this.estado.valorOriginal;
  }

  get vencimento(): DataCivil {
    return this.estado.vencimento;
  }

  get status(): StatusParcela {
    return this.estado.status;
  }

  get valorPago(): Dinheiro {
    return this.estado.valorPago;
  }

  get jurosRecebidos(): Dinheiro {
    return this.estado.jurosRecebidos;
  }

  get multaRecebida(): Dinheiro {
    return this.estado.multaRecebida;
  }

  get descontoConcedido(): Dinheiro {
    return this.estado.descontoConcedido;
  }

  get pagoEm(): DataCivil | null {
    return this.estado.pagoEm;
  }

  get formaPagamento(): FormaPagamento | null {
    return this.estado.formaPagamento;
  }

  get descricao(): string | null {
    return this.estado.descricao;
  }

  /** Total efetivamente recebido, somando principal, mora e descontando abatimentos. */
  get totalRecebido(): Dinheiro {
    return this.estado.valorPago.somar(this.estado.jurosRecebidos).somar(this.estado.multaRecebida);
  }

  /** Quanto falta do principal. Desconto concedido abate o saldo. */
  saldoPrincipal(): Dinheiro {
    return this.estado.valorOriginal
      .subtrair(this.estado.valorPago)
      .subtrair(this.estado.descontoConcedido)
      .naoNegativo();
  }

  estaQuitada(): boolean {
    return this.estado.status === 'PAGA';
  }

  estaEncerrada(): boolean {
    return ['PAGA', 'CANCELADA', 'RENEGOCIADA'].includes(this.estado.status);
  }

  /** Continua gerando cobranca: pendente ou paga so em parte. */
  estaEmAberto(): boolean {
    return this.estado.status === 'PENDENTE' || this.estado.status === 'PAGA_PARCIAL';
  }

  estaVencidaEm(dataReferencia: DataCivil): boolean {
    return this.estaEmAberto() && this.estado.vencimento.anteriorA(dataReferencia);
  }

  venceEm(dataReferencia: DataCivil): boolean {
    return this.estaEmAberto() && this.estado.vencimento.igualA(dataReferencia);
  }

  diasDeAtrasoEm(dataReferencia: DataCivil): number {
    return Math.max(0, this.estado.vencimento.diasAte(dataReferencia));
  }

  situacaoEm(dataReferencia: DataCivil): SituacaoParcela {
    switch (this.estado.status) {
      case 'PAGA':
        return 'PAGA';
      case 'CANCELADA':
        return 'CANCELADA';
      case 'RENEGOCIADA':
        return 'RENEGOCIADA';
      default:
        break;
    }
    if (this.estado.vencimento.anteriorA(dataReferencia)) return 'VENCIDA';
    if (this.estado.vencimento.igualA(dataReferencia)) return 'VENCE_HOJE';
    return this.estado.status === 'PAGA_PARCIAL' ? 'PAGA_PARCIAL' : 'A_VENCER';
  }

  /** Valor atualizado para emissao de boleto/Pix numa data. */
  demonstrativoEm(politica: PoliticaDeEncargos, dataReferencia: DataCivil): DemonstrativoDeDebito {
    const saldoPrincipal = this.saldoPrincipal();
    const encargos = politica.calcular(saldoPrincipal, this.diasDeAtrasoEm(dataReferencia));
    return {
      saldoPrincipal,
      multa: encargos.multa,
      juros: encargos.juros,
      total: saldoPrincipal.somar(encargos.multa).somar(encargos.juros),
      diasDeAtraso: encargos.diasDeAtraso,
      diasCobrados: encargos.diasCobrados,
    };
  }

  /**
   * Registra um recebimento. Aceita baixa parcial: enquanto sobrar principal a
   * parcela fica PAGA_PARCIAL e segue na regua de cobranca pelo saldo.
   */
  registrarBaixa(baixa: Baixa): void {
    if (this.estaEncerrada()) {
      throw new ErroDeRegraDeNegocio(
        `Parcela ${this.estado.numero} esta ${this.estado.status.toLowerCase()} e nao aceita baixa.`,
      );
    }
    if (!baixa.valorPrincipal.ehPositivo() && !baixa.valorDesconto.ehPositivo()) {
      throw new ErroDeValidacao('A baixa precisa ter valor de principal ou desconto.');
    }
    if ([baixa.valorPrincipal, baixa.valorJuros, baixa.valorMulta, baixa.valorDesconto].some((v) => v.ehNegativo())) {
      throw new ErroDeValidacao('Valores da baixa nao podem ser negativos.');
    }

    const abatimento = baixa.valorPrincipal.somar(baixa.valorDesconto);
    if (abatimento.maiorQue(this.saldoPrincipal())) {
      throw new ErroDeRegraDeNegocio(
        `Baixa de ${abatimento.formatar()} excede o saldo de ${this.saldoPrincipal().formatar()} da parcela ${this.estado.numero}.`,
      );
    }

    this.estado.valorPago = this.estado.valorPago.somar(baixa.valorPrincipal);
    this.estado.jurosRecebidos = this.estado.jurosRecebidos.somar(baixa.valorJuros);
    this.estado.multaRecebida = this.estado.multaRecebida.somar(baixa.valorMulta);
    this.estado.descontoConcedido = this.estado.descontoConcedido.somar(baixa.valorDesconto);
    this.estado.pagoEm = baixa.pagoEm;
    this.estado.formaPagamento = baixa.formaPagamento;
    this.estado.status = this.saldoPrincipal().ehZero() ? 'PAGA' : 'PAGA_PARCIAL';
  }

  /** Desfaz todas as baixas — usado quando o estorno vem do banco ou de erro de digitacao. */
  estornarBaixas(): void {
    if (this.estado.status === 'RENEGOCIADA' || this.estado.status === 'CANCELADA') {
      throw new ErroDeRegraDeNegocio(
        `Parcela ${this.estado.numero} esta ${this.estado.status.toLowerCase()} e nao pode ser estornada.`,
      );
    }
    this.estado.valorPago = Dinheiro.ZERO;
    this.estado.jurosRecebidos = Dinheiro.ZERO;
    this.estado.multaRecebida = Dinheiro.ZERO;
    this.estado.descontoConcedido = Dinheiro.ZERO;
    this.estado.pagoEm = null;
    this.estado.formaPagamento = null;
    this.estado.status = 'PENDENTE';
  }

  cancelar(): void {
    if (this.estado.status === 'PAGA') {
      throw new ErroDeRegraDeNegocio(`Parcela ${this.estado.numero} ja esta paga e nao pode ser cancelada.`);
    }
    this.estado.status = 'CANCELADA';
  }

  /** Marca a parcela como substituida por um novo plano de renegociacao. */
  marcarComoRenegociada(): void {
    if (!this.estaEmAberto()) {
      throw new ErroDeRegraDeNegocio(
        `Somente parcelas em aberto podem ser renegociadas; a parcela ${this.estado.numero} esta ${this.estado.status.toLowerCase()}.`,
      );
    }
    this.estado.status = 'RENEGOCIADA';
  }

  /** Reajuste contratual: so faz sentido em parcela ainda nao recebida. */
  aplicarReajuste(percentualFator: number): void {
    if (this.estado.status !== 'PENDENTE') {
      throw new ErroDeRegraDeNegocio(
        `Parcela ${this.estado.numero} nao esta pendente; reajuste nao se aplica.`,
      );
    }
    this.estado.valorOriginal = this.estado.valorOriginal.multiplicarPor(1 + percentualFator);
  }

  alterarVencimento(novoVencimento: DataCivil): void {
    if (!this.estaEmAberto()) {
      throw new ErroDeRegraDeNegocio(`Parcela ${this.estado.numero} nao esta em aberto.`);
    }
    this.estado.vencimento = novoVencimento;
  }

  /** Copia defensiva do estado, para os mappers da camada de persistencia. */
  paraEstado(): Readonly<EstadoDaParcela> {
    return { ...this.estado };
  }
}
