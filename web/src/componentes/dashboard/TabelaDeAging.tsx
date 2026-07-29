import { Painel } from '@/componentes/comuns/Painel';
import { BarraProporcional } from '@/componentes/comuns/Indicador';
import { EstadoVazio } from '@/componentes/comuns/Estados';
import { formatarDinheiro, formatarNumero, formatarPercentual } from '@/lib/formato';
import type { FaixaDeAging } from '@/tipos/dashboard';

const ORDEM_DAS_FAIXAS = ['1-5', '6-15', '16-30', '31-60', '61-90', '90+'];

function ordenarFaixas(aging: FaixaDeAging[]): FaixaDeAging[] {
  return [...aging].sort(
    (a, b) => ORDEM_DAS_FAIXAS.indexOf(a.faixa) - ORDEM_DAS_FAIXAS.indexOf(b.faixa),
  );
}

export function TabelaDeAging({ aging }: { aging: FaixaDeAging[] }) {
  const faixas = ordenarFaixas(aging ?? []);
  const maiorValor = faixas.reduce((maior, faixa) => Math.max(maior, faixa.valorCentavos), 0);
  const total = faixas.reduce((soma, faixa) => soma + faixa.valorCentavos, 0);

  return (
    <Painel
      titulo="Aging da inadimplência"
      descricao="Distribuição do valor vencido por faixa de dias em atraso"
      semPreenchimento
    >
      {faixas.length === 0 ? (
        <EstadoVazio titulo="Sem atrasos" descricao="Nenhuma parcela vencida no momento." />
      ) : (
        <div className="rolagem-horizontal">
          <table className="tabela">
            <thead>
              <tr>
                <th>Faixa (dias)</th>
                <th className="numerico">Parcelas</th>
                <th className="numerico">Valor vencido</th>
                <th className="numerico">% do vencido</th>
                <th style={{ width: '38%' }}>Distribuição</th>
              </tr>
            </thead>
            <tbody>
              {faixas.map((faixa) => (
                <tr key={faixa.faixa}>
                  <td>
                    <strong>{faixa.faixa}</strong>
                  </td>
                  <td className="numerico">{formatarNumero(faixa.quantidade)}</td>
                  <td className="numerico texto-vencido">
                    {formatarDinheiro(faixa.valorCentavos)}
                  </td>
                  <td className="numerico">
                    {total > 0
                      ? formatarPercentual((faixa.valorCentavos / total) * 100)
                      : formatarPercentual(0)}
                  </td>
                  <td>
                    <BarraProporcional
                      proporcao={maiorValor > 0 ? faixa.valorCentavos / maiorValor : 0}
                      titulo={formatarDinheiro(faixa.valorCentavos)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th>Total</th>
                <th className="numerico">
                  {formatarNumero(faixas.reduce((soma, faixa) => soma + faixa.quantidade, 0))}
                </th>
                <th className="numerico">{formatarDinheiro(total)}</th>
                <th className="numerico">100,0%</th>
                <th />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Painel>
  );
}
