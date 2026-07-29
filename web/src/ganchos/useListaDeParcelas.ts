import { useRequisicao } from './useRequisicao';
import type { Requisicao } from './useRequisicao';
import { listarParcelas } from '@/lib/api/parcelas';
import type { FiltrosDeParcelas } from '@/lib/api/parcelas';
import type { RespostaPaginada } from '@/tipos/comum';
import type { ParcelaDeCobranca } from '@/tipos/parcela';

/** Busca a lista de cobrança recarregando sempre que qualquer filtro muda. */
export function useListaDeParcelas(
  filtros: FiltrosDeParcelas,
): Requisicao<RespostaPaginada<ParcelaDeCobranca>> {
  return useRequisicao((sinal) => listarParcelas(filtros, sinal), [
    filtros.situacao,
    filtros.de,
    filtros.ate,
    filtros.contratoId,
    filtros.clienteId,
    filtros.loteamentoId,
    filtros.pagina,
    filtros.porPagina,
  ]);
}
