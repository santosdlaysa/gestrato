import type { Lote as LinhaDeLote, Quadra as LinhaDeQuadra } from '@prisma/client';
import { Lote, Quadra, SITUACOES_LOTE, type SituacaoLote } from '../../../../domain/cadastros/lote.js';
import { ErroDeValidacao } from '../../../../domain/shared/errors.js';
import { deDinheiroOpcional, paraDinheiroOpcional, paraIdentificador } from './conversores.js';

/** Traducao entre a linha de `quadras` e a entidade. */
export const mapeadorDeQuadra = {
  paraDominio(linha: LinhaDeQuadra): Quadra {
    return Quadra.restaurar({
      id: paraIdentificador(linha.id),
      loteamentoId: paraIdentificador(linha.loteamentoId),
      nome: linha.nome,
    });
  },

  paraPersistencia(quadra: Quadra) {
    const estado = quadra.paraEstado();
    return {
      id: estado.id.paraString(),
      loteamentoId: estado.loteamentoId.paraString(),
      nome: estado.nome,
    };
  },
};

/** Traducao entre a linha de `lotes` e a entidade. */
export const mapeadorDeLote = {
  paraDominio(linha: LinhaDeLote): Lote {
    return Lote.restaurar({
      id: paraIdentificador(linha.id),
      quadraId: paraIdentificador(linha.quadraId),
      numero: linha.numero,
      areaEmMetrosQuadrados: linha.areaEmMetrosQuadrados,
      valorDeTabela: paraDinheiroOpcional(linha.valorDeTabelaCentavos),
      situacao: garantirSituacaoDeLote(linha.situacao),
      descricao: linha.descricao,
    });
  },

  paraPersistencia(lote: Lote) {
    const estado = lote.paraEstado();
    return {
      id: estado.id.paraString(),
      quadraId: estado.quadraId.paraString(),
      numero: estado.numero,
      areaEmMetrosQuadrados: estado.areaEmMetrosQuadrados,
      valorDeTabelaCentavos: deDinheiroOpcional(estado.valorDeTabela),
      situacao: estado.situacao,
      descricao: estado.descricao,
    };
  },
};

/**
 * O enum do banco e o do dominio podem divergir depois de uma migracao aplicada
 * pela metade — restaurar uma entidade com situacao desconhecida seria pior do
 * que falhar aqui, onde o dado ainda esta na borda.
 */
function garantirSituacaoDeLote(valor: string): SituacaoLote {
  const situacao = SITUACOES_LOTE.find((candidata) => candidata === valor);
  if (!situacao) {
    throw new ErroDeValidacao(`Situacao de lote invalida: "${valor}".`);
  }
  return situacao;
}
