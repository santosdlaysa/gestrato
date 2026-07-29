import type {
  ConsultaDeContextoDeCobranca,
  ContextoDeCobranca,
} from '../../../../application/ports/consulta-de-contexto.js';
import type { ClientePrisma } from '../cliente-prisma.js';

/**
 * Resolve, numa unica consulta, tudo que a parcela precisa para virar boleto ou
 * mensagem: contrato, cliente com contatos e endereco, e a localizacao do lote.
 */
export class ConsultaDeContextoDeCobrancaPrisma implements ConsultaDeContextoDeCobranca {
  constructor(private readonly prisma: ClientePrisma) {}

  async porParcelas(parcelaIds: readonly string[]): Promise<Map<string, ContextoDeCobranca>> {
    const contextos = new Map<string, ContextoDeCobranca>();
    if (parcelaIds.length === 0) return contextos;

    const linhas = await this.prisma.parcela.findMany({
      where: { id: { in: [...parcelaIds] } },
      select: {
        id: true,
        contrato: {
          select: {
            id: true,
            numero: true,
            quantidadeDeParcelas: true,
            cliente: {
              select: {
                id: true, nome: true, documento: true, email: true, telefone: true, whatsapp: true,
                logradouro: true, numero: true, complemento: true, bairro: true,
                cidade: true, uf: true, cep: true,
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
    });

    for (const linha of linhas) {
      const { contrato } = linha;
      const { cliente, lote } = contrato;
      contextos.set(linha.id, {
        parcelaId: linha.id,
        contratoId: contrato.id,
        contratoNumero: contrato.numero,
        totalDeParcelas: contrato.quantidadeDeParcelas,
        clienteId: cliente.id,
        clienteNome: cliente.nome,
        clienteDocumento: cliente.documento,
        clienteEmail: cliente.email,
        clienteTelefone: cliente.telefone,
        clienteWhatsApp: cliente.whatsapp,
        logradouro: cliente.logradouro,
        numeroDoEndereco: cliente.numero,
        complemento: cliente.complemento,
        bairro: cliente.bairro,
        cidade: cliente.cidade,
        uf: cliente.uf,
        cep: cliente.cep,
        loteamento: lote.quadra.loteamento.nome,
        quadra: lote.quadra.nome,
        lote: lote.numero,
      });
    }

    return contextos;
  }
}
