import { criarContainer } from '../composicao/container.js';
import { DataCivil } from '../domain/value-objects/data-civil.js';
import { prisma } from '../infrastructure/persistence/prisma/cliente-prisma.js';

/**
 * Ciclo diario de cobranca, para rodar por agendador (cron, Task Scheduler).
 *
 *   npm run job:cobranca                    # hoje, enviando de verdade
 *   npm run job:cobranca -- --simular       # mostra o que faria, sem enviar
 *   npm run job:cobranca -- --data=2026-07-28
 *   npm run job:cobranca -- --sem-alerta    # nao avisa a equipe ao final
 *
 * Rodar duas vezes no mesmo dia e seguro: a chave de idempotencia da regua
 * impede reenvio. Isso e proposital — permite reprocessar um dia que falhou
 * sem medo de bombardear o cliente.
 */
async function executar(): Promise<void> {
  const argumentos = process.argv.slice(2);
  const simular = argumentos.includes('--simular');
  const dataInformada = argumentos.find((argumento) => argumento.startsWith('--data='))?.split('=')[1];

  const container = criarContainer();
  const data = dataInformada ? DataCivil.deIso(dataInformada) : container.relogio.hoje();

  console.info(`Ciclo de cobranca — ${data.formatarBr()}${simular ? ' (SIMULACAO)' : ''}`);

  const resultado = await container.executarRegua.executar({ data, simular });

  console.info(
    [
      `Parcelas avaliadas............ ${resultado.avaliadas}`,
      `Disparos programados.......... ${resultado.disparosProgramados}`,
      `Enviadas...................... ${resultado.enviadas}`,
      `Documentos emitidos........... ${resultado.documentosEmitidos}`,
      `Ja enviadas antes (ignoradas). ${resultado.ignoradasPorDuplicidade}`,
      `Sem canal de contato.......... ${resultado.semCanal}`,
      `Falhas........................ ${resultado.falhas}`,
      `Valor total cobrado........... R$ ${(resultado.valorTotalCobradoCentavos / 100).toFixed(2)}`,
    ].join('\n'),
  );

  for (const detalhe of resultado.detalhes.filter((item) => item.resultado === 'FALHA' || item.resultado === 'SEM_CANAL')) {
    console.warn(`  [${detalhe.resultado}] ${detalhe.contrato} — ${detalhe.cliente}: ${detalhe.motivo ?? ''}`);
  }

  // Simulacao nao avisa ninguem: conferir a regua nao pode encher a caixa de
  // entrada do financeiro.
  if (!simular && !argumentos.includes('--sem-alerta')) {
    const aviso = await container.notificarEquipe.executar(resultado, data);
    if (aviso) {
      console.info(
        `\nAlerta enviado para ${aviso.destinatarios.join(', ')} — ` +
          `${aviso.novosVencidos} novo(s) atraso(s) hoje.`,
      );
    } else {
      console.info('\nAlerta da equipe desativado (EMAILS_DA_EQUIPE vazio).');
    }
  }

  // Falha em cobranca individual nao derruba o job; o agendador so precisa saber
  // que o ciclo rodou. Os erros ficam no historico de cobrancas.
  await prisma.$disconnect();
}

executar().catch(async (erro) => {
  console.error('Ciclo de cobranca falhou:', erro);
  await prisma.$disconnect();
  process.exit(1);
});
