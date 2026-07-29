import { useState } from 'react';
import { PainelDeRelatorio } from './PainelDeRelatorio';
import { CampoDeTexto } from '@/componentes/comuns/Campo';
import { BarraProporcional } from '@/componentes/comuns/Indicador';
import { useRequisicao } from '@/ganchos/useRequisicao';
import { buscarRelatorio } from '@/lib/api/relatorios';
import { extrairItens } from '@/lib/colecoes';
import { formatarCompetencia, formatarDinheiro, formatarNumero } from '@/lib/formato';
import type { RespostaPaginada } from '@/tipos/comum';
import type { PrevisaoDeFluxo } from '@/tipos/relatorio';

type Resposta = PrevisaoDeFluxo[] | RespostaPaginada<PrevisaoDeFluxo>;

export function RelatorioDeFluxoPrevisto() {
  const [meses, definirMeses] = useState('12');
  const parametros = { meses: Number(meses) || 12 };

  const requisicao = useRequisicao<Resposta>(
    (sinal) => buscarRelatorio<Resposta>('fluxo-previsto', parametros, sinal),
    [meses],
  );

  const itens = extrairItens(requisicao.dados);
  const maior = itens.reduce((maximo, item) => Math.max(maximo, item.valorCentavos), 0);
  const total = itens.reduce((soma, item) => soma + item.valorCentavos, 0);

  return (
    <PainelDeRelatorio
      titulo="Fluxo previsto"
      descricao={`Total a receber no horizonte: ${formatarDinheiro(total)}`}
      caminho="fluxo-previsto"
      parametros={parametros}
      requisicao={requisicao}
      vazio={() => itens.length === 0}
      filtros={
        <div className="filtros">
          <CampoDeTexto rotulo="Meses" tipo="number" valor={meses} aoMudar={definirMeses} />
        </div>
      }
    >
      {() => (
        <div className="rolagem-horizontal">
          <table className="tabela">
            <thead>
              <tr>
                <th>Competência</th>
                <th className="numerico">Parcelas</th>
                <th className="numerico">Previsto</th>
                <th style={{ width: '35%' }}>Volume</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <tr key={item.competencia}>
                  <td>{formatarCompetencia(item.competencia)}</td>
                  <td className="numerico">{formatarNumero(item.quantidade ?? 0)}</td>
                  <td className="numerico">{formatarDinheiro(item.valorCentavos)}</td>
                  <td>
                    <BarraProporcional
                      proporcao={maior > 0 ? item.valorCentavos / maior : 0}
                      tom="info"
                    />
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
