import { randomUUID } from 'node:crypto';
import type { Mensageria, MensagemParaEnvio, ResultadoDoEnvio } from '../../application/ports/mensageria.js';
import { CANAIS, type Canal } from '../../domain/cobranca/tipos.js';

/**
 * Adaptador de desenvolvimento: registra no console em vez de enviar.
 *
 * Mantem o fluxo completo da regua exercitavel — as cobrancas sao criadas,
 * gravadas no historico e marcadas como enviadas — sem gastar credito de
 * WhatsApp nem, pior, mandar mensagem de teste para cliente de verdade.
 *
 * Para produzir envio real, implemente `Mensageria` sobre a API escolhida
 * (Twilio, Meta Cloud API, Zenvia, SES...) e troque a instancia na composicao.
 */
export class MensageriaConsole implements Mensageria {
  readonly nome = 'console';

  canaisSuportados(): readonly Canal[] {
    return CANAIS;
  }

  async enviar(mensagem: MensagemParaEnvio): Promise<ResultadoDoEnvio> {
    const cabecalho = `[mensageria:console] ${mensagem.canal} -> ${mensagem.destino}`;
    console.info(
      mensagem.assunto ? `${cabecalho}\nAssunto: ${mensagem.assunto}` : cabecalho,
    );
    console.info(mensagem.corpo);
    console.info('-'.repeat(60));

    return { sucesso: true, identificadorNoProvedor: `console_${randomUUID()}`, erro: null };
  }
}
