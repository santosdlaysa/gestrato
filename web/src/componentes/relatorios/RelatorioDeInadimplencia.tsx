import { useState } from 'react';
import { PainelDeRelatorio } from './PainelDeRelatorio';
import { CampoDeSelecao, CampoDeTexto } from '@/componentes/comuns/Campo';
import { BarraProporcional } from '@/componentes/comuns/Indicador';
import { useRequisicao } from '@/ganchos/useRequisicao';
import { useOpcoesDeLoteamentos } from '@/ganchos/useOpcoesDeCadastro';
import { buscarRelatorio } from '@/lib/api/relatorios';
import { extrairItens } from '@/lib/colecoes';
import { formatarDinheiro, formatarNumero, formatarPercentual } from '@/lib/formato';
import { seloDaSituacaoDoContrato } from '@/lib/rotulos';
import { hojeIso } from '@/lib/datas';
import type { RespostaPaginada } from '@/tipos/comum';
import type { InadimplenciaPorLoteamento, QuebraPorSituacao } from '@/tipos/relatorio';

type Resposta = InadimplenciaPorLoteamento[] | RespostaPaginada<InadimplenciaPorLoteamento>;

/** Situações da escala de atraso exibidas como quebra, na ordem da gravidade. */
const SITUACOES_DA_QUEBRA = ['EM_ATRASO', 'INADIMPLENTE', 'SUJEITO_A_RETOMADA'];

function valorVencido(item: InadimplenciaPorLoteamento): number {
  return item.valorVencidoCentavos ?? item.totalVencidoCentavos ?? 0;
}

function contarNaSituacao(quebras: QuebraPorSituacao[] | undefined, situacao: string): string {
  if (!quebras) return '—';
  const encontrada = quebras.find((quebra) => quebra.situacao === situacao);
  if (!encontrada) return '0';
  return formatarNumero(encontrada.contratos ?? encontrada.quantidade ?? 0);
}

export function RelatorioDeInadimplencia() {
  const [loteamentoId, definirLoteamentoId] = useState('');
  const [data, definirData] = useState(hojeIso);
  const loteamentos = useOpcoesDeLoteamentos();
  const parametros = { loteamentoId: loteamentoId || undefined, data };

  const requisicao = useRequisicao<Resposta>(
    (sinal) => buscarRelatorio<Resposta>('inadimplencia', parametros, sinal),
    [loteamentoId, data],
  );

  const itens = extrairItens(requisicao.dados);
  const maior = itens.reduce((maximo, item) => Math.max(maximo, valorVencido(item)), 0);

  return (
    <PainelDeRelatorio
      titulo="Inadimplência por loteamento"
      descricao="Valor vencido consolidado por empreendimento"
      caminho="inadimplencia"
      parametros={parametros}
      requisicao={requisicao}
      vazio={() => itens.length === 0}
      filtros={
        <div className="filtros">
          <CampoDeSelecao
            rotulo="Loteamento"
            valor={loteamentoId}
            opcoes={loteamentos}
            aoMudar={definirLoteamentoId}
          />
          <CampoDeTexto rotulo="Data" tipo="date" valor={data} aoMudar={definirData} />
        </div>
      }
    >
      {() => (
        <div className="rolagem-horizontal">
          <table className="tabela">
            <thead>
              <tr>
                <th>Loteamento</th>
                <th className="numerico">Contratos</th>
                {SITUACOES_DA_QUEBRA.map((situacao) => (
                  <th key={situacao} className="numerico">
                    {seloDaSituacaoDoContrato(situacao).texto}
                  </th>
                ))}
                <th className="numerico">Parcelas vencidas</th>
                <th className="numerico">Total vencido</th>
                <th className="numerico">% inadimplência</th>
                <th style={{ width: '20%' }}>Peso</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item, indice) => (
                <tr key={item.loteamentoId ?? `${item.loteamento}-${indice}`}>
                  <td className="celula-larga">{item.loteamento}</td>
                  <td className="numerico">
                    {formatarNumero(item.contratosInadimplentes ?? item.contratos ?? 0)}
                  </td>
                  {SITUACOES_DA_QUEBRA.map((situacao) => (
                    <td key={situacao} className="numerico">
                      {contarNaSituacao(item.porSituacao, situacao)}
                    </td>
                  ))}
                  <td className="numerico">{formatarNumero(item.parcelasVencidas ?? 0)}</td>
                  <td className="numerico texto-vencido">
                    {formatarDinheiro(valorVencido(item))}
                  </td>
                  <td className="numerico">
                    {item.percentualDeInadimplencia === undefined
                      ? '—'
                      : formatarPercentual(item.percentualDeInadimplencia)}
                  </td>
                  <td>
                    <BarraProporcional proporcao={maior > 0 ? valorVencido(item) / maior : 0} />
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
