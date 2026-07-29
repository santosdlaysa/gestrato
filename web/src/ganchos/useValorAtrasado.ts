import { useEffect, useState } from 'react';

/** Devolve o valor só depois que ele para de mudar por `atraso` ms. */
export function useValorAtrasado<T>(valor: T, atraso = 500): T {
  const [atrasado, definirAtrasado] = useState(valor);

  useEffect(() => {
    const temporizador = window.setTimeout(() => definirAtrasado(valor), atraso);
    return () => window.clearTimeout(temporizador);
  }, [valor, atraso]);

  return atrasado;
}
