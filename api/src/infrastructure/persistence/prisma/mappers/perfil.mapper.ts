import type { Perfil as PerfilPrisma } from '@prisma/client';
import { Perfil } from '../../../../domain/acesso/perfil.js';
import { normalizarPermissoes } from '../../../../domain/acesso/permissao.js';
import { paraIdentificador } from './conversores.js';

export const mapeadorDePerfil = {
  paraDominio(linha: PerfilPrisma): Perfil {
    return Perfil.restaurar({
      id: paraIdentificador(linha.id),
      nome: linha.nome,
      descricao: linha.descricao,
      permissoes: normalizarPermissoes(linha.permissoes),
      sistema: linha.sistema,
    });
  },

  paraPersistencia(perfil: Perfil) {
    const estado = perfil.paraEstado();
    return {
      id: estado.id.paraString(),
      nome: estado.nome,
      descricao: estado.descricao,
      permissoes: [...estado.permissoes],
      sistema: estado.sistema,
    };
  },
};
