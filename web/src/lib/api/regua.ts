import { requisitar } from '../http';
import type { RespostaPaginada } from '@/tipos/comum';
import type {
  EventoDaRegua,
  ModeloDeMensagem,
  Regua,
  ResultadoDaExecucao,
} from '@/tipos/cobranca';

export function buscarRegua(sinal?: AbortSignal): Promise<Regua | EventoDaRegua[]> {
  return requisitar('/regua', { sinal });
}

export function salvarRegua(eventos: EventoDaRegua[]): Promise<unknown> {
  return requisitar('/regua', { metodo: 'PUT', corpo: { eventos } });
}

export function executarRegua(data: string, simular: boolean): Promise<ResultadoDaExecucao> {
  return requisitar<ResultadoDaExecucao>('/regua/executar', {
    metodo: 'POST',
    corpo: { data, simular },
  });
}

export function listarModelos(
  sinal?: AbortSignal,
): Promise<ModeloDeMensagem[] | RespostaPaginada<ModeloDeMensagem>> {
  return requisitar('/modelos-de-mensagem', { sinal });
}

export function salvarModelo(
  chave: string,
  campos: { assunto?: string | null; corpo: string },
): Promise<unknown> {
  return requisitar(`/modelos-de-mensagem/${encodeURIComponent(chave)}`, {
    metodo: 'PUT',
    corpo: campos,
  });
}
