import { Indicador } from '@/componentes/comuns/Indicador';
import { formatarDinheiro, formatarNumero } from '@/lib/formato';
import { seloDaSituacaoDoContrato } from '@/lib/rotulos';
import type { ResumoDaInadimplencia as Resumo } from '@/tipos/inadimplencia';

/** Cartões do topo: o tamanho do problema antes de olhar linha a linha. */
export function ResumoDaInadimplencia({ resumo }: { resumo: Resumo }) {
  const sujeitos = resumo.porRisco?.SUJEITO_A_RETOMADA ?? 0;
  const inadimplentes = resumo.porRisco?.INADIMPLENTE ?? 0;

  return (
    <div className="grade grade--3">
      <Indicador
        rotulo="Clientes com atraso"
        valor={formatarNumero(resumo.clientes)}
        detalhe={`${formatarNumero(resumo.parcelasVencidas)} parcelas vencidas`}
        tom="vencido"
      />
      <Indicador
        rotulo="Total em atraso"
        valor={formatarDinheiro(resumo.totalEmAtrasoCentavos)}
        detalhe={`${formatarDinheiro(resumo.principalCentavos)} de principal + ${formatarDinheiro(
          resumo.encargosCentavos,
        )} de encargos`}
        tom="vencido"
      />
      <Indicador
        rotulo={seloDaSituacaoDoContrato('SUJEITO_A_RETOMADA').texto}
        valor={formatarNumero(sujeitos)}
        detalhe={`${formatarNumero(inadimplentes)} ${seloDaSituacaoDoContrato(
          'INADIMPLENTE',
        ).texto.toLowerCase()}`}
        tom={sujeitos > 0 ? 'critico' : 'atencao'}
      />
    </div>
  );
}
