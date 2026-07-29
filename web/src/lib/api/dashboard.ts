import { requisitar } from '../http';
import type { Dashboard } from '@/tipos/dashboard';

export function buscarDashboard(data: string, sinal?: AbortSignal): Promise<Dashboard> {
  return requisitar<Dashboard>('/dashboard', { parametros: { data }, sinal });
}
