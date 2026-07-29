import { Indicador } from '@/componentes/comuns/Indicador';
import { formatarDinheiro, formatarNumero } from '@/lib/formato';
import type { ResumoDeCobrancas } from '@/tipos/relatorio';

export function TotaisDeCobrancas({ resumo }: { resumo: ResumoDeCobrancas | null | undefined }) {
  return (
    <div className="grade grade--auto">
      <Indicador rotulo="Envios" valor={formatarNumero(resumo?.envios ?? 0)} tom="info" />
      <Indicador rotulo="Enviadas" valor={formatarNumero(resumo?.enviadas ?? 0)} tom="ok" />
      <Indicador rotulo="Falhas" valor={formatarNumero(resumo?.falhas ?? 0)} tom="vencido" />
      <Indicador
        rotulo="Canceladas"
        valor={formatarNumero(resumo?.canceladas ?? 0)}
        tom="neutro"
      />
      <Indicador
        rotulo="Valor cobrado"
        valor={formatarDinheiro(
          resumo?.valorCobradoCentavos ?? resumo?.valorTotalCobradoCentavos ?? 0,
        )}
        detalhe="Soma das parcelas cobradas no período"
      />
      <Indicador
        rotulo="Clientes alcançados"
        valor={formatarNumero(resumo?.clientesAlcancados ?? 0)}
        tom="neutro"
      />
    </div>
  );
}
