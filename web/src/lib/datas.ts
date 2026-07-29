/** Data local de hoje como "AAAA-MM-DD" (sem conversão de fuso). */
export function hojeIso(): string {
  const agora = new Date();
  return paraIso(agora.getFullYear(), agora.getMonth() + 1, agora.getDate());
}

export function somarDiasIso(dataIso: string, dias: number): string {
  const [ano, mes, dia] = dataIso.split('-').map(Number);
  const referencia = new Date(ano, mes - 1, dia + dias);
  return paraIso(referencia.getFullYear(), referencia.getMonth() + 1, referencia.getDate());
}

export function somarMesesIso(dataIso: string, meses: number): string {
  const [ano, mes, dia] = dataIso.split('-').map(Number);
  const referencia = new Date(ano, mes - 1 + meses, 1);
  const ultimoDia = new Date(referencia.getFullYear(), referencia.getMonth() + 1, 0).getDate();
  return paraIso(referencia.getFullYear(), referencia.getMonth() + 1, Math.min(dia, ultimoDia));
}

/** Avança `passos` períodos a partir da data, respeitando a periodicidade do plano. */
export function somarPeriodos(dataIso: string, periodicidade: string, passos: number): string {
  if (periodicidade === 'SEMANAL') return somarDiasIso(dataIso, 7 * passos);
  if (periodicidade === 'QUINZENAL') return somarDiasIso(dataIso, 15 * passos);
  if (periodicidade === 'ANUAL') return somarMesesIso(dataIso, 12 * passos);
  return somarMesesIso(dataIso, passos);
}

export function primeiroDiaDoMesIso(dataIso: string): string {
  const [ano, mes] = dataIso.split('-');
  return `${ano}-${mes}-01`;
}

function paraIso(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}
