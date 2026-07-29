import { useState } from 'react';
import { PainelDeRelatorio } from './PainelDeRelatorio';
import { CampoDeTexto } from '@/componentes/comuns/Campo';
import { BarraProporcional } from '@/componentes/comuns/Indicador';
import { useRequisicao } from '@/ganchos/useRequisicao';
import { buscarRelatorio } from '@/lib/api/relatorios';
import { extrairItens } from '@/lib/colecoes';
import { formatarCompetencia, formatarDinheiro, formatarNumero } from '@/lib/formato';
import { hojeIso, primeiroDiaDoMesIso, somarMesesIso } from '@/lib/datas';
import type { RespostaPaginada } from '@/tipos/comum';
import type { RecebimentoPorCompetencia } from '@/tipos/relatorio';

type Resposta = RecebimentoPorCompetencia[] | RespostaPaginada<RecebimentoPorCompetencia>;

function recebido(item: RecebimentoPorCompetencia): number {
  return item.totalCentavos ?? item.valorCentavos ?? 0;
}

export function RelatorioDeRecebimentos() {
  const [de, definirDe] = useState(() => primeiroDiaDoMesIso(somarMesesIso(hojeIso(), -5)));
  const [ate, definirAte] = useState(hojeIso);
  const parametros = { de, ate };

  const requisicao = useRequisicao<Resposta>(
    (sinal) => buscarRelatorio<Resposta>('recebimentos', parametros, sinal),
    [de, ate],
  );

  const itens = extrairItens(requisicao.dados);
  const maior = itens.reduce((maximo, item) => Math.max(maximo, recebido(item)), 0);

  return (
    <PainelDeRelatorio
      titulo="Recebimentos por competência"
      descricao="Baixas registradas no período"
      caminho="recebimentos"
      parametros={parametros}
      requisicao={requisicao}
      vazio={() => itens.length === 0}
      filtros={
        <div className="filtros">
          <CampoDeTexto rotulo="De" tipo="date" valor={de} aoMudar={definirDe} />
          <CampoDeTexto rotulo="Até" tipo="date" valor={ate} aoMudar={definirAte} />
        </div>
      }
    >
      {() => (
        <div className="rolagem-horizontal">
          <table className="tabela">
            <thead>
              <tr>
                <th>Competência</th>
                <th className="numerico">Baixas</th>
                <th className="numerico">Principal</th>
                <th className="numerico">Juros</th>
                <th className="numerico">Multa</th>
                <th className="numerico">Desconto</th>
                <th className="numerico">Recebido</th>
                <th style={{ width: '20%' }}>Volume</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <tr key={item.competencia}>
                  <td>{formatarCompetencia(item.competencia)}</td>
                  <td className="numerico">{formatarNumero(item.quantidade ?? 0)}</td>
                  <td className="numerico">{formatarDinheiro(item.principalCentavos ?? 0)}</td>
                  <td className="numerico">{formatarDinheiro(item.jurosCentavos ?? 0)}</td>
                  <td className="numerico">{formatarDinheiro(item.multaCentavos ?? 0)}</td>
                  <td className="numerico">{formatarDinheiro(item.descontoCentavos ?? 0)}</td>
                  <td className="numerico texto-ok">{formatarDinheiro(recebido(item))}</td>
                  <td>
                    <BarraProporcional proporcao={maior > 0 ? recebido(item) / maior : 0} tom="ok" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PainelDeRelatorio>
  );
}
