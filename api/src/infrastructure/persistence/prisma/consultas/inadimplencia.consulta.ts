import type { Prisma } from '@prisma/client';
import type {
  ConsultaDeInadimplencia,
  FiltroDeInadimplencia,
  ParcelaVencidaDoCliente,
} from '../../../../application/ports/consulta-de-inadimplencia.js';
import type { ClientePrisma } from '../cliente-prisma.js';
import { mapeadorDeParcela } from '../mappers/parcela.mapper.js';

const STATUS_EM_ABERTO = ['PENDENTE', 'PAGA_PARCIAL'] as const;

/**
 * Resolve, numa unica consulta, as parcelas vencidas com o contexto de cliente e
 * unidade que a tela de inadimplencia precisa para agrupar por devedor.
 *
 * Restringe a contratos ATIVOS: parcela em aberto de contrato cancelado ou
 * distratado e residuo de encerramento, nao inadimplencia a cobrar.
 */
export class ConsultaDeInadimplenciaPrisma implements ConsultaDeInadimplencia {
  constructor(private readonly prisma: ClientePrisma) {}

  async parcelasVencidas(filtro: FiltroDeInadimplencia): Promise<ParcelaVencidaDoCliente[]> {
    const contrato: Prisma.ContratoWhereInput = { status: 'ATIVO' };
    if (filtro.clienteId) contrato.clienteId = filtro.clienteId;
    if (filtro.loteamentoId) contrato.lote = { quadra: { loteamentoId: filtro.loteamentoId } };

    const busca = filtro.busca?.trim();
    if (busca) {
      const digitos = busca.replace(/\D/g, '');
      contrato.cliente = {
        OR: [
          { nome: { contains: busca, mode: 'insensitive' } },
          ...(digitos ? [{ documento: { contains: digitos } }] : []),
        ],
      };
    }

    const linhas = await this.prisma.parcela.findMany({
      where: {
        status: { in: [...STATUS_EM_ABERTO] },
        vencimento: { lt: filtro.ate.paraDateUtc() },
        contrato,
      },
      include: {
        contrato: {
          select: {
            id: true,
            numero: true,
            cliente: {
              select: {
                id: true,
                nome: true,
                documento: true,
                email: true,
                telefone: true,
                whatsapp: true,
              },
            },
            lote: {
              select: {
                numero: true,
                quadra: { select: { nome: true, loteamento: { select: { nome: true } } } },
              },
            },
          },
        },
      },
      orderBy: [{ vencimento: 'asc' }],
    });

    return linhas.map((linha) => {
      const { contrato: c } = linha;
      const { cliente, lote } = c;
      return {
        parcela: mapeadorDeParcela.paraDominio(linha),
        contratoId: c.id,
        contratoNumero: c.numero,
        clienteId: cliente.id,
        clienteNome: cliente.nome,
        clienteDocumento: cliente.documento,
        clienteEmail: cliente.email,
        clienteTelefone: cliente.telefone,
        clienteWhatsApp: cliente.whatsapp,
        loteamento: lote.quadra.loteamento.nome,
        quadra: lote.quadra.nome,
        lote: lote.numero,
      };
    });
  }
}
