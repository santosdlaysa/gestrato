import { useCallback, useMemo } from 'react';
import { useRequisicao } from './useRequisicao';
import { listarClientes, listarCorretores, listarLoteamentos, listarLotes } from '@/lib/api/cadastros';
import { extrairItens } from '@/lib/colecoes';
import type { Opcao } from '@/componentes/comuns/Campo';

export function useOpcoesDeLoteamentos(): Opcao[] {
  const requisicao = useRequisicao(
    useCallback((sinal: AbortSignal) => listarLoteamentos(sinal), []),
    [],
  );
  return useMemo(
    () =>
      extrairItens(requisicao.dados).map((loteamento) => ({
        valor: loteamento.id,
        texto: loteamento.nome,
      })),
    [requisicao.dados],
  );
}

export function useOpcoesDeClientes(): Opcao[] {
  const requisicao = useRequisicao(
    useCallback((sinal: AbortSignal) => listarClientes({ porPagina: 200 }, sinal), []),
    [],
  );
  return useMemo(
    () =>
      extrairItens(requisicao.dados).map((cliente) => ({
        valor: cliente.id,
        texto: cliente.nome,
      })),
    [requisicao.dados],
  );
}

export function useOpcoesDeLotes(loteamentoId: string): Opcao[] {
  const requisicao = useRequisicao(
    useCallback(
      (sinal: AbortSignal) =>
        listarLotes({ loteamentoId: loteamentoId || undefined, porPagina: 200 }, sinal),
      [loteamentoId],
    ),
    [loteamentoId],
  );
  return useMemo(
    () =>
      extrairItens(requisicao.dados).map((lote) => ({
        valor: lote.id,
        texto: `${lote.loteamento ?? ''} ${lote.quadra ? `Q${lote.quadra}` : ''} L${lote.numero}`.trim(),
      })),
    [requisicao.dados],
  );
}

export function useOpcoesDeCorretores(): Opcao[] {
  const requisicao = useRequisicao(
    useCallback((sinal: AbortSignal) => listarCorretores(sinal), []),
    [],
  );
  return useMemo(
    () =>
      extrairItens(requisicao.dados).map((corretor) => ({
        valor: corretor.id,
        texto: corretor.nome,
      })),
    [requisicao.dados],
  );
}
