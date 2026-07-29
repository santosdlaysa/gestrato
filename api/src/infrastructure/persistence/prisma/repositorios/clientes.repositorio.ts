import { montarPagina, type Pagina } from '../../../../application/ports/comuns.js';
import type { FiltroDeClientes, RepositorioDeClientes } from '../../../../application/ports/repositorios.js';
import type { Cliente } from '../../../../domain/cadastros/cliente.js';
import type { ClientePrisma } from '../cliente-prisma.js';
import { mapeadorDeCliente } from '../mappers/cliente.mapper.js';

export class RepositorioDeClientesPrisma implements RepositorioDeClientes {
  constructor(private readonly prisma: ClientePrisma) {}

  async porId(id: string): Promise<Cliente | null> {
    const linha = await this.prisma.cliente.findUnique({ where: { id } });
    return linha ? mapeadorDeCliente.paraDominio(linha) : null;
  }

  /** Uma consulta so: os paineis pedem o cliente de dezenas de contratos de uma vez. */
  async porIds(ids: readonly string[]): Promise<Map<string, Cliente>> {
    if (ids.length === 0) return new Map();
    const linhas = await this.prisma.cliente.findMany({ where: { id: { in: [...new Set(ids)] } } });
    return new Map(linhas.map((linha) => [linha.id, mapeadorDeCliente.paraDominio(linha)]));
  }

  async porDocumento(digitos: string): Promise<Cliente | null> {
    const linha = await this.prisma.cliente.findUnique({ where: { documento: digitos.replace(/\D/g, '') } });
    return linha ? mapeadorDeCliente.paraDominio(linha) : null;
  }

  async listar(filtro: FiltroDeClientes): Promise<Pagina<Cliente>> {
    const condicao = condicaoDeBusca(filtro);
    const [linhas, total] = await Promise.all([
      this.prisma.cliente.findMany({
        where: condicao,
        orderBy: { nome: 'asc' },
        skip: (filtro.pagina - 1) * filtro.porPagina,
        take: filtro.porPagina,
      }),
      this.prisma.cliente.count({ where: condicao }),
    ]);
    return montarPagina(linhas.map(mapeadorDeCliente.paraDominio), total, filtro);
  }

  async salvar(cliente: Cliente): Promise<void> {
    const dados = mapeadorDeCliente.paraPersistencia(cliente);
    await this.prisma.cliente.upsert({
      where: { id: dados.id },
      create: dados,
      update: dados,
    });
  }
}

/**
 * A busca da tela e um campo unico: o operador digita tanto o nome quanto o
 * CPF (com ou sem mascara). Como a coluna guarda so digitos, a parte numerica
 * do termo e comparada separadamente.
 */
function condicaoDeBusca(filtro: FiltroDeClientes) {
  const termo = filtro.busca?.trim();
  const digitos = termo?.replace(/\D/g, '') ?? '';
  return {
    ...(filtro.ativo === undefined ? {} : { ativo: filtro.ativo }),
    ...(termo
      ? {
          OR: [
            { nome: { contains: termo, mode: 'insensitive' as const } },
            ...(digitos ? [{ documento: { contains: digitos } }] : []),
          ],
        }
      : {}),
  };
}
