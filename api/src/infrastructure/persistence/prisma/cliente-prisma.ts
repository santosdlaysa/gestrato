import { PrismaClient } from '@prisma/client';
import { estaEmProducao } from '../../config/ambiente.js';

/**
 * Instancia unica do Prisma. Em desenvolvimento o `tsx watch` recarrega o
 * modulo a cada save; sem este cache o processo abriria uma pilha de conexoes
 * ate o Postgres recusar.
 */
const cacheGlobal = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  cacheGlobal.prisma ??
  new PrismaClient({
    log: estaEmProducao() ? ['warn', 'error'] : ['warn', 'error'],
  });

if (!estaEmProducao()) {
  cacheGlobal.prisma = prisma;
}

/** Tipo do cliente dentro de `$transaction` — nao expoe `$transaction` aninhado. */
export type ClientePrisma = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;
