/**
 * Teste isolado da conexão com o Twilio.
 *
 * Lê as credenciais de api/.env e envia UMA mensagem de WhatsApp para o número
 * informado, sem passar pelo resto do sistema — assim dá para validar o Twilio
 * separadamente da régua e do banco.
 *
 * Uso:
 *   npx tsx scripts/testar-twilio.ts +5595991371313
 *   npx tsx scripts/testar-twilio.ts +5595991371313 SMS
 *
 * No sandbox, o número de destino precisa ter entrado antes (mandar
 * "join <codigo>" para o número do sandbox pelo WhatsApp).
 */
import { ambiente } from '../src/infrastructure/config/ambiente.js';
import { MensageriaTwilio } from '../src/infrastructure/mensageria/mensageria-twilio.js';
import type { Canal } from '../src/domain/cobranca/tipos.js';

async function principal(): Promise<void> {
  const destino = process.argv[2];
  const canal = (process.argv[3]?.toUpperCase() as Canal) ?? 'WHATSAPP';

  if (!destino) {
    console.error('Informe o número de destino. Ex.: npx tsx scripts/testar-twilio.ts +5595991371313');
    process.exit(1);
  }

  console.info(`Provedor configurado: ${ambiente.provedorDeMensageria}`);
  console.info(`Enviando ${canal} para ${destino}…`);

  const mensageria = new MensageriaTwilio(ambiente.twilio);
  const resultado = await mensageria.enviar({
    canal,
    destino,
    assunto: null,
    corpo: 'Gestrato: teste de conexão com o Twilio. Se você recebeu isto, está funcionando. ✅',
  });

  if (resultado.sucesso) {
    console.info(`✅ Enviado! ID no provedor: ${resultado.identificadorNoProvedor}`);
  } else {
    console.error(`❌ Falhou: ${resultado.erro}`);
    process.exit(1);
  }
}

principal().catch((falha) => {
  console.error(falha instanceof Error ? falha.message : falha);
  process.exit(1);
});
