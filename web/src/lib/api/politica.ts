import { requisitar } from '../http';
import type { PoliticaDeInadimplencia } from '@/tipos/politica';

export function buscarPolitica(sinal?: AbortSignal): Promise<PoliticaDeInadimplencia> {
  return requisitar<PoliticaDeInadimplencia>('/politica-de-inadimplencia', { sinal });
}

export function salvarPolitica(
  politica: PoliticaDeInadimplencia,
): Promise<PoliticaDeInadimplencia> {
  return requisitar<PoliticaDeInadimplencia>('/politica-de-inadimplencia', {
    metodo: 'PUT',
    corpo: politica,
  });
}
