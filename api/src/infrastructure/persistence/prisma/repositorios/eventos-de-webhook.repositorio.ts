import type { Prisma } from '@prisma/client';
import type { RepositorioDeEventosDeWebhook } from '../../../../application/ports/repositorios.js';
import type { ClientePrisma } from '../cliente-prisma.js';

/**
 * Guarda o evento cru antes de processar.
 *
 * Provedor de pagamento reenvia webhook ate receber 200. Se a conciliacao
 * falhar no meio, o evento fica gravado com o erro e pode ser reprocessado —
 * sem isso, um bug numa baixa vira dinheiro recebido que o sistema nunca viu.
 */
export class RepositorioDeEventosDeWebhookPrisma implements RepositorioDeEventosDeWebhook {
  constructor(private readonly prisma: ClientePrisma) {}

  async jaRecebido(provedor: string, identificadorExterno: string, tipo: string): Promise<boolean> {
    const existente = await this.prisma.eventoDeWebhook.findUnique({
      where: {
        provedor_identificadorExterno_tipo: { provedor, identificadorExterno, tipo },
      },
      select: { id: true, processadoEm: true },
    });
    return existente !== null && existente.processadoEm !== null;
  }

  async registrar(evento: {
    id: string;
    provedor: string;
    identificadorExterno: string;
    tipo: string;
    cargaUtil: unknown;
  }): Promise<void> {
    const cargaUtil = evento.cargaUtil as Prisma.InputJsonValue;
    await this.prisma.eventoDeWebhook.upsert({
      where: {
        provedor_identificadorExterno_tipo: {
          provedor: evento.provedor,
          identificadorExterno: evento.identificadorExterno,
          tipo: evento.tipo,
        },
      },
      create: {
        id: evento.id,
        provedor: evento.provedor,
        identificadorExterno: evento.identificadorExterno,
        tipo: evento.tipo,
        cargaUtil,
      },
      update: { cargaUtil },
    });
  }

  async marcarComoProcessado(id: string, erro?: string): Promise<void> {
    await this.prisma.eventoDeWebhook.update({
      where: { id },
      data: { processadoEm: new Date(), erro: erro ?? null },
    });
  }
}
