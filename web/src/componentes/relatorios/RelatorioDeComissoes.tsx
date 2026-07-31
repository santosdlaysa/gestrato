import { useState } from 'react';
import { PainelDeRelatorio } from './PainelDeRelatorio';
import { CampoDeTexto } from '@/componentes/comuns/Campo';
import { useRequisicao } from '@/ganchos/useRequisicao';
import { buscarRelatorio } from '@/lib/api/relatorios';
import { formatarDinheiro, formatarNumero, formatarPercentual } from '@/lib/formato';
import { hojeIso, primeiroDiaDoMesIso } from '@/lib/datas';
import type { RelatorioDeComissoes } from '@/tipos/relatorio';

export function RelatorioDeComissoes() {
  const [de, definirDe] = useState(() => primeiroDiaDoMesIso(hojeIso()));
  const [ate, definirAte] = useState(hojeIso);
  const parametros = { de, ate };
  const requisicao = useRequisicao<RelatorioDeComissoes>(
    (sinal) => buscarRelatorio<RelatorioDeComissoes>('comissoes', parametros, sinal),
    [de, ate],
  );
  const itens = requisicao.dados?.itens ?? [];

  return (
    <PainelDeRelatorio
      titulo="Comissões"
      descricao="Comissões previstas por corretor no período"
      caminho="comissoes"
      parametros={parametros}
      requisicao={requisicao}
      vazio={() => itens.length === 0}
      filtros={<div className="filtros"><CampoDeTexto rotulo="De" tipo="date" valor={de} aoMudar={definirDe} /><CampoDeTexto rotulo="Até" tipo="date" valor={ate} aoMudar={definirAte} /></div>}
    >
      {(dados) => <div className="rolagem-horizontal"><table className="tabela"><thead><tr><th>Corretor</th><th className="numerico">Contratos</th><th className="numerico">Vendas</th><th className="numerico">Comissão</th><th className="numerico">Percentual</th></tr></thead><tbody>{dados.itens.map((item) => <tr key={item.corretorId}><td className="celula-larga">{item.corretor}</td><td className="numerico">{formatarNumero(item.contratos)}</td><td className="numerico">{formatarDinheiro(item.valorVendidoCentavos)}</td><td className="numerico texto-ok">{formatarDinheiro(item.comissaoPrevistaCentavos)}</td><td className="numerico">{formatarPercentual(item.percentualDeComissao)}</td></tr>)}</tbody></table></div>}
    </PainelDeRelatorio>
  );
}
