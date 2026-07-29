import { useState } from 'react';
import { PainelDeRelatorio } from './PainelDeRelatorio';
import { TotaisDeCobrancas } from './TotaisDeCobrancas';
import { QuebraDeCobrancas } from './QuebraDeCobrancas';
import { TabelaDeCobrancasRealizadas } from './TabelaDeCobrancasRealizadas';
import { CampoDeSelecao, CampoDeTexto } from '@/componentes/comuns/Campo';
import { useRequisicao } from '@/ganchos/useRequisicao';
import { buscarRelatorio } from '@/lib/api/relatorios';
import { extrairItens } from '@/lib/colecoes';
import { hojeIso, primeiroDiaDoMesIso, somarMesesIso } from '@/lib/datas';
import { rotuloDoCanal } from '@/lib/rotulos';
import { CANAIS } from '@/tipos/cobranca';
import { STATUS_DO_RELATORIO_DE_COBRANCAS } from '@/tipos/relatorio';
import type { RelatorioDeCobrancas } from '@/tipos/relatorio';

const OPCOES_DE_CANAL = CANAIS.map((canal) => ({ valor: canal, texto: rotuloDoCanal(canal) }));

const OPCOES_DE_STATUS = STATUS_DO_RELATORIO_DE_COBRANCAS.map((status) => ({
  valor: status,
  texto: status,
}));

export function RelatorioDeCobrancasRealizadas() {
  const [de, definirDe] = useState(() => primeiroDiaDoMesIso(somarMesesIso(hojeIso(), -1)));
  const [ate, definirAte] = useState(hojeIso);
  const [canal, definirCanal] = useState('');
  const [status, definirStatus] = useState('');

  const parametros = {
    de,
    ate,
    canal: canal || undefined,
    status: status || undefined,
  };

  const requisicao = useRequisicao<RelatorioDeCobrancas>(
    (sinal) => buscarRelatorio<RelatorioDeCobrancas>('cobrancas', parametros, sinal),
    [de, ate, canal, status],
  );

  const porCanal = extrairItens(requisicao.dados?.porCanal);
  const porEvento = extrairItens(requisicao.dados?.porEvento);
  const itens = extrairItens(requisicao.dados?.itens);
  const semDados = !requisicao.dados?.resumo && itens.length === 0;

  return (
    <PainelDeRelatorio
      titulo="Cobranças realizadas"
      descricao="Envios da régua e avulsos, com quebras por canal e por evento"
      caminho="cobrancas"
      parametros={parametros}
      requisicao={requisicao}
      vazio={() => semDados}
      filtros={
        <div className="filtros">
          <CampoDeTexto rotulo="De" tipo="date" valor={de} aoMudar={definirDe} />
          <CampoDeTexto rotulo="Até" tipo="date" valor={ate} aoMudar={definirAte} />
          <CampoDeSelecao
            rotulo="Canal"
            valor={canal}
            opcoes={OPCOES_DE_CANAL}
            aoMudar={definirCanal}
          />
          <CampoDeSelecao
            rotulo="Status"
            valor={status}
            opcoes={OPCOES_DE_STATUS}
            aoMudar={definirStatus}
          />
        </div>
      }
    >
      {(dados) => (
        <div className="pilha painel__corpo">
          <TotaisDeCobrancas resumo={dados.resumo} />

          <div className="grade grade--2">
            <QuebraDeCobrancas
              titulo="Por canal"
              cabecalho="Canal"
              linhas={porCanal}
              rotulo={(linha) => rotuloDoCanal(linha.canal ?? '—')}
            />
            <QuebraDeCobrancas
              titulo="Por evento da régua"
              cabecalho="Evento"
              linhas={porEvento}
              rotulo={(linha) => linha.evento ?? '—'}
            />
          </div>

          <TabelaDeCobrancasRealizadas itens={itens} />
        </div>
      )}
    </PainelDeRelatorio>
  );
}
