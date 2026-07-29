import { Selo } from '@/componentes/comuns/Selo';
import { seloDaSituacaoDoContrato } from '@/lib/rotulos';
import { criterioDoDegrau } from '@/lib/politica';
import type { DegrauDeAtraso } from '@/lib/politica';
import type { PoliticaDeInadimplencia } from '@/tipos/politica';

const DEGRAUS: DegrauDeAtraso[] = ['EM_ATRASO', 'INADIMPLENTE', 'SUJEITO_A_RETOMADA'];

/** Legenda da escala: cada degrau com o critério derivado dos limiares. */
export function EscalaDeSituacoes({
  politica,
}: {
  politica: PoliticaDeInadimplencia | null | undefined;
}) {
  return (
    <div className="linha" style={{ gap: 16 }}>
      <span className="linha" style={{ gap: 6 }}>
        <Selo {...seloDaSituacaoDoContrato('EM_DIA')} />
        <span className="texto-fraco">sem parcela vencida</span>
      </span>
      {DEGRAUS.map((degrau) => (
        <span key={degrau} className="linha" style={{ gap: 6 }}>
          <Selo {...seloDaSituacaoDoContrato(degrau)} />
          <span className="texto-fraco">{criterioDoDegrau(degrau, politica)}</span>
        </span>
      ))}
    </div>
  );
}
