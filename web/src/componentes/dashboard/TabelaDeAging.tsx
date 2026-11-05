import { Link, useNavigate } from 'react-router-dom';
import { Painel } from '@/componentes/comuns/Painel';
import { BarraProporcional } from '@/componentes/comuns/Indicador';
import { EstadoVazio } from '@/componentes/comuns/Estados';
import { formatarDinheiro, formatarNumero, formatarPercentual } from '@/lib/formato';
import { somarDiasIso } from '@/lib/datas';
import type { FaixaDeAging } from '@/tipos/dashboard';

const ORDEM_DAS_FAIXAS = ['1-5', '6-15', '16-30', '31-60', '61-90', '90+'];

function ordenarFaixas(aging: FaixaDeAging[]): FaixaDeAging[] {
  return [...aging].sort(
    (a, b) => ORDEM_DAS_FAIXAS.indexOf(a.faixa) - ORDEM_DAS_FAIXAS.indexOf(b.faixa),
  );
}

/**
 * Parcelas vencidas cujo atraso cai na faixa ("31-60" ou "90+"), contado a
 * partir da data de referência: atraso de N dias = vencimento N dias antes.
 */
function destinoDaFaixa(faixa: string, referencia: string): string {
  const parametros = new URLSearchParams({ situacao: 'VENCIDA' });
  if (faixa.endsWith('+')) {
    // "90+" vem depois de "61-90": é atraso acima de 90 dias.
    parametros.set('ate', somarDiasIso(referencia, -(Number(faixa.slice(0, -1)) + 1)));
  } else {
    const [minimo, maximo] = faixa.split('-').map(Number);
    parametros.set('de', somarDiasIso(referencia, -maximo));
    parametros.set('ate', somarDiasIso(referencia, -minimo));
  }
  return `/parcelas?${parametros.toString()}`;
}

interface Props {
  aging: FaixaDeAging[];
  /** Data de referência do dashboard (AAAA-MM-DD), base para contar o atraso. */
  referencia: string;
}

export function TabelaDeAging({ aging, referencia }: Props) {
  const navegar = useNavigate();
  const faixas = ordenarFaixas(aging ?? []);
  const maiorValor = faixas.reduce((maior, faixa) => Math.max(maior, faixa.valorCentavos), 0);
  const total = faixas.reduce((soma, faixa) => soma + faixa.valorCentavos, 0);

  return (
    <Painel
      titulo="Aging da inadimplência"
      descricao="Distribuição do valor vencido por faixa de dias em atraso · clique numa faixa para ver as parcelas"
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
                <tr
                  key={faixa.faixa}
                  className="linha--clicavel"
                  title="Ver as parcelas desta faixa"
                  onClick={() => navegar(destinoDaFaixa(faixa.faixa, referencia))}
                >
                  <td>
                    <Link
                      to={destinoDaFaixa(faixa.faixa, referencia)}
                      onClick={(evento) => evento.stopPropagation()}
                    >
                      <strong>{faixa.faixa}</strong>
                    </Link>
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
