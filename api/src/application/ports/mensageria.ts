import type { Canal } from '../../domain/cobranca/tipos.js';

export interface MensagemParaEnvio {
  readonly canal: Canal;
  readonly destino: string;
  readonly assunto: string | null;
  readonly corpo: string;
}

export interface ResultadoDoEnvio {
  readonly sucesso: boolean;
  readonly identificadorNoProvedor: string | null;
  readonly erro: string | null;
}

/**
 * Porta de envio de WhatsApp, SMS e e-mail.
 *
 * Nunca lanca por falha de entrega: devolve `sucesso: false` com o motivo, para
 * a regua registrar a falha naquela cobranca e seguir com as outras. Uma
 * mensagem que nao saiu nao pode derrubar o job das outras trezentas.
 */
export interface Mensageria {
  readonly nome: string;
  canaisSuportados(): readonly Canal[];
  enviar(mensagem: MensagemParaEnvio): Promise<ResultadoDoEnvio>;
}
