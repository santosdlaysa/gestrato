import { Entidade } from '../shared/entidade.js';
import { ErroDeRegraDeNegocio, ErroDeValidacao } from '../shared/errors.js';
import { Identificador } from '../shared/identificador.js';
import { DataCivil } from '../value-objects/data-civil.js';
import { Dinheiro } from '../value-objects/dinheiro.js';
import { Percentual } from '../value-objects/percentual.js';
import type { Parcela } from './parcela.js';
import { PoliticaDeEncargos } from './politica-de-encargos.js';
import { PoliticaDeInadimplencia } from './politica-de-inadimplencia.js';
import { TermosDoFinanciamento } from './termos-do-financiamento.js';
import type { IndiceReajuste, SituacaoContrato, StatusContrato } from './tipos.js';

/** Visao consolidada do contrato numa data — o que o extrato e o dashboard mostram. */
export interface PosicaoFinanceira {
  readonly valorTotal: Dinheiro;
  readonly totalRecebido: Dinheiro;
  readonly saldoDevedor: Dinheiro;
  readonly totalVencido: Dinheiro;
  readonly totalAVencer: Dinheiro;
  readonly encargosAcumulados: Dinheiro;
  readonly parcelasPagas: number;
  readonly parcelasEmAberto: number;
  readonly parcelasVencidas: number;
  readonly proximoVencimento: DataCivil | null;
  readonly diasDeAtrasoMaximo: number;
  readonly situacao: SituacaoContrato;
  /** Dias que faltam para o lote ficar sujeito a retomada. Zero quando ja passou. */
  readonly diasAteARetomada: number;
}

interface EstadoDoContrato {
  id: Identificador;
  numero: string;
  clienteId: Identificador;
  loteId: Identificador;
  corretorId: Identificador | null;
  termos: TermosDoFinanciamento;
  politicaDeEncargos: PoliticaDeEncargos;
  indiceReajuste: IndiceReajuste;
  status: StatusContrato;
  dataAssinatura: DataCivil;
  observacoes: string | null;
}

/**
 * Raiz do sistema: e do contrato que nascem todas as cobrancas.
 *
 * O contrato guarda as condicoes comerciais e a politica de mora; as parcelas
 * sao entidades separadas porque tem ciclo de vida proprio (baixa, renegociacao,
 * emissao de boleto) e um contrato de 240 meses nao deve ser carregado inteiro
 * a cada operacao. Os metodos que consolidam recebem as parcelas por parametro.
 */
export class Contrato extends Entidade {
  private constructor(private readonly estado: EstadoDoContrato) {
    super(estado.id);
  }

  static novo(entrada: {
    id: Identificador;
    numero: string;
    clienteId: Identificador;
    loteId: Identificador;
    corretorId?: Identificador | null;
    termos: TermosDoFinanciamento;
    politicaDeEncargos?: PoliticaDeEncargos;
    indiceReajuste?: IndiceReajuste;
    dataAssinatura: DataCivil;
    observacoes?: string | null;
  }): Contrato {
    const numero = entrada.numero?.trim();
    if (!numero) {
      throw new ErroDeValidacao('Numero do contrato e obrigatorio.');
    }
    return new Contrato({
      id: entrada.id,
      numero,
      clienteId: entrada.clienteId,
      loteId: entrada.loteId,
      corretorId: entrada.corretorId ?? null,
      termos: entrada.termos,
      politicaDeEncargos: entrada.politicaDeEncargos ?? PoliticaDeEncargos.PADRAO,
      indiceReajuste: entrada.indiceReajuste ?? 'NENHUM',
      status: 'ATIVO',
      dataAssinatura: entrada.dataAssinatura,
      observacoes: entrada.observacoes?.trim() || null,
    });
  }

  static restaurar(estado: EstadoDoContrato): Contrato {
    return new Contrato({ ...estado });
  }

  get numero(): string {
    return this.estado.numero;
  }

  get clienteId(): Identificador {
    return this.estado.clienteId;
  }

  get loteId(): Identificador {
    return this.estado.loteId;
  }

  get corretorId(): Identificador | null {
    return this.estado.corretorId;
  }

  get termos(): TermosDoFinanciamento {
    return this.estado.termos;
  }

  get politicaDeEncargos(): PoliticaDeEncargos {
    return this.estado.politicaDeEncargos;
  }

  get indiceReajuste(): IndiceReajuste {
    return this.estado.indiceReajuste;
  }

  get status(): StatusContrato {
    return this.estado.status;
  }

  get dataAssinatura(): DataCivil {
    return this.estado.dataAssinatura;
  }

  get observacoes(): string | null {
    return this.estado.observacoes;
  }

  estaAtivo(): boolean {
    return this.estado.status === 'ATIVO';
  }

  /** Contrato encerrado nao gera nem recebe cobranca. */
  estaEncerrado(): boolean {
    return this.estado.status !== 'ATIVO';
  }

  /** Gera as parcelas iniciais. So vale para contrato recem-criado. */
  gerarPlanoDeParcelas() {
    return this.estado.termos.gerarPlanoDeParcelas();
  }

  garantirQuePodeReceberCobranca(): void {
    if (this.estaEncerrado()) {
      throw new ErroDeRegraDeNegocio(
        `Contrato ${this.estado.numero} esta ${this.estado.status.toLowerCase()} e nao movimenta cobranca.`,
      );
    }
  }

  /**
   * Quita o contrato. Exige que nao reste parcela em aberto — a quitacao e
   * consequencia do recebimento, nunca um atalho manual sobre saldo devedor.
   */
  quitar(parcelas: readonly Parcela[]): void {
    if (this.estado.status === 'QUITADO') return;
    this.garantirQuePodeReceberCobranca();

    const emAberto = parcelas.filter((parcela) => parcela.estaEmAberto());
    if (emAberto.length > 0) {
      throw new ErroDeRegraDeNegocio(
        `Contrato ${this.estado.numero} ainda tem ${emAberto.length} parcela(s) em aberto.`,
      );
    }
    this.estado.status = 'QUITADO';
  }

  /** Quita automaticamente quando a ultima parcela em aberto e baixada. */
  quitarSeTotalmenteRecebido(parcelas: readonly Parcela[]): boolean {
    if (!this.estaAtivo()) return false;
    if (parcelas.some((parcela) => parcela.estaEmAberto())) return false;
    if (!parcelas.some((parcela) => parcela.estaQuitada())) return false;
    this.estado.status = 'QUITADO';
    return true;
  }

  cancelar(): void {
    if (this.estado.status === 'QUITADO') {
      throw new ErroDeRegraDeNegocio('Contrato quitado nao pode ser cancelado.');
    }
    this.estado.status = 'CANCELADO';
  }

  distratar(): void {
    if (this.estado.status === 'QUITADO') {
      throw new ErroDeRegraDeNegocio('Contrato quitado nao pode ser distratado.');
    }
    this.estado.status = 'DISTRATADO';
  }

  reabrir(): void {
    if (this.estado.status === 'ATIVO') return;
    this.estado.status = 'ATIVO';
  }

  alterarPoliticaDeEncargos(politica: PoliticaDeEncargos): void {
    this.garantirQuePodeReceberCobranca();
    this.estado.politicaDeEncargos = politica;
  }

  alterarObservacoes(observacoes: string | null): void {
    this.estado.observacoes = observacoes?.trim() || null;
  }

  /** Fator de reajuste a aplicar nas parcelas futuras (ex.: 5,5% -> 0,055). */
  fatorDeReajuste(percentual: Percentual): number {
    if (this.estado.indiceReajuste === 'NENHUM') {
      throw new ErroDeRegraDeNegocio(
        `Contrato ${this.estado.numero} nao preve indice de reajuste.`,
      );
    }
    return percentual.fator;
  }

  /**
   * Consolida a posicao do contrato numa data de referencia. Recebe as parcelas
   * de fora para nao acoplar a raiz ao repositorio.
   */
  posicaoEm(
    parcelas: readonly Parcela[],
    dataReferencia: DataCivil,
    politicaDeInadimplencia: PoliticaDeInadimplencia = PoliticaDeInadimplencia.PADRAO,
  ): PosicaoFinanceira {
    const vigentes = parcelas.filter((parcela) => parcela.status !== 'CANCELADA' && parcela.status !== 'RENEGOCIADA');
    const emAberto = vigentes.filter((parcela) => parcela.estaEmAberto());
    const vencidas = emAberto.filter((parcela) => parcela.estaVencidaEm(dataReferencia));

    const demonstrativosVencidos = vencidas.map((parcela) =>
      parcela.demonstrativoEm(this.estado.politicaDeEncargos, dataReferencia),
    );

    const saldoDevedor = Dinheiro.somaDe(emAberto.map((parcela) => parcela.saldoPrincipal()));
    const totalVencido = Dinheiro.somaDe(demonstrativosVencidos.map((d) => d.total));
    const encargosAcumulados = Dinheiro.somaDe(
      demonstrativosVencidos.map((d) => d.multa.somar(d.juros)),
    );

    const proximosVencimentos = emAberto
      .filter((parcela) => !parcela.vencimento.anteriorA(dataReferencia))
      .map((parcela) => parcela.vencimento);

    // Vale sempre o pior caso: um contrato com uma parcela de 100 dias e outra
    // de 2 esta sujeito a retomada, nao "em atraso".
    const diasDeAtrasoMaximo = Math.max(
      0,
      ...vencidas.map((parcela) => parcela.diasDeAtrasoEm(dataReferencia)),
    );

    return {
      valorTotal: this.estado.termos.valorTotal,
      totalRecebido: Dinheiro.somaDe(vigentes.map((parcela) => parcela.totalRecebido)),
      saldoDevedor,
      totalVencido,
      totalAVencer: saldoDevedor
        .subtrair(Dinheiro.somaDe(demonstrativosVencidos.map((d) => d.saldoPrincipal)))
        .naoNegativo(),
      encargosAcumulados,
      parcelasPagas: vigentes.filter((parcela) => parcela.estaQuitada()).length,
      parcelasEmAberto: emAberto.length,
      parcelasVencidas: vencidas.length,
      proximoVencimento: DataCivil.minima(proximosVencimentos),
      diasDeAtrasoMaximo,
      situacao: this.situacaoEm(diasDeAtrasoMaximo, politicaDeInadimplencia),
      diasAteARetomada: politicaDeInadimplencia.diasAteARetomada(diasDeAtrasoMaximo),
    };
  }

  /**
   * Contrato encerrado tem situacao propria; contrato ativo e classificado pelo
   * maior atraso entre suas parcelas, seguindo a escala da politica.
   */
  private situacaoEm(
    diasDeAtrasoMaximo: number,
    politica: PoliticaDeInadimplencia,
  ): SituacaoContrato {
    switch (this.estado.status) {
      case 'QUITADO':
        return 'QUITADO';
      case 'CANCELADO':
        return 'CANCELADO';
      case 'DISTRATADO':
        return 'DISTRATADO';
      default:
        return politica.classificar(diasDeAtrasoMaximo);
    }
  }

  paraEstado(): Readonly<EstadoDoContrato> {
    return { ...this.estado };
  }
}
