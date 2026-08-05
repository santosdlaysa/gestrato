import type {
  Mensageria,
  MensagemParaEnvio,
  ResultadoDoEnvio,
} from '../../application/ports/mensageria.js';
import type { Canal } from '../../domain/cobranca/tipos.js';

export interface ConfiguracaoTwilio {
  readonly accountSid: string;
  readonly authToken: string;
  /** Remetente de WhatsApp no Twilio (ex.: +14155238886). Vazio desliga o canal. */
  readonly whatsappFrom: string;
  /** Remetente de SMS no Twilio (ex.: +12025550123). Vazio desliga o canal. */
  readonly smsFrom: string;
  /**
   * URL absoluta que o Twilio chama a cada mudança de status da mensagem
   * (enviada → entregue → lida, ou não entregue). Vazio desliga a confirmação.
   */
  readonly statusCallbackUrl?: string;
}

/**
 * Envio real de WhatsApp e SMS pela API do Twilio.
 *
 * O Twilio NÃO envia e-mail (isso é SendGrid/Resend), então este adaptador só
 * suporta WHATSAPP e SMS — e apenas os que tiverem remetente configurado. Um
 * evento da régua que peça e-mail simplesmente não casa canal aqui e a cobrança
 * conta como "sem canal" no resumo do dia, sem quebrar o ciclo.
 *
 * Nunca lança por falha de entrega: devolve `sucesso: false` com o motivo, como
 * a porta `Mensageria` exige — uma mensagem recusada não pode derrubar as outras.
 */
export class MensageriaTwilio implements Mensageria {
  readonly nome = 'twilio';
  private readonly url: string;
  private readonly canais: readonly Canal[];
  private readonly autorizacao: string;

  constructor(private readonly config: ConfiguracaoTwilio) {
    if (!config.accountSid || !config.authToken) {
      throw new Error(
        'Twilio exige TWILIO_ACCOUNT_SID e TWILIO_AUTH_TOKEN. Preencha em api/.env.',
      );
    }
    if (!config.whatsappFrom && !config.smsFrom) {
      throw new Error(
        'Configure ao menos TWILIO_WHATSAPP_FROM ou TWILIO_SMS_FROM para o Twilio ter por onde enviar.',
      );
    }

    this.url = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`;
    this.autorizacao = `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64')}`;

    const canais: Canal[] = [];
    if (config.whatsappFrom) canais.push('WHATSAPP');
    if (config.smsFrom) canais.push('SMS');
    this.canais = canais;
  }

  canaisSuportados(): readonly Canal[] {
    return this.canais;
  }

  async enviar(mensagem: MensagemParaEnvio): Promise<ResultadoDoEnvio> {
    const rota = this.enderecar(mensagem);
    if (!rota) {
      return {
        sucesso: false,
        identificadorNoProvedor: null,
        erro: `Canal ${mensagem.canal} não está configurado no Twilio.`,
      };
    }

    const corpo = new URLSearchParams({ From: rota.de, To: rota.para, Body: mensagem.corpo });
    // Pede ao Twilio que avise cada mudança de status (entregue/lida/falhou) no
    // webhook do sistema — é o que alimenta a linha do tempo da cobrança.
    if (this.config.statusCallbackUrl) corpo.set('StatusCallback', this.config.statusCallbackUrl);

    try {
      const resposta = await fetch(this.url, {
        method: 'POST',
        headers: {
          Authorization: this.autorizacao,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: corpo.toString(),
      });

      const dados = (await resposta.json().catch(() => null)) as {
        sid?: string;
        message?: string;
        code?: number;
      } | null;

      if (!resposta.ok) {
        const motivo = dados?.message
          ? `Twilio ${dados.code ?? resposta.status}: ${dados.message}`
          : `Twilio respondeu ${resposta.status}.`;
        return { sucesso: false, identificadorNoProvedor: null, erro: motivo };
      }

      return { sucesso: true, identificadorNoProvedor: dados?.sid ?? null, erro: null };
    } catch (falha) {
      const motivo = falha instanceof Error ? falha.message : 'Falha de rede ao chamar o Twilio.';
      return { sucesso: false, identificadorNoProvedor: null, erro: motivo };
    }
  }

  /** Monta remetente/destinatário no formato que o Twilio espera por canal. */
  private enderecar(mensagem: MensagemParaEnvio): { de: string; para: string } | null {
    const destino = comMais(mensagem.destino);
    switch (mensagem.canal) {
      case 'WHATSAPP': {
        if (!this.config.whatsappFrom) return null;
        // WhatsApp brasileiro é registrado sem o nono dígito — ver whatsAppBrasil.
        const para = whatsAppBrasil(destino);
        return { de: `whatsapp:${comMais(this.config.whatsappFrom)}`, para: `whatsapp:${para}` };
      }
      case 'SMS':
        if (!this.config.smsFrom) return null;
        return { de: comMais(this.config.smsFrom), para: destino };
      case 'EMAIL':
        return null;
    }
  }
}

/**
 * Ajusta o "nono dígito" para o WhatsApp brasileiro.
 *
 * Celular no Brasil tem 9 dígitos (o nono dígito, um "9" na frente do número),
 * mas o WhatsApp registra a maioria dos números SEM esse 9. Mandar com ele faz
 * a entrega falhar (erro 63015 do Twilio). Para número +55 de celular (13
 * dígitos), removemos o 9 extra. Só vale para WhatsApp — SMS usa o número cheio.
 *
 * Ex.: +5595991371313  ->  +559591371313
 */
function whatsAppBrasil(e164: string): string {
  const casa = e164.match(/^\+55(\d{2})9(\d{8})$/);
  return casa ? `+55${casa[1]}${casa[2]}` : e164;
}

/**
 * Garante o prefixo "+" do formato E.164.
 *
 * O destino chega do serviço de cobrança só com dígitos (ex.: 5595991371313);
 * o Twilio exige o "+" na frente. Já configurado com "+", mantém como está.
 */
function comMais(numero: string): string {
  const limpo = numero.trim();
  if (limpo.startsWith('+')) return limpo;
  return `+${limpo.replace(/\D/g, '')}`;
}
