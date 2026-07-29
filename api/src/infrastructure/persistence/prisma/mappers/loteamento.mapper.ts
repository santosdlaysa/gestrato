import type { Loteamento as LinhaDeLoteamento } from '@prisma/client';
import { Loteamento } from '../../../../domain/cadastros/loteamento.js';
import { paraIdentificador } from './conversores.js';

/** Traducao entre a linha de `loteamentos` e a entidade. */
export const mapeadorDeLoteamento = {
  paraDominio(linha: LinhaDeLoteamento): Loteamento {
    return Loteamento.restaurar({
      id: paraIdentificador(linha.id),
      nome: linha.nome,
      cidade: linha.cidade,
      uf: linha.uf,
      registroImobiliario: linha.registroImobiliario,
      ativo: linha.ativo,
    });
  },

  paraPersistencia(loteamento: Loteamento) {
    const estado = loteamento.paraEstado();
    return {
      id: estado.id.paraString(),
      nome: estado.nome,
      cidade: estado.cidade,
      uf: estado.uf,
      registroImobiliario: estado.registroImobiliario,
      ativo: estado.ativo,
    };
  },
};
