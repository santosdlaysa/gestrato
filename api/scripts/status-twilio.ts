/**
 * Consulta o status de entrega de uma mensagem no Twilio pelo SID.
 *
 * "Enviado" (SID retornado) só significa que o Twilio aceitou; a entrega no
 * WhatsApp vem depois e pode falhar. Este script mostra o status final e, em
 * caso de falha, o código/mensagem de erro do Twilio — que diz exatamente o
 * motivo (ex.: 63007 = número não entrou no sandbox; 63016 = fora da janela
 * de 24h, precisa de template aprovado).
 *
 * Uso:
 *   npx tsx scripts/status-twilio.ts SMe705f91ce4c2e393fcf37f74f5493c44
 */
import { ambiente } from '../src/infrastructure/config/ambiente.js';

interface RespostaDoStatus {
  status?: string;
  from?: string;
  to?: string;
  date_sent?: string | null;
  error_code?: number | null;
  error_message?: string | null;
  message?: string;
}

async function principal(): Promise<void> {
  const sid = process.argv[2];
  if (!sid) {
    console.error('Informe o SID. Ex.: npx tsx scripts/status-twilio.ts SMxxxxxxxx');
    process.exit(1);
  }

  const { accountSid, authToken } = ambiente.twilio;
  if (!accountSid || !authToken) {
    console.error('Faltam TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN no api/.env.');
    process.exit(1);
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages/${sid}.json`;
  const autorizacao = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`;

  const resposta = await fetch(url, { headers: { Authorization: autorizacao } });
  const dados = (await resposta.json().catch(() => null)) as RespostaDoStatus | null;

  if (!resposta.ok) {
    console.error(`Twilio respondeu ${resposta.status}: ${dados?.message ?? 'erro desconhecido'}`);
    process.exit(1);
  }

  console.info(`Status:      ${dados?.status ?? '—'}`);
  console.info(`De:          ${dados?.from ?? '—'}`);
  console.info(`Para:        ${dados?.to ?? '—'}`);
  console.info(`Enviada em:  ${dados?.date_sent ?? '(ainda não entregue)'}`);
  console.info(`Erro código: ${dados?.error_code ?? '—'}`);
  console.info(`Erro msg:    ${dados?.error_message ?? '—'}`);
}

principal().catch((falha) => {
  console.error(falha instanceof Error ? falha.message : falha);
  process.exit(1);
});
