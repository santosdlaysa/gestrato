import { useCallback, useState } from 'react';
import { CabecalhoDaPagina } from '@/componentes/layout/CabecalhoDaPagina';
import { ConteudoDaRequisicao } from '@/componentes/comuns/ConteudoDaRequisicao';
import { IndicadoresDoDashboard } from '@/componentes/dashboard/IndicadoresDoDashboard';
import { AlertaDeRetomada } from '@/componentes/dashboard/AlertaDeRetomada';
import { EscalaDeAtraso } from '@/componentes/dashboard/EscalaDeAtraso';
import { BlocosDeVencimento } from '@/componentes/dashboard/BlocosDeVencimento';
import { TabelaDeAging } from '@/componentes/dashboard/TabelaDeAging';
import { RecebimentosPorMes } from '@/componentes/dashboard/RecebimentosPorMes';
import { useRequisicao } from '@/ganchos/useRequisicao';
import { buscarDashboard } from '@/lib/api/dashboard';
import { hojeIso } from '@/lib/datas';
import { formatarData } from '@/lib/formato';

export function Dashboard() {
  const [data, definirData] = useState(hojeIso);

  const requisicao = useRequisicao(
    useCallback((sinal: AbortSignal) => buscarDashboard(data, sinal), [data]),
    [data],
  );

  return (
    <>
      <CabecalhoDaPagina
        titulo="Dashboard"
        descricao={`Posição da carteira em ${formatarData(data)}`}
        acoes={
          <>
            <input
              type="date"
              value={data}
              onChange={(evento) => definirData(evento.target.value)}
              style={{ width: 160 }}
              aria-label="Data de referência"
            />
            <button type="button" className="botao" onClick={requisicao.recarregar}>
              Atualizar
            </button>
          </>
        }
      />

      <div className="corpo-da-pagina">
        <ConteudoDaRequisicao requisicao={requisicao}>
          {(dados) => (
            <div className="pilha">
              <AlertaDeRetomada lotes={dados.lotesARetomar} />
              <IndicadoresDoDashboard dados={dados} />
              <EscalaDeAtraso dados={dados} />
              <BlocosDeVencimento
                vencidas={dados.parcelasVencidas}
                vencemHoje={dados.parcelasQueVencemHoje}
                proximos7Dias={dados.proximos7Dias}
              />
              <TabelaDeAging aging={dados.aging ?? []} />
              <RecebimentosPorMes recebimentos={dados.recebimentosPorMes ?? []} />
            </div>
          )}
        </ConteudoDaRequisicao>
      </div>
    </>
  );
}
