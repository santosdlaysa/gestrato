import { useRequisicao } from './useRequisicao';
import type { Requisicao } from './useRequisicao';
import { listarInadimplentes } from '@/lib/api/inadimplencia';
import type { FiltrosDeInadimplencia, RespostaDeInadimplencia } from '@/lib/api/inadimplencia';

/** Recarrega a consulta de inadimplência sempre que qualquer filtro muda. */
export function useListaDeInadimplentes(
  filtros: FiltrosDeInadimplencia,
): Requisicao<RespostaDeInadimplencia> {
  return useRequisicao((sinal) => listarInadimplentes(filtros, sinal), [
    filtros.loteamentoId,
    filtros.clienteId,
    filtros.busca,
    filtros.risco,
    filtros.ordenarPor,
    filtros.pagina,
    filtros.porPagina,
  ]);
}
