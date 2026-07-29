import { criarContainer } from './composicao/container.js';
import { ambiente } from './infrastructure/config/ambiente.js';
import { prisma } from './infrastructure/persistence/prisma/cliente-prisma.js';
import { criarAplicacao } from './interfaces/http/aplicacao.js';

const container = criarContainer();
const aplicacao = criarAplicacao(container);

const servidor = aplicacao.listen(ambiente.porta, () => {
  console.info(`Gestrato API ouvindo em http://localhost:${ambiente.porta}/api`);
  console.info(`Gateway de cobranca: ${container.gateway.nome} | Mensageria: ${container.mensageria.nome}`);
  if (container.gateway.nome === 'fake') {
    console.warn('ATENCAO: gateway "fake" ativo — os documentos emitidos NAO sao pagaveis.');
  }
});

/**
 * Falha ao abrir a porta e quase sempre outra instancia ja rodando. O erro cru
 * do Node para isso e um stack trace de dez linhas que nao diz o que fazer.
 */
servidor.on('error', (erro: NodeJS.ErrnoException) => {
  if (erro.code !== 'EADDRINUSE') throw erro;

  console.error(
    [
      '',
      `A porta ${ambiente.porta} ja esta em uso.`,
      '',
      'Provavelmente ha outra instancia da API rodando — inclusive uma iniciada',
      'em outro terminal ou em segundo plano.',
      '',
      'Para descobrir quem esta usando a porta:',
      `  netstat -ano | findstr :${ambiente.porta}`,
      '  (a ultima coluna e o PID; encerre com  taskkill /PID <pid> /F )',
      '',
      'Ou suba esta instancia em outra porta, alterando PORT no arquivo .env.',
      '',
    ].join('\n'),
  );
  process.exit(1);
});

/**
 * Encerramento limpo: para de aceitar conexoes novas, espera as em andamento e
 * so entao fecha o pool do banco. Derrubar no meio de uma transacao de baixa
 * deixaria parcela e pagamento em estados divergentes.
 */
for (const sinal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(sinal, () => {
    console.info(`\nRecebido ${sinal}, encerrando...`);
    servidor.close(() => {
      void prisma.$disconnect().then(() => process.exit(0));
    });
  });
}
