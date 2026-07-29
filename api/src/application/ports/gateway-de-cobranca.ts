import type { DataCivil } from '../../domain/value-objects/data-civil.js';
import type { Dinheiro } from '../../domain/value-objects/dinheiro.js';
import type { TipoDocumento } from '../../domain/cobranca/tipos.js';

export interface PagadorDoDocumento {
  readonly nome: string;
  readonly documento: string;
  readonly email: string | null;
  readonly telefone: string | null;
  readonly logradouro: string;
  readonly numero: string;
  readonly complemento: string | null;
  readonly bairro: string;
  readonly cidade: string;
  readonly uf: string;
  readonly cep: string;
}

export interface PedidoDeEmissao {
  readonly tipo: TipoDocumento;
  /** Referencia legivel no extrato do banco (ex.: "Contrato 2026/0001 - parcela 12"). */
  readonly referencia: string;
  readonly descricao: string;
  readonly valor: Dinheiro;
  readonly vencimento: DataCivil;
  readonly pagador: PagadorDoDocumento;
  /** Multa e juros ja calculados, para o banco aplicar apos o vencimento. */
  readonly multaPercentual: number;
  readonly jurosAoMesPercentual: number;
  /** Chave para o provedor nao emitir dois documentos iguais em caso de retry. */
  readonly chaveDeIdempotencia: string;
}

export interface DocumentoEmitido {
  readonly identificadorExterno: string;
  readonly nossoNumero: string | null;
  readonly linhaDigitavel: string | null;
  readonly codigoDeBarras: string | null;
  readonly pixCopiaECola: string | null;
  readonly pixQrCodeBase64: string | null;
  readonly urlDoDocumento: string | null;
}

/** Evento normalizado de um webhook, ja traduzido do formato do provedor. */
export interface NotificacaoDePagamento {
  readonly identificadorExterno: string;
  readonly tipo: 'PAGAMENTO_CONFIRMADO' | 'PAGAMENTO_ESTORNADO' | 'DOCUMENTO_CANCELADO' | 'DESCONHECIDO';
  readonly valorPago: Dinheiro | null;
  readonly pagoEm: DataCivil | null;
  readonly identificadorDoEvento: string;
}

/**
 * Porta de emissao de boleto/Pix.
 *
 * O banco/gateway ainda nao foi escolhido pela loteadora. Enquanto nao for,
 * roda o adaptador `fake`; plugar Asaas, Cora ou Banco Inter e implementar esta
 * interface e trocar uma linha na composicao — nenhuma regra de negocio muda.
 */
export interface GatewayDeCobranca {
  /** Nome curto gravado no documento (`fake`, `asaas`, `inter`...). */
  readonly nome: string;

  emitir(pedido: PedidoDeEmissao): Promise<DocumentoEmitido>;

  cancelar(identificadorExterno: string): Promise<void>;

  consultar(identificadorExterno: string): Promise<NotificacaoDePagamento | null>;

  /**
   * Traduz o corpo cru do webhook para o formato do sistema. Devolve `null`
   * quando o evento nao interessa (o provedor manda muita coisa irrelevante).
   */
  interpretarWebhook(corpo: unknown, cabecalhos: Record<string, string>): NotificacaoDePagamento | null;
}
