/**
 * Seed ISOLADO do fluxo de caixa — popula SOMENTE os cadastros-base novos
 * (contas bancarias, socios, empreendimentos e categorias). Nao cria nenhum
 * loteamento, cliente ou contrato de demonstracao.
 *
 * Serve para semear esses cadastros num banco que ja tem dados reais, sem risco
 * de injetar a massa de demonstracao do `seed.ts`.
 *
 *   npm run seed:fluxo
 *
 * Idempotente: rodar de novo nao duplica nada (upsert por id deterministico).
 */

import { PrismaClient } from '@prisma/client';
import { config as carregarEnv } from 'dotenv';
import { semearFluxoDeCaixa } from './dados/fluxo-de-caixa.js';

carregarEnv();

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('Semeando os cadastros de fluxo de caixa (sem massa de demonstração)...');
  const fluxo = await semearFluxoDeCaixa(prisma);
  console.log(
    `  ok: ${fluxo.contas} contas bancárias, ${fluxo.socios} sócios, ` +
      `${fluxo.empreendimentos} empreendimentos, ${fluxo.categorias} categorias.`,
  );
}

main()
  .catch((erro: unknown) => {
    console.error('\nFalha ao semear o fluxo de caixa:');
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
