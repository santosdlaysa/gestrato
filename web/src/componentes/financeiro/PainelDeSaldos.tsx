import { Indicador } from '@/componentes/comuns/Indicador';
import { formatarDinheiro } from '@/lib/formato';
import type { SaldoDeConta } from '@/tipos/fluxo-de-caixa';

/**
 * Posição de saldos: o saldo atual de cada conta é derivado (saldo inicial +
 * entradas − saídas), nunca gravado. Um cartão por conta ativa.
 */
export function PainelDeSaldos({ saldos }: { saldos: SaldoDeConta[] }) {
  if (saldos.length === 0) return null;
  return (
    <div className="grade grade--3">
      {saldos.map((conta) => (
        <Indicador
          key={conta.id}
          rotulo={conta.nome}
          valor={formatarDinheiro(conta.saldoAtualCentavos)}
          detalhe={`${formatarDinheiro(conta.entradasCentavos)} entradas · ${formatarDinheiro(conta.saidasCentavos)} saídas`}
          tom={conta.saldoAtualCentavos < 0 ? 'vencido' : 'ok'}
        />
      ))}
    </div>
  );
}
