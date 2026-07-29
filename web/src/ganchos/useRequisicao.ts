import { useCallback, useEffect, useRef, useState } from 'react';
import { foiCancelada, mensagemDeErro } from '@/lib/http';

interface Estado<T> {
  dados: T | null;
  carregando: boolean;
  erro: string | null;
}

export interface Requisicao<T> extends Estado<T> {
  recarregar: () => void;
  definirDados: (dados: T) => void;
}

/**
 * Executa uma busca sempre que as dependências mudam, cancelando a anterior.
 * Concentra os três estados (carregando/erro/dados) que toda tela precisa.
 */
export function useRequisicao<T>(
  executar: (sinal: AbortSignal) => Promise<T>,
  dependencias: unknown[],
): Requisicao<T> {
  const [estado, definirEstado] = useState<Estado<T>>({
    dados: null,
    carregando: true,
    erro: null,
  });
  const [versao, definirVersao] = useState(0);
  const executarRef = useRef(executar);
  executarRef.current = executar;

  useEffect(() => {
    const controlador = new AbortController();
    definirEstado((anterior) => ({ ...anterior, carregando: true, erro: null }));

    executarRef
      .current(controlador.signal)
      .then((dados) => {
        if (controlador.signal.aborted) return;
        definirEstado({ dados, carregando: false, erro: null });
      })
      .catch((erro: unknown) => {
        if (controlador.signal.aborted || foiCancelada(erro)) return;
        definirEstado({ dados: null, carregando: false, erro: mensagemDeErro(erro) });
      });

    return () => controlador.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencias, versao]);

  const recarregar = useCallback(() => definirVersao((atual) => atual + 1), []);
  const definirDados = useCallback(
    (dados: T) => definirEstado({ dados, carregando: false, erro: null }),
    [],
  );

  return { ...estado, recarregar, definirDados };
}
