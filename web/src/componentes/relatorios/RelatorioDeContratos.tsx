import { useState } from 'react';
import { PainelDeRelatorio } from './PainelDeRelatorio';
import { CampoDeSelecao, CampoDeTexto } from '@/componentes/comuns/Campo';
import { useRequisicao } from '@/ganchos/useRequisicao';
import { buscarRelatorio } from '@/lib/api/relatorios';
import { formatarDinheiro, formatarNumero } from '@/lib/formato';
import { hojeIso } from '@/lib/datas';
import type { RelatorioDeContratos } from '@/tipos/relatorio';

const STATUS = [
  { valor: 'ATIVO', texto: 'Ativo' },
  { valor: 'QUITADO', texto: 'Quitado' },
  { valor: 'DISTRATADO', texto: 'Distratado' },
];

export function RelatorioDeContratos() {
  const [data, definirData] = useState(hojeIso);
  const [status, definirStatus] = useState('');
  const parametros = { data, status: status || undefined };
  const requisicao = useRequisicao<RelatorioDeContratos>(
    (sinal) => buscarRelatorio<RelatorioDeContratos>('contratos', parametros, sinal),
    [data, status],
  );
  const itens = requisicao.dados?.itens ?? [];

  return (
    <PainelDeRelatorio
      titulo="Contratos"
      descricao="Posição dos contratos na data de referência"
      caminho="contratos"
      parametros={parametros}
      requisicao={requisicao}
      vazio={() => itens.length === 0}
      filtros={<div className="filtros"><CampoDeTexto rotulo="Data" tipo="date" valor={data} aoMudar={definirData} /><CampoDeSelecao rotulo="Status" valor={status} opcoes={STATUS} aoMudar={definirStatus} /></div>}
    >
      {(dados) => <div className="rolagem-horizontal"><table className="tabela"><thead><tr><th>Contrato</th><th>Cliente</th><th>Loteamento</th><th className="numerico">Parcelas vencidas</th><th className="numerico">Saldo devedor</th><th>Situação</th></tr></thead><tbody>{dados.itens.map((item) => <tr key={item.contratoId}><td>{item.numero}</td><td className="celula-larga">{item.cliente}</td><td>{item.loteamento}</td><td className="numerico">{formatarNumero(item.parcelasVencidas)}</td><td className="numerico">{formatarDinheiro(item.saldoDevedorCentavos)}</td><td>{item.situacao}</td></tr>)}</tbody></table></div>}
    </PainelDeRelatorio>
  );
}
