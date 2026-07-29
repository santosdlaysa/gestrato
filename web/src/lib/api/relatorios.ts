import { baixarArquivo, requisitar, type Parametros } from '../http';

export function buscarRelatorio<T>(
  caminho: string,
  parametros: Parametros,
  sinal?: AbortSignal,
): Promise<T> {
  return requisitar<T>(`/relatorios/${caminho}`, { parametros, sinal });
}

export function exportarRelatorioEmCsv(
  caminho: string,
  parametros: Parametros,
): Promise<void> {
  return baixarArquivo(
    `/relatorios/${caminho}`,
    { ...parametros, formato: 'csv' },
    `${caminho}.csv`,
  );
}
