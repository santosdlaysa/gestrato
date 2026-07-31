import { requisitar } from '../http';
import type { StatusDeConfiguracoesEIntegracoes } from '@/tipos/configuracoes-integracoes';

export function buscarStatusDeConfiguracoesEIntegracoes(
  sinal?: AbortSignal,
): Promise<StatusDeConfiguracoesEIntegracoes> {
  return requisitar<StatusDeConfiguracoesEIntegracoes>('/configuracoes/status', { sinal });
}
