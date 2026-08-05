import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
config();

const BASE = 'http://localhost:3333/api';

async function main() {
  const prisma = new PrismaClient();
  const SID = 'SMTESTE' + Date.now();

  // 1) cobrança descartável, com SID conhecido
  const cob = await prisma.cobranca.create({
    data: {
      contratoId: '9cfdf37b-9bfd-41e8-aefd-f6a19dfdf50e',
      parcelaId: 'b33263cf-b232-423c-a532-66f5b4326562',
      clienteId: '9e32633d-9d32-41aa-ac32-60179b325e84',
      chaveDeIdempotencia: 'TESTE-WEBHOOK-' + SID,
      gatilho: 'APOS_O_VENCIMENTO', dias: 1, canal: 'WHATSAPP', destino: '5514997451188',
      mensagem: 'Mensagem de teste (descartavel).', valorCobradoCentavos: 12345,
      dataDeReferencia: new Date('2026-08-05'), status: 'ENVIADA',
      enviadaEm: new Date(), identificadorNoProvedor: SID,
    },
  });
  console.log('cobranca de teste:', cob.id, 'sid:', SID);

  // 2) webhook do Twilio: delivered, depois read
  for (const status of ['delivered', 'read']) {
    const r = await fetch(`${BASE}/webhooks/mensageria/twilio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ MessageSid: SID, MessageStatus: status }).toString(),
    });
    console.log(`webhook ${status} -> HTTP ${r.status}`, await r.text());
  }

  // 3) webhook com SID desconhecido (deve casar=false, 200)
  const semCasar = await fetch(`${BASE}/webhooks/mensageria/twilio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ MessageSid: 'SID_INEXISTENTE', MessageStatus: 'delivered' }).toString(),
  });
  console.log('webhook sid inexistente -> HTTP', semCasar.status, await semCasar.text());

  // 4) linha do tempo pela API (autenticada)
  const login = await fetch(`${BASE}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@gestrato.local', senha: 'admin123' }),
  });
  const { token } = (await login.json()) as { token: string };
  const det = await fetch(`${BASE}/cobrancas/${cob.id}/transicoes`, { headers: { Authorization: `Bearer ${token}` } });
  const corpo = (await det.json()) as any;
  console.log('\n--- GET /cobrancas/:id/transicoes -> HTTP', det.status, '---');
  console.log('status final da cobranca:', corpo.cobranca?.status);
  for (const t of corpo.transicoes ?? []) {
    console.log(`  [${t.origem}] ${t.status}${t.statusProvedor ? ` (${t.statusProvedor})` : ''} @ ${t.ocorridoEm} — ${t.detalhe ?? ''}`);
  }

  // 5) limpeza: apaga a cobrança de teste (cascade remove as transições)
  await prisma.cobranca.delete({ where: { id: cob.id } });
  console.log('\ncobranca de teste apagada. ok.');
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
