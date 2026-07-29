import { Link } from 'react-router-dom';
import { formatarDinheiro, formatarNumero } from '@/lib/formato';
import { AVISO_DE_RETOMADA_MANUAL } from '@/lib/politica';
import type { LotesARetomar } from '@/tipos/dashboard';

/**
 * Só aparece quando há lote em risco: alerta permanente vira paisagem e deixa
 * de ser lido.
 */
export function AlertaDeRetomada({ lotes }: { lotes: LotesARetomar | undefined }) {
  const quantidade = lotes?.quantidade ?? 0;
  if (quantidade <= 0) return null;

  return (
    <div className="alerta-critico" role="alert">
      <div>
        <div className="alerta-critico__titulo">
          {formatarNumero(quantidade)} lote{quantidade === 1 ? '' : 's'} sujeito
          {quantidade === 1 ? '' : 's'} a retomada
        </div>
        <div className="alerta-critico__detalhe">{AVISO_DE_RETOMADA_MANUAL}</div>
      </div>

      <div className="alerta-critico__numeros">
        <div>
          <div className="indicador__rotulo">Valor vencido</div>
          <div className="alerta-critico__numero">
            {formatarDinheiro(lotes?.valorVencidoCentavos ?? 0)}
          </div>
        </div>
        <Link className="botao botao--critico" to="/relatorios?aba=lotes-a-retomar">
          Ver lotes a retomar
        </Link>
      </div>
    </div>
  );
}
