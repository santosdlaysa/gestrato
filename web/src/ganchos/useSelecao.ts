import { useCallback, useRef, useState } from 'react';
import { alternarNoConjunto } from '@/lib/colecoes';

export interface Selecao {
  selecionadas: Set<string>;
  alternar: (id: string) => void;
  alternarTodas: () => void;
  limpar: () => void;
}

/** Seleção múltipla de linhas, com "selecionar todas" limitado à página atual. */
export function useSelecao(idsVisiveis: string[]): Selecao {
  const [selecionadas, definirSelecionadas] = useState<Set<string>>(new Set());
  const visiveis = useRef<string[]>(idsVisiveis);
  visiveis.current = idsVisiveis;

  const alternar = useCallback((id: string) => {
    definirSelecionadas((atual) => alternarNoConjunto(atual, id));
  }, []);

  const alternarTodas = useCallback(() => {
    definirSelecionadas((atual) =>
      atual.size === visiveis.current.length ? new Set() : new Set(visiveis.current),
    );
  }, []);

  const limpar = useCallback(() => definirSelecionadas(new Set()), []);

  return { selecionadas, alternar, alternarTodas, limpar };
}
