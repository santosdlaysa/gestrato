import { TabelaDeAging } from '@/componentes/dashboard/TabelaDeAging';
import { RecebimentosPorMes } from '@/componentes/dashboard/RecebimentosPorMes';
import type { FaixaDeAging, RecebimentoPorMes } from '@/tipos/dashboard';

interface Props {
  aging: FaixaDeAging[];
  recebimentos: RecebimentoPorMes[];
}

/**
 * Aging e recebimentos por mês são detalhamento — importam para análise, não
 * para a decisão do dia. Ficam recolhidos para não competir com o que exige
 * ação, e abrem sob demanda. `<details>` dá o comportamento de abrir/fechar
 * acessível sem estado extra.
 */
export function AnaliseDetalhada({ aging, recebimentos }: Props) {
  return (
    <details className="analise-detalhada">
      <summary className="analise-detalhada__resumo">
        <span className="analise-detalhada__titulo">Análise detalhada</span>
        <span className="analise-detalhada__dica">Aging da inadimplência e recebimentos por mês</span>
      </summary>
      <div className="analise-detalhada__corpo">
        <TabelaDeAging aging={aging} />
        <RecebimentosPorMes recebimentos={recebimentos} />
      </div>
    </details>
  );
}
