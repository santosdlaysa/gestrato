import { useCallback, useState } from 'react';
import { CabecalhoDaPagina } from '@/componentes/layout/CabecalhoDaPagina';
import { ConteudoDaRequisicao } from '@/componentes/comuns/ConteudoDaRequisicao';
import { Secao } from '@/componentes/comuns/Secao';
import {
  IndicadoresPrincipais,
  IndicadoresDaCarteira,
} from '@/componentes/dashboard/IndicadoresDoDashboard';
import { AlertaDeRetomada } from '@/componentes/dashboard/AlertaDeRetomada';
import { EscalaDeAtraso } from '@/componentes/dashboard/EscalaDeAtraso';
import { BlocosDeVencimento } from '@/componentes/dashboard/BlocosDeVencimento';
import { AnaliseDetalhada } from '@/componentes/dashboard/AnaliseDetalhada';
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
            <div className="pilha pilha--larga">
              <AlertaDeRetomada lotes={dados.lotesARetomar} />

              <IndicadoresPrincipais dados={dados} />

              <Secao
                titulo="Ação imediata"
                descricao="Parcelas que exigem cobrança agora"
              >
                <BlocosDeVencimento
                  vencidas={dados.parcelasVencidas}
                  vencemHoje={dados.parcelasQueVencemHoje}
                  proximos7Dias={dados.proximos7Dias}
                />
              </Secao>

              <Secao
                titulo="Carteira e cobrança"
                descricao="Saúde da operação e evolução do atraso"
              >
                <IndicadoresDaCarteira dados={dados} />
                <EscalaDeAtraso dados={dados} />
              </Secao>

              <AnaliseDetalhada
                aging={dados.aging ?? []}
                recebimentos={dados.recebimentosPorMes ?? []}
              />
            </div>
          )}
        </ConteudoDaRequisicao>
      </div>
    </>
  );
}
