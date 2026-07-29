import type { PoliticaDeInadimplencia } from '@/tipos/politica';

export type DegrauDeAtraso = 'EM_ATRASO' | 'INADIMPLENTE' | 'SUJEITO_A_RETOMADA';

const SEM_CRITERIO = '—';

export function politicaCompleta(
  politica: PoliticaDeInadimplencia | null | undefined,
): politica is PoliticaDeInadimplencia {
  return (
    !!politica &&
    Number.isFinite(politica.diasParaInadimplencia) &&
    Number.isFinite(politica.diasParaRetomadaDoLote)
  );
}

export function politicaConsistente(politica: PoliticaDeInadimplencia | null | undefined): boolean {
  return (
    politicaCompleta(politica) &&
    politica.diasParaInadimplencia >= 1 &&
    politica.diasParaRetomadaDoLote > politica.diasParaInadimplencia
  );
}

/**
 * Texto do critério de cada degrau, sempre derivado dos limiares da API —
 * nenhum número da escala é fixo no código.
 */
export function criterioDoDegrau(
  degrau: DegrauDeAtraso,
  politica: PoliticaDeInadimplencia | null | undefined,
): string {
  if (!politicaCompleta(politica)) return SEM_CRITERIO;
  const { diasParaInadimplencia: inadimplencia, diasParaRetomadaDoLote: retomada } = politica;

  if (degrau === 'SUJEITO_A_RETOMADA') return `${retomada}+ dias`;
  if (degrau === 'INADIMPLENTE') {
    return retomada > inadimplencia
      ? `${inadimplencia} a ${retomada - 1} dias`
      : `${inadimplencia}+ dias`;
  }
  return inadimplencia > 1 ? `1 a ${inadimplencia - 1} dias` : SEM_CRITERIO;
}

/** Frase que traduz o efeito da configuração; `null` quando os valores não fecham. */
export function descreverEscala(
  politica: PoliticaDeInadimplencia | null | undefined,
): string | null {
  if (!politicaConsistente(politica) || !politicaCompleta(politica)) return null;
  const { diasParaInadimplencia: inadimplencia, diasParaRetomadaDoLote: retomada } = politica;
  const inicio =
    inadimplencia > 1
      ? `até ${inadimplencia - 1} dias o contrato fica Em atraso; de ${inadimplencia} a ${retomada - 1} dias, Inadimplente`
      : `de ${inadimplencia} a ${retomada - 1} dias o contrato fica Inadimplente`;
  return `Com esta configuração: ${inicio}; a partir de ${retomada} dias, o lote fica sujeito a retomada.`;
}

export const AVISO_DE_RETOMADA_MANUAL =
  'O sistema apenas sinaliza — nenhum contrato é distratado automaticamente. O distrato continua ' +
  'sendo ação manual, pelo detalhe do contrato.';
