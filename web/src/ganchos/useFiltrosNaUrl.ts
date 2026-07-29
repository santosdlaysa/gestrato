import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface ControleDeFiltros<C extends string> {
  filtros: Record<C, string>;
  definirFiltro: (chave: C, valor: string) => void;
  limpar: () => void;
  algumPreenchido: boolean;
}

/**
 * Mantém os filtros na querystring: a tela fica compartilhável por link e o
 * botão "voltar" do navegador recupera a busca anterior.
 */
export function useFiltrosNaUrl<C extends string>(chaves: readonly C[]): ControleDeFiltros<C> {
  const [parametros, definirParametros] = useSearchParams();

  const filtros = useMemo(() => {
    const resultado = {} as Record<C, string>;
    for (const chave of chaves) resultado[chave] = parametros.get(chave) ?? '';
    return resultado;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parametros, chaves.join('|')]);

  const definirFiltro = useCallback(
    (chave: C, valor: string) => {
      const proximos = new URLSearchParams(parametros);
      if (valor) proximos.set(chave, valor);
      else proximos.delete(chave);
      if (chave !== 'pagina') proximos.delete('pagina');
      definirParametros(proximos, { replace: true });
    },
    [parametros, definirParametros],
  );

  const limpar = useCallback(() => definirParametros(new URLSearchParams()), [definirParametros]);

  const algumPreenchido = chaves.some((chave) => chave !== 'pagina' && Boolean(filtros[chave]));

  return { filtros, definirFiltro, limpar, algumPreenchido };
}
