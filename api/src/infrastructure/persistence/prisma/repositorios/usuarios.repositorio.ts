import type { RepositorioDeUsuarios } from '../../../../application/ports/repositorios.js';
import type { Usuario } from '../../../../domain/acesso/usuario.js';
import type { ClientePrisma } from '../cliente-prisma.js';
import { mapeadorDeUsuario } from '../mappers/usuario.mapper.js';

/**
 * Repositorio de referencia — os demais seguem este mesmo formato:
 *
 *   1. recebe o cliente Prisma por construtor (para funcionar dentro de
 *      transacao, onde o cliente e o `tx` e nao o global);
 *   2. implementa a porta declarada em `application/ports/repositorios.ts`;
 *   3. converte com o mapper, nunca devolve linha crua do Prisma;
 *   4. `salvar` faz upsert, para o caso de uso nao precisar saber se e insercao
 *      ou atualizacao.
 */
export class RepositorioDeUsuariosPrisma implements RepositorioDeUsuarios {
  constructor(private readonly prisma: ClientePrisma) {}

  async porId(id: string): Promise<Usuario | null> {
    const linha = await this.prisma.usuario.findUnique({ where: { id } });
    return linha ? mapeadorDeUsuario.paraDominio(linha) : null;
  }

  async porEmail(email: string): Promise<Usuario | null> {
    const linha = await this.prisma.usuario.findUnique({ where: { email: email.toLowerCase() } });
    return linha ? mapeadorDeUsuario.paraDominio(linha) : null;
  }

  async listar(): Promise<Usuario[]> {
    const linhas = await this.prisma.usuario.findMany({ orderBy: { nome: 'asc' } });
    return linhas.map(mapeadorDeUsuario.paraDominio);
  }

  async salvar(usuario: Usuario): Promise<void> {
    const dados = mapeadorDeUsuario.paraPersistencia(usuario);
    await this.prisma.usuario.upsert({
      where: { id: dados.id },
      create: dados,
      update: dados,
    });
  }
}
