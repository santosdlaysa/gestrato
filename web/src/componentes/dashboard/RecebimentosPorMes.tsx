import { Painel } from '@/componentes/comuns/Painel';
import { BarraProporcional } from '@/componentes/comuns/Indicador';
import { EstadoVazio } from '@/componentes/comuns/Estados';
import { formatarCompetencia, formatarDinheiro } from '@/lib/formato';
import type { RecebimentoPorMes } from '@/tipos/dashboard';

export function RecebimentosPorMes({ recebimentos }: { recebimentos: RecebimentoPorMes[] }) {
  const linhas = recebimentos ?? [];
  const maior = linhas.reduce((maximo, linha) => Math.max(maximo, linha.valorCentavos), 0);

  return (
    <Painel titulo="Recebimentos por mês" semPreenchimento>
      {linhas.length === 0 ? (
        <EstadoVazio titulo="Sem recebimentos" descricao="Nenhuma baixa registrada no período." />
      ) : (
        <div className="rolagem-horizontal">
          <table className="tabela tabela--compacta">
            <thead>
              <tr>
                <th>Competência</th>
                <th className="numerico">Recebido</th>
                <th style={{ width: '45%' }}>Volume</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha) => (
                <tr key={linha.competencia}>
                  <td>{formatarCompetencia(linha.competencia)}</td>
                  <td className="numerico texto-ok">{formatarDinheiro(linha.valorCentavos)}</td>
                  <td>
                    <BarraProporcional
                      proporcao={maior > 0 ? linha.valorCentavos / maior : 0}
                      tom="ok"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Painel>
  );
}
