import type { Perfil as PerfilPrisma, Usuario as UsuarioPrisma } from '@prisma/client';
import { normalizarPermissoes } from '../../../../domain/acesso/permissao.js';
import { Usuario } from '../../../../domain/acesso/usuario.js';
import { Email } from '../../../../domain/value-objects/contato.js';
import { paraIdentificador } from './conversores.js';

/** A linha do usuario sempre vem com o perfil carregado (a permissao mora nele). */
type UsuarioComPerfil = UsuarioPrisma & { perfil: PerfilPrisma };

/**
 * Traducao entre a linha do Postgres e a entidade.
 *
 * Um mapper por agregado, sempre com `paraDominio` e `paraPersistencia`. E aqui
 * que a inversao de dependencia se paga: o dominio nao importa `@prisma/client`
 * em lugar nenhum — so este arquivo importa.
 */
export const mapeadorDeUsuario = {
  paraDominio(linha: UsuarioComPerfil): Usuario {
    return Usuario.restaurar({
      id: paraIdentificador(linha.id),
      nome: linha.nome,
      email: Email.de(linha.email),
      senhaHash: linha.senhaHash,
      perfilId: paraIdentificador(linha.perfil.id),
      perfilNome: linha.perfil.nome,
      permissoesDoPerfil: normalizarPermissoes(linha.perfil.permissoes),
      ativo: linha.ativo,
      ultimoAcesso: linha.ultimoAcesso,
    });
  },

  paraPersistencia(usuario: Usuario) {
    const estado = usuario.paraEstado();
    return {
      id: estado.id.paraString(),
      nome: estado.nome,
      email: estado.email.valor,
      senhaHash: estado.senhaHash,
      perfilId: estado.perfilId.paraString(),
      ativo: estado.ativo,
      ultimoAcesso: estado.ultimoAcesso,
    };
  },
};
