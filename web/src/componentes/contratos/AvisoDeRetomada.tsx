import { AVISO_DE_RETOMADA_MANUAL } from '@/lib/politica';
import { formatarNumero } from '@/lib/formato';
import type { PosicaoFinanceira } from '@/tipos/contrato';

/**
 * Contagem regressiva até o lote ficar sujeito a retomada — é o dado que decide
 * se vale ligar para o cliente hoje.
 */
export function AvisoDeRetomada({ posicao }: { posicao: PosicaoFinanceira }) {
  const dias = posicao.diasAteARetomada;
  const jaSujeito = posicao.situacao === 'SUJEITO_A_RETOMADA' || dias === 0;

  if (jaSujeito) {
    return (
      <div className="alerta-critico" role="alert" style={{ marginBottom: 12 }}>
        <div>
          <div className="alerta-critico__titulo">Lote sujeito a retomada</div>
          <div className="alerta-critico__detalhe">{AVISO_DE_RETOMADA_MANUAL}</div>
        </div>
      </div>
    );
  }

  if (posicao.situacao !== 'INADIMPLENTE' || dias === null || dias === undefined) return null;

  return (
    <div className="aviso aviso--erro" style={{ marginBottom: 12 }} role="status">
      <strong>
        Faltam {formatarNumero(dias)} dia{dias === 1 ? '' : 's'} para o lote ficar sujeito a
        retomada.
      </strong>{' '}
      {AVISO_DE_RETOMADA_MANUAL}
    </div>
  );
}
