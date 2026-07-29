import { Entidade } from '../shared/entidade.js';
import { ErroDeRegraDeNegocio, ErroDeValidacao } from '../shared/errors.js';
import { Identificador } from '../shared/identificador.js';
import { DataCivil } from '../value-objects/data-civil.js';
import { Dinheiro } from '../value-objects/dinheiro.js';
import type { StatusDocumento, TipoDocumento } from './tipos.js';

interface EstadoDoDocumento {
  id: Identificador;
  contratoId: Identificador;
  parcelaId: Identificador;
  tipo: TipoDocumento;
  /** Nome do adaptador que emitiu (ex.: "fake", "asaas", "inter"). */
  provedor: string;
  identificadorExterno: string;
  nossoNumero: string | null;
  linhaDigitavel: string | null;
  codigoDeBarras: string | null;
  pixCopiaECola: string | null;
  pixQrCodeBase64: string | null;
  urlDoDocumento: string | null;
  valor: Dinheiro;
  vencimento: DataCivil;
  status: StatusDocumento;
  emitidoEm: Date;
  baixadoEm: Date | null;
}

/**
 * Boleto/Pix emitido para uma parcela.
 *
 * Reemitir nao edita o documento: cancela o vigente e cria outro com o valor
 * atualizado (principal + mora do dia). Assim o historico mostra exatamente
 * qual documento o cliente recebeu em cada momento — indispensavel quando o
 * cliente paga um boleto antigo e alguem precisa conciliar a diferenca.
 */
export class DocumentoDeCobranca extends Entidade {
  private constructor(private readonly estado: EstadoDoDocumento) {
    super(estado.id);
  }

  static novo(entrada: {
    id: Identificador;
    contratoId: Identificador;
    parcelaId: Identificador;
    tipo: TipoDocumento;
    provedor: string;
    identificadorExterno: string;
    nossoNumero?: string | null;
    linhaDigitavel?: string | null;
    codigoDeBarras?: string | null;
    pixCopiaECola?: string | null;
    pixQrCodeBase64?: string | null;
    urlDoDocumento?: string | null;
    valor: Dinheiro;
    vencimento: DataCivil;
    emitidoEm?: Date;
  }): DocumentoDeCobranca {
    if (!entrada.valor.ehPositivo()) {
      throw new ErroDeValidacao('Documento de cobranca precisa ter valor positivo.');
    }
    if (!entrada.identificadorExterno?.trim()) {
      throw new ErroDeValidacao('Documento de cobranca precisa do identificador do provedor.');
    }
    const exigePix = entrada.tipo === 'PIX' || entrada.tipo === 'BOLETO_COM_PIX';
    if (exigePix && !entrada.pixCopiaECola?.trim()) {
      throw new ErroDeValidacao(`Documento do tipo ${entrada.tipo} exige o codigo Pix copia e cola.`);
    }
    const exigeBoleto = entrada.tipo === 'BOLETO' || entrada.tipo === 'BOLETO_COM_PIX';
    if (exigeBoleto && !entrada.linhaDigitavel?.trim()) {
      throw new ErroDeValidacao(`Documento do tipo ${entrada.tipo} exige a linha digitavel.`);
    }

    return new DocumentoDeCobranca({
      id: entrada.id,
      contratoId: entrada.contratoId,
      parcelaId: entrada.parcelaId,
      tipo: entrada.tipo,
      provedor: entrada.provedor,
      identificadorExterno: entrada.identificadorExterno.trim(),
      nossoNumero: entrada.nossoNumero?.trim() || null,
      linhaDigitavel: entrada.linhaDigitavel?.trim() || null,
      codigoDeBarras: entrada.codigoDeBarras?.trim() || null,
      pixCopiaECola: entrada.pixCopiaECola?.trim() || null,
      pixQrCodeBase64: entrada.pixQrCodeBase64?.trim() || null,
      urlDoDocumento: entrada.urlDoDocumento?.trim() || null,
      valor: entrada.valor,
      vencimento: entrada.vencimento,
      status: 'EMITIDO',
      emitidoEm: entrada.emitidoEm ?? new Date(),
      baixadoEm: null,
    });
  }

  static restaurar(estado: EstadoDoDocumento): DocumentoDeCobranca {
    return new DocumentoDeCobranca({ ...estado });
  }

  get contratoId(): Identificador {
    return this.estado.contratoId;
  }

  get parcelaId(): Identificador {
    return this.estado.parcelaId;
  }

  get tipo(): TipoDocumento {
    return this.estado.tipo;
  }

  get provedor(): string {
    return this.estado.provedor;
  }

  get identificadorExterno(): string {
    return this.estado.identificadorExterno;
  }

  get nossoNumero(): string | null {
    return this.estado.nossoNumero;
  }

  get linhaDigitavel(): string | null {
    return this.estado.linhaDigitavel;
  }

  get codigoDeBarras(): string | null {
    return this.estado.codigoDeBarras;
  }

  get pixCopiaECola(): string | null {
    return this.estado.pixCopiaECola;
  }

  get pixQrCodeBase64(): string | null {
    return this.estado.pixQrCodeBase64;
  }

  get urlDoDocumento(): string | null {
    return this.estado.urlDoDocumento;
  }

  get valor(): Dinheiro {
    return this.estado.valor;
  }

  get vencimento(): DataCivil {
    return this.estado.vencimento;
  }

  get status(): StatusDocumento {
    return this.estado.status;
  }

  get emitidoEm(): Date {
    return this.estado.emitidoEm;
  }

  get baixadoEm(): Date | null {
    return this.estado.baixadoEm;
  }

  estaVigente(): boolean {
    return this.estado.status === 'EMITIDO';
  }

  /** Um documento vencido continua pagavel com mora; expirado nao. */
  estaVencidoEm(dataReferencia: DataCivil): boolean {
    return this.estaVigente() && this.estado.vencimento.anteriorA(dataReferencia);
  }

  registrarPagamento(baixadoEm = new Date()): void {
    if (this.estado.status === 'CANCELADO') {
      throw new ErroDeRegraDeNegocio('Documento cancelado nao pode ser baixado.');
    }
    this.estado.status = 'PAGO';
    this.estado.baixadoEm = baixadoEm;
  }

  cancelar(): void {
    if (this.estado.status === 'PAGO') {
      throw new ErroDeRegraDeNegocio('Documento pago nao pode ser cancelado.');
    }
    this.estado.status = 'CANCELADO';
  }

  expirar(): void {
    if (!this.estaVigente()) return;
    this.estado.status = 'EXPIRADO';
  }

  paraEstado(): Readonly<EstadoDoDocumento> {
    return { ...this.estado };
  }
}
