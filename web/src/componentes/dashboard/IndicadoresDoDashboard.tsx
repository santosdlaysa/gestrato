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

export function IndicadoresDoDashboard({ dados }: { dados: Dashboard }) {
  const competencia = formatarCompetencia(dados.data?.slice(0, 7));

  return (
    <div className="grade grade--3">
      <Indicador
        rotulo="Contratos ativos"
        valor={formatarNumero(dados.contratosAtivos)}
        detalhe={`${formatarNumero(dados.contratosQuitados)} quitados`}
        tom="info"
      />
      <Indicador
        rotulo="Total a receber"
        valor={formatarDinheiro(dados.totalAReceberCentavos)}
        detalhe="Saldo em aberto da carteira"
        tom="neutro"
      />
      <Indicador
        rotulo="Total vencido"
        valor={formatarDinheiro(dados.totalVencidoCentavos)}
        detalhe={`${formatarNumero(dados.parcelasVencidas?.quantidade ?? 0)} parcelas vencidas`}
        tom="vencido"
      />
      <Indicador
        rotulo="Clientes inadimplentes"
        valor={formatarNumero(dados.clientesInadimplentes)}
        detalhe={`${formatarNumero(dados.contratosInadimplentes)} contratos · ${criterioDoDegrau(
          'INADIMPLENTE',
          dados.politicaDeInadimplencia,
        )} de atraso`}
        tom="vencido"
      />
      <Indicador
        rotulo="Inadimplência"
        valor={formatarPercentual(dados.percentualDeInadimplencia)}
        detalhe="Sobre o total a receber"
        tom="atencao"
      />
      <Indicador
        rotulo="Recebido no mês"
        valor={formatarDinheiro(dados.totalRecebidoNoMesCentavos)}
        detalhe={`Competência ${competencia}`}
        tom="ok"
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
