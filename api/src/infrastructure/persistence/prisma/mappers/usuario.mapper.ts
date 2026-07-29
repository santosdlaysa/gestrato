import type { Usuario as UsuarioPrisma } from '@prisma/client';
import { Usuario, garantirPapel } from '../../../../domain/acesso/usuario.js';
import { Email } from '../../../../domain/value-objects/contato.js';
import { paraIdentificador } from './conversores.js';

/**
 * Traducao entre a linha do Postgres e a entidade.
 *
 * Um mapper por agregado, sempre com `paraDominio` e `paraPersistencia`. E aqui
 * que a inversao de dependencia se paga: o dominio nao importa `@prisma/client`
 * em lugar nenhum — so este arquivo importa.
 */
export const mapeadorDeUsuario = {
  paraDominio(linha: UsuarioPrisma): Usuario {
    return Usuario.restaurar({
      id: paraIdentificador(linha.id),
      nome: linha.nome,
      email: Email.de(linha.email),
      senhaHash: linha.senhaHash,
      papel: garantirPapel(linha.papel),
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
      papel: estado.papel,
      ativo: estado.ativo,
      ultimoAcesso: estado.ultimoAcesso,
    };
  },
};
