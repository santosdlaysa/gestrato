import { formatarDinheiro } from '@/lib/formato';
import type { DemonstrativoDaParcela } from '@/tipos/parcela';

interface Props {
  demonstrativo: DemonstrativoDaParcela | null;
  valorOriginalCentavos: number;
}

export function Demonstrativo({ demonstrativo, valorOriginalCentavos }: Props) {
  const principal = demonstrativo?.saldoPrincipalCentavos ?? valorOriginalCentavos;
  const multa = demonstrativo?.multaCentavos ?? 0;
  const juros = demonstrativo?.jurosCentavos ?? 0;
  const total = demonstrativo?.totalCentavos ?? valorOriginalCentavos;
  const atraso = demonstrativo?.diasDeAtraso ?? 0;

  return (
    <div className="demonstrativo">
      <div className="demonstrativo__linha">
        <span>Saldo principal</span>
        <span>{formatarDinheiro(principal)}</span>
      </div>
      <div className="demonstrativo__linha">
        <span>Multa por atraso</span>
        <span>{formatarDinheiro(multa)}</span>
      </div>
      <div className="demonstrativo__linha">
        <span>Juros ({demonstrativo?.diasCobrados ?? 0} dias cobrados)</span>
        <span>{formatarDinheiro(juros)}</span>
      </div>
      <div className="demonstrativo__linha demonstrativo__linha--total">
        <span>Total atualizado{atraso > 0 ? ` · ${atraso} dias em atraso` : ''}</span>
        <span className={atraso > 0 ? 'texto-vencido' : ''}>{formatarDinheiro(total)}</span>
      </div>
    </div>
  );
}
