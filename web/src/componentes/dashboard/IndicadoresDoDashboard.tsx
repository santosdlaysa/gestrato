import { Indicador } from '@/componentes/comuns/Indicador';
import { formatarDinheiro, formatarNumero, formatarPercentual } from '@/lib/formato';
import { formatarCompetencia } from '@/lib/formato';
import { criterioDoDegrau } from '@/lib/politica';
import type { CobrancasEnviadas, Dashboard } from '@/tipos/dashboard';

const LEGENDA_DA_RECUPERACAO =
  'Das parcelas que venceram nos últimos 30 dias, o percentual do valor original já recebido.';

const LEGENDA_DAS_FALHAS =
  'Mensagens que o provedor de envio recusou nos últimos 30 dias — o cliente não recebeu a cobrança.';

function DetalheDeCobrancas({ envios }: { envios: CobrancasEnviadas | undefined }) {
  const falhas = envios?.falhasUltimos30Dias ?? 0;
  return (
    <>
      {formatarNumero(envios?.ultimos30Dias ?? 0)} nos últimos 30 dias
      {falhas > 0 && (
        <span className="texto-atencao" title={LEGENDA_DAS_FALHAS}>
          {' · '}
          {formatarNumero(falhas)} falha{falhas === 1 ? '' : 's'}
        </span>
      )}
    </>
  );
}

/**
 * Os quatro números que abrem a página e respondem "como está o dinheiro":
 * quanto há a receber, quanto está vencido, quanto entrou no mês e quantos
 * clientes estão devendo. Cartões grandes, sem concorrência visual.
 */
export function IndicadoresPrincipais({ dados }: { dados: Dashboard }) {
  const competencia = formatarCompetencia(dados.data?.slice(0, 7));

  return (
    <div className="grade grade--4">
      <Indicador
        destaque
        rotulo="Total a receber"
        valor={formatarDinheiro(dados.totalAReceberCentavos)}
        detalhe="Saldo em aberto da carteira"
        tom="neutro"
      />
      <Indicador
        destaque
        rotulo="Total vencido"
        valor={formatarDinheiro(dados.totalVencidoCentavos)}
        detalhe={`${formatarPercentual(dados.percentualDeInadimplencia)} da carteira · ${formatarNumero(
          dados.parcelasVencidas?.quantidade ?? 0,
        )} parcelas`}
        tom="vencido"
      />
      <Indicador
        destaque
        rotulo="Recebido no mês"
        valor={formatarDinheiro(dados.totalRecebidoNoMesCentavos)}
        detalhe={`Competência ${competencia}`}
        tom="ok"
      />
      <Indicador
        destaque
        rotulo="Clientes inadimplentes"
        valor={formatarNumero(dados.clientesInadimplentes)}
        detalhe={`${formatarNumero(dados.contratosInadimplentes)} contratos · ${criterioDoDegrau(
          'INADIMPLENTE',
          dados.politicaDeInadimplencia,
        )} de atraso`}
        tom="vencido"
      />
    </div>
  );
}

/**
 * Métricas de apoio da carteira e da operação de cobrança: contexto útil, mas
 * secundário ao que já foi destacado acima. Cartões no tamanho padrão.
 */
export function IndicadoresDaCarteira({ dados }: { dados: Dashboard }) {
  return (
    <div className="grade grade--3">
      <Indicador
        rotulo="Contratos ativos"
        valor={formatarNumero(dados.contratosAtivos)}
        detalhe={`${formatarNumero(dados.contratosQuitados)} quitados`}
        tom="info"
      />
      <Indicador
        rotulo="Cobranças enviadas"
        valor={formatarNumero(dados.cobrancasEnviadas?.hoje ?? 0)}
        detalhe={<DetalheDeCobrancas envios={dados.cobrancasEnviadas} />}
        tom="info"
      />
      <Indicador
        rotulo="Taxa de recuperação"
        valor={formatarPercentual(dados.taxaDeRecuperacao)}
        detalhe="Vencidos nos últimos 30 dias já recebidos"
        titulo={LEGENDA_DA_RECUPERACAO}
        tom="ok"
      />
    </div>
  );
}
