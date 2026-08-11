import type { RepositorioDePerfis } from '../../../../application/ports/repositorios.js';
import type { Perfil } from '../../../../domain/acesso/perfil.js';
import type { ClientePrisma } from '../cliente-prisma.js';
import { mapeadorDePerfil } from '../mappers/perfil.mapper.js';

export class RepositorioDePerfisPrisma implements RepositorioDePerfis {
  constructor(private readonly prisma: ClientePrisma) {}

  async porId(id: string): Promise<Perfil | null> {
    const linha = await this.prisma.perfil.findUnique({ where: { id } });
    return linha ? mapeadorDePerfil.paraDominio(linha) : null;
  }

  async porNome(nome: string): Promise<Perfil | null> {
    const linha = await this.prisma.perfil.findFirst({
      where: { nome: { equals: nome.trim(), mode: 'insensitive' } },
    });
    return linha ? mapeadorDePerfil.paraDominio(linha) : null;
  }

  async listar(): Promise<Perfil[]> {
    const linhas = await this.prisma.perfil.findMany({ orderBy: { nome: 'asc' } });
    return linhas.map(mapeadorDePerfil.paraDominio);
  }

  async salvar(perfil: Perfil): Promise<void> {
    const dados = mapeadorDePerfil.paraPersistencia(perfil);
    await this.prisma.perfil.upsert({
      where: { id: dados.id },
      create: dados,
      update: dados,
    });
  }

  async excluir(id: string): Promise<void> {
    await this.prisma.perfil.delete({ where: { id } });
  }

  async contarUsuarios(perfilId: string): Promise<number> {
    return this.prisma.usuario.count({ where: { perfilId } });
  }
}
