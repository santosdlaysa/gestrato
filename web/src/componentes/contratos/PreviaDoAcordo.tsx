import { formatarData, formatarDinheiro } from '@/lib/formato';
import type { ParcelaDaPrevia } from '@/lib/renegociacao';

interface PropsDoResumo {
  saldoCentavos: number;
  descontoCentavos: number;
  entradaCentavos: number;
}

export function ResumoDoAcordo({
  saldoCentavos,
  descontoCentavos,
  entradaCentavos,
}: PropsDoResumo) {
  const aParcelar = saldoCentavos - descontoCentavos - entradaCentavos;

  return (
    <div className="demonstrativo">
      <div className="demonstrativo__linha">
        <span>Saldo das parcelas selecionadas</span>
        <span>{formatarDinheiro(saldoCentavos)}</span>
      </div>
      <div className="demonstrativo__linha">
        <span>Desconto</span>
        <span>− {formatarDinheiro(descontoCentavos)}</span>
      </div>
      <div className="demonstrativo__linha">
        <span>Entrada do acordo</span>
        <span>− {formatarDinheiro(entradaCentavos)}</span>
      </div>
      <div className="demonstrativo__linha demonstrativo__linha--total">
        <span>A parcelar</span>
        <span className={aParcelar < 0 ? 'texto-vencido' : ''}>{formatarDinheiro(aParcelar)}</span>
      </div>
    </div>
  );
}

const LIMITE_VISIVEL = 12;

export function PreviaDoAcordo({ parcelas }: { parcelas: ParcelaDaPrevia[] }) {
  if (parcelas.length === 0) {
    return (
      <p className="texto-suave">
        Selecione as parcelas e informe o novo plano para ver a prévia estimada.
      </p>
    );
  }

  const visiveis = parcelas.slice(0, LIMITE_VISIVEL);

  return (
    <div>
      <div className="rolagem-horizontal">
        <table className="tabela tabela--compacta">
          <thead>
            <tr>
              <th className="numerico">Nº</th>
              <th className="numerico">Vencimento</th>
              <th className="numerico">Valor estimado</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((parcela) => (
              <tr key={parcela.numero}>
                <td className="numerico">{parcela.numero}</td>
                <td className="numerico">{formatarData(parcela.vencimento)}</td>
                <td className="numerico">{formatarDinheiro(parcela.valorCentavos)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {parcelas.length > LIMITE_VISIVEL && (
        <p className="texto-fraco" style={{ marginTop: 6 }}>
          + {parcelas.length - LIMITE_VISIVEL} parcela(s). O plano definitivo é o retornado pela API
          ao confirmar o acordo.
        </p>
      )}
    </div>
  );
}
