import { Entidade } from '../shared/entidade.js';
import { ErroDeRegraDeNegocio, ErroDeValidacao } from '../shared/errors.js';
import { Identificador } from '../shared/identificador.js';
import { DataCivil } from '../value-objects/data-civil.js';
import { Dinheiro } from '../value-objects/dinheiro.js';
import type { Parcela } from './parcela.js';
import type { PoliticaDeEncargos } from './politica-de-encargos.js';
import { TermosDoFinanciamento, type EspecificacaoDeParcela } from './termos-do-financiamento.js';
import type { Periodicidade } from './tipos.js';

export const STATUS_RENEGOCIACAO = ['VIGENTE', 'CUMPRIDA', 'ROMPIDA', 'CANCELADA'] as const;
export type StatusRenegociacao = (typeof STATUS_RENEGOCIACAO)[number];

/** Composicao do valor negociado — o que o cliente assina no acordo. */
export interface ApuracaoDoAcordo {
  readonly saldoOriginal: Dinheiro;
  readonly encargos: Dinheiro;
  readonly desconto: Dinheiro;
  readonly valorNegociado: Dinheiro;
}

interface EstadoDaRenegociacao {
  id: Identificador;
  contratoId: Identificador;
  parcelasSubstituidasIds: readonly Identificador[];
  apuracao: ApuracaoDoAcordo;
  termos: TermosDoFinanciamento;
  status: StatusRenegociacao;
  motivo: string | null;
  acordadoEm: DataCivil;
  registradoPor: string | null;
}

/**
 * Acordo que substitui parcelas em aberto por um novo plano.
 *
 * O saldo negociado nao e um numero digitado: e apurado das parcelas escolhidas
 * (principal em aberto + mora do dia, menos o desconto concedido). Digitar o
 * total a mao e como se perde dinheiro em renegociacao.
 *
 * As parcelas antigas nao somem — viram RENEGOCIADA e continuam no extrato,
 * apontando para o acordo. Sem isso ninguem consegue auditar o que virou o que.
 */
export class Renegociacao extends Entidade {
  private constructor(private readonly estado: EstadoDaRenegociacao) {
    super(estado.id);
  }

  static apurar(entrada: {
    parcelas: readonly Parcela[];
    politica: PoliticaDeEncargos;
    dataDeApuracao: DataCivil;
    incluirEncargos: boolean;
    desconto: Dinheiro;
  }): ApuracaoDoAcordo {
    const { parcelas, politica, dataDeApuracao, incluirEncargos, desconto } = entrada;

    if (parcelas.length === 0) {
      throw new ErroDeValidacao('Selecione ao menos uma parcela para renegociar.');
    }
    const naoRenegociaveis = parcelas.filter((parcela) => !parcela.estaEmAberto());
    if (naoRenegociaveis.length > 0) {
      throw new ErroDeRegraDeNegocio(
        `Somente parcelas em aberto podem ser renegociadas. Parcela(s) invalida(s): ${naoRenegociaveis
          .map((parcela) => parcela.numero)
          .join(', ')}.`,
      );
    }

    const demonstrativos = parcelas.map((parcela) => parcela.demonstrativoEm(politica, dataDeApuracao));
    const saldoOriginal = Dinheiro.somaDe(demonstrativos.map((d) => d.saldoPrincipal));
    const encargos = incluirEncargos
      ? Dinheiro.somaDe(demonstrativos.map((d) => d.multa.somar(d.juros)))
      : Dinheiro.ZERO;

    if (desconto.ehNegativo()) {
      throw new ErroDeValidacao('Desconto nao pode ser negativo.');
    }
    const valorNegociado = saldoOriginal.somar(encargos).subtrair(desconto);
    if (!valorNegociado.ehPositivo()) {
      throw new ErroDeValidacao(
        `O desconto de ${desconto.formatar()} zera o valor negociado; use a baixa com desconto em vez de renegociar.`,
      );
    }
    return { saldoOriginal, encargos, desconto, valorNegociado };
  }

  static nova(entrada: {
    id: Identificador;
    contratoId: Identificador;
    parcelas: readonly Parcela[];
    politica: PoliticaDeEncargos;
    incluirEncargos: boolean;
    desconto: Dinheiro;
    entradaDoAcordo: Dinheiro;
    dataDaEntrada: DataCivil | null;
    quantidadeDeParcelas: number;
    primeiroVencimento: DataCivil;
    periodicidade: Periodicidade;
    acordadoEm: DataCivil;
    motivo?: string | null;
    registradoPor?: string | null;
  }): Renegociacao {
    const apuracao = Renegociacao.apurar({
      parcelas: entrada.parcelas,
      politica: entrada.politica,
      dataDeApuracao: entrada.acordadoEm,
      incluirEncargos: entrada.incluirEncargos,
      desconto: entrada.desconto,
    });

    const termos = TermosDoFinanciamento.de({
      valorTotal: apuracao.valorNegociado,
      valorEntrada: entrada.entradaDoAcordo,
      dataEntrada: entrada.dataDaEntrada,
      formaPagamentoEntrada: null,
      quantidadeDeParcelas: entrada.quantidadeDeParcelas,
      valorDaParcela: null,
      primeiroVencimento: entrada.primeiroVencimento,
      periodicidade: entrada.periodicidade,
    });

    return new Renegociacao({
      id: entrada.id,
      contratoId: entrada.contratoId,
      parcelasSubstituidasIds: entrada.parcelas.map((parcela) => parcela.id),
      apuracao,
      termos,
      status: 'VIGENTE',
      motivo: entrada.motivo?.trim() || null,
      acordadoEm: entrada.acordadoEm,
      registradoPor: entrada.registradoPor ?? null,
    });
  }

  static restaurar(estado: EstadoDaRenegociacao): Renegociacao {
    return new Renegociacao({ ...estado });
  }

  get contratoId(): Identificador {
    return this.estado.contratoId;
  }

  get parcelasSubstituidasIds(): readonly Identificador[] {
    return this.estado.parcelasSubstituidasIds;
  }

  get apuracao(): ApuracaoDoAcordo {
    return this.estado.apuracao;
  }

  get termos(): TermosDoFinanciamento {
    return this.estado.termos;
  }

  get status(): StatusRenegociacao {
    return this.estado.status;
  }

  get motivo(): string | null {
    return this.estado.motivo;
  }

  get acordadoEm(): DataCivil {
    return this.estado.acordadoEm;
  }

  get registradoPor(): string | null {
    return this.estado.registradoPor;
  }

  /**
   * Novas parcelas do acordo. Continuam a numeracao a partir da maior ja usada
   * no contrato, para nao colidir com as originais no extrato.
   */
  gerarParcelas(maiorNumeroExistente: number): EspecificacaoDeParcela[] {
    return this.estado.termos.gerarPlanoDeParcelas().map((especificacao, indice) => ({
      ...especificacao,
      numero: maiorNumeroExistente + indice + 1,
      tipo: 'RENEGOCIACAO' as const,
      descricao:
        especificacao.tipo === 'ENTRADA'
          ? `Entrada do acordo de ${this.estado.acordadoEm.formatarBr()}`
          : `Acordo ${this.estado.acordadoEm.formatarBr()} — ${especificacao.descricao.toLowerCase()}`,
    }));
  }

  marcarComoCumprida(): void {
    if (this.estado.status !== 'VIGENTE') {
      throw new ErroDeRegraDeNegocio(`Acordo ja esta ${this.estado.status.toLowerCase()}.`);
    }
    this.estado.status = 'CUMPRIDA';
  }

  /** Cliente voltou a atrasar as parcelas do acordo. */
  marcarComoRompida(): void {
    if (this.estado.status !== 'VIGENTE') {
      throw new ErroDeRegraDeNegocio(`Acordo ja esta ${this.estado.status.toLowerCase()}.`);
    }
    this.estado.status = 'ROMPIDA';
  }

  cancelar(): void {
    if (this.estado.status === 'CUMPRIDA') {
      throw new ErroDeRegraDeNegocio('Acordo cumprido nao pode ser cancelado.');
    }
    this.estado.status = 'CANCELADA';
  }

  paraEstado(): Readonly<EstadoDaRenegociacao> {
    return { ...this.estado };
  }
}
