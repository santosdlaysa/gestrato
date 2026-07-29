import type { Anexo as AnexoPrisma } from '@prisma/client';
import type { RepositorioDeAnexos } from '../../../../application/ports/repositorios.js';
import { Anexo } from '../../../../domain/arquivos/anexo.js';
import {
  garantirCategoriaDeAnexo,
  garantirEscopoDeAnexo,
  type EscopoDoAnexo,
} from '../../../../domain/arquivos/tipos.js';
import type { ClientePrisma } from '../cliente-prisma.js';
import { deIdentificador, paraIdentificador } from '../mappers/conversores.js';

const mapeadorDeAnexo = {
  paraDominio(linha: AnexoPrisma): Anexo {
    return Anexo.restaurar({
      id: paraIdentificador(linha.id),
      escopo: garantirEscopoDeAnexo(linha.escopo),
      donoId: paraIdentificador(linha.donoId),
      categoria: garantirCategoriaDeAnexo(linha.categoria),
      nomeOriginal: linha.nomeOriginal,
      chaveNoArmazenamento: linha.chaveNoArmazenamento,
      tipoMime: linha.tipoMime,
      tamanhoBytes: linha.tamanhoBytes,
      descricao: linha.descricao,
      enviadoPor: linha.enviadoPor,
      enviadoEm: linha.enviadoEm,
    });
  },

  paraPersistencia(anexo: Anexo) {
    const estado = anexo.paraEstado();
    return {
      id: deIdentificador(estado.id),
      escopo: estado.escopo,
      donoId: deIdentificador(estado.donoId),
      categoria: estado.categoria,
      nomeOriginal: estado.nomeOriginal,
      chaveNoArmazenamento: estado.chaveNoArmazenamento,
      tipoMime: estado.tipoMime,
      tamanhoBytes: estado.tamanhoBytes,
      descricao: estado.descricao,
      enviadoPor: estado.enviadoPor,
      enviadoEm: estado.enviadoEm,
    };
  },
};

export class RepositorioDeAnexosPrisma implements RepositorioDeAnexos {
  constructor(private readonly prisma: ClientePrisma) {}

  async porId(id: string): Promise<Anexo | null> {
    const linha = await this.prisma.anexo.findUnique({ where: { id } });
    return linha ? mapeadorDeAnexo.paraDominio(linha) : null;
  }

  async porDono(escopo: EscopoDoAnexo, donoId: string): Promise<Anexo[]> {
    const linhas = await this.prisma.anexo.findMany({
      where: { escopo, donoId },
      orderBy: { enviadoEm: 'desc' },
    });
    return linhas.map(mapeadorDeAnexo.paraDominio);
  }

  async salvar(anexo: Anexo): Promise<void> {
    const dados = mapeadorDeAnexo.paraPersistencia(anexo);
    await this.prisma.anexo.upsert({ where: { id: dados.id }, create: dados, update: dados });
  }

  async remover(id: string): Promise<void> {
    await this.prisma.anexo.delete({ where: { id } });
  }
}
