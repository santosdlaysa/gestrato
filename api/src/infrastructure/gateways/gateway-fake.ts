import { createHash, randomUUID } from 'node:crypto';
import type {
  DocumentoEmitido,
  GatewayDeCobranca,
  NotificacaoDePagamento,
  PedidoDeEmissao,
} from '../../application/ports/gateway-de-cobranca.js';
import { DataCivil } from '../../domain/value-objects/data-civil.js';
import { Dinheiro } from '../../domain/value-objects/dinheiro.js';
import { formatarLinhaDigitavel, montarCodigoDeBarras, montarLinhaDigitavel } from './febraban.js';
import { montarPixCopiaECola } from './pix-br-code.js';

/** Banco ficticio — deixa evidente no extrato que o documento nao e real. */
const CODIGO_DO_BANCO_FICTICIO = '999';
const CHAVE_PIX_FICTICIA = 'gestrato@exemplo.invalido';

/**
 * Adaptador de desenvolvimento.
 *
 * A loteadora ainda nao escolheu o banco/gateway. Ate escolher, este adaptador
 * mantem todo o fluxo de cobranca funcionando de ponta a ponta: emite documento
 * com linha digitavel e Pix estruturalmente validos, aceita reemissao e
 * cancelamento, e sabe interpretar um webhook de teste.
 *
 * NAO gera cobranca pagavel. Ao plugar Asaas, Cora ou Banco Inter, basta uma
 * nova classe implementando `GatewayDeCobranca` — nenhuma regra de negocio,
 * caso de uso ou entidade muda.
 */
export class GatewayDeCobrancaFake implements GatewayDeCobranca {
  readonly nome = 'fake';

  constructor(
    private readonly nomeDoRecebedor: string,
    private readonly cidadeDoRecebedor: string,
    private readonly urlPublica: string,
  ) {}

  async emitir(pedido: PedidoDeEmissao): Promise<DocumentoEmitido> {
    // Derivar o identificador da chave de idempotencia faz o retry de uma
    // emissao devolver o mesmo documento, como um provedor real faria.
    const identificadorExterno = `fake_${resumo(pedido.chaveDeIdempotencia, 24)}`;
    const nossoNumero = resumoNumerico(pedido.chaveDeIdempotencia, 11);

    const precisaDeBoleto = pedido.tipo === 'BOLETO' || pedido.tipo === 'BOLETO_COM_PIX';
    const precisaDePix = pedido.tipo === 'PIX' || pedido.tipo === 'BOLETO_COM_PIX';

    const codigoDeBarras = precisaDeBoleto
      ? montarCodigoDeBarras({
          codigoDoBanco: CODIGO_DO_BANCO_FICTICIO,
          vencimento: pedido.vencimento,
          valor: pedido.valor,
          campoLivre: nossoNumero + resumoNumerico(identificadorExterno, 14),
        })
      : null;

    const linhaDigitavel = codigoDeBarras ? montarLinhaDigitavel(codigoDeBarras) : null;

    const pixCopiaECola = precisaDePix
      ? montarPixCopiaECola({
          chave: CHAVE_PIX_FICTICIA,
          nomeDoRecebedor: this.nomeDoRecebedor,
          cidadeDoRecebedor: this.cidadeDoRecebedor,
          valor: pedido.valor,
          identificador: nossoNumero,
        })
      : null;

    return {
      identificadorExterno,
      nossoNumero,
      linhaDigitavel: linhaDigitavel ? formatarLinhaDigitavel(linhaDigitavel) : null,
      codigoDeBarras,
      pixCopiaECola,
      // Um provedor real devolveria o PNG do QR Code aqui.
      pixQrCodeBase64: null,
      urlDoDocumento: `${this.urlPublica}/documentos/${identificadorExterno}`,
    };
  }

  async cancelar(identificadorExterno: string): Promise<void> {
    console.info(`[gateway:fake] documento cancelado: ${identificadorExterno}`);
  }

  /** Sem provedor real nao ha o que consultar — a baixa vem do webhook de teste. */
  async consultar(): Promise<NotificacaoDePagamento | null> {
    return null;
  }

  /**
   * Aceita um corpo simples para permitir simular a conciliacao em
   * desenvolvimento:
   *
   *   POST /api/webhooks/cobranca/fake
   *   { "identificadorExterno": "fake_...", "evento": "PAGAMENTO_CONFIRMADO",
   *     "valorCentavos": 86029, "pagoEm": "2026-10-17" }
   */
  interpretarWebhook(corpo: unknown, _cabecalhos: Record<string, string> = {}): NotificacaoDePagamento | null {
    if (typeof corpo !== 'object' || corpo === null) return null;
    const dados = corpo as Record<string, unknown>;

    const identificadorExterno = typeof dados.identificadorExterno === 'string' ? dados.identificadorExterno : null;
    if (!identificadorExterno) return null;

    return {
      identificadorExterno,
      tipo: interpretarTipo(dados.evento),
      valorPago:
        typeof dados.valorCentavos === 'number' ? Dinheiro.deCentavos(dados.valorCentavos) : null,
      pagoEm: typeof dados.pagoEm === 'string' ? DataCivil.deIso(dados.pagoEm) : null,
      identificadorDoEvento:
        typeof dados.identificadorDoEvento === 'string' ? dados.identificadorDoEvento : randomUUID(),
    };
  }
}

function interpretarTipo(evento: unknown): NotificacaoDePagamento['tipo'] {
  switch (evento) {
    case 'PAGAMENTO_CONFIRMADO':
    case 'PAGAMENTO_ESTORNADO':
    case 'DOCUMENTO_CANCELADO':
      return evento;
    default:
      return 'DESCONHECIDO';
  }
}

function resumo(semente: string, tamanho: number): string {
  return createHash('sha256').update(semente).digest('hex').slice(0, tamanho);
}

function resumoNumerico(semente: string, tamanho: number): string {
  const digitos = BigInt(`0x${createHash('sha256').update(semente).digest('hex').slice(0, 16)}`).toString();
  return digitos.padStart(tamanho, '0').slice(-tamanho);
}
