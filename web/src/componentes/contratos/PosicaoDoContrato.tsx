import { Painel } from '@/componentes/comuns/Painel';
import { Selo } from '@/componentes/comuns/Selo';
import { AvisoDeRetomada } from './AvisoDeRetomada';
import { formatarData, formatarDinheiro, formatarNumero } from '@/lib/formato';
import { seloDaSituacaoDoContrato } from '@/lib/rotulos';
import type { PosicaoFinanceira } from '@/tipos/contrato';

interface Props {
  posicao: PosicaoFinanceira | null | undefined;
}

export function PosicaoDoContrato({ posicao }: Props) {
  if (!posicao) {
    return (
      <Painel titulo="Posição financeira">
        <p className="texto-suave">A API não retornou a posição financeira deste contrato.</p>
      </Painel>
    );
  }

  const selo = seloDaSituacaoDoContrato(posicao.situacao);

  return (
    <Painel
      titulo="Posição financeira"
      acoes={<Selo texto={selo.texto} tom={selo.tom} />}
    >
      <AvisoDeRetomada posicao={posicao} />
      <div className="definicoes">
        <div>
          <div className="definicao__rotulo">Valor total</div>
          <div className="definicao__valor">{formatarDinheiro(posicao.valorTotalCentavos)}</div>
        </div>
        <div>
          <div className="definicao__rotulo">Recebido</div>
          <div className="definicao__valor texto-ok">
            {formatarDinheiro(posicao.totalRecebidoCentavos)}
          </div>
        </div>
        <div>
          <div className="definicao__rotulo">Saldo devedor</div>
          <div className="definicao__valor">{formatarDinheiro(posicao.saldoDevedorCentavos)}</div>
        </div>
        <div>
          <div className="definicao__rotulo">Vencido</div>
          <div className="definicao__valor texto-vencido">
            {formatarDinheiro(posicao.totalVencidoCentavos)}
          </div>
        </div>
        <div>
          <div className="definicao__rotulo">A vencer</div>
          <div className="definicao__valor">{formatarDinheiro(posicao.totalAVencerCentavos)}</div>
        </div>
        <div>
          <div className="definicao__rotulo">Encargos acumulados</div>
          <div className="definicao__valor">
            {formatarDinheiro(posicao.encargosAcumuladosCentavos)}
          </div>
        </div>
        <div>
          <div className="definicao__rotulo">Parcelas pagas</div>
          <div className="definicao__valor">{formatarNumero(posicao.parcelasPagas)}</div>
        </div>
        <div>
          <div className="definicao__rotulo">Em aberto / vencidas</div>
          <div className="definicao__valor">
            {formatarNumero(posicao.parcelasEmAberto)} / {formatarNumero(posicao.parcelasVencidas)}
          </div>
        </div>
        <div>
          <div className="definicao__rotulo">Próximo vencimento</div>
          <div className="definicao__valor">{formatarData(posicao.proximoVencimento)}</div>
        </div>
        <div>
          <div className="definicao__rotulo">Atraso máximo</div>
          <div className="definicao__valor">
            {posicao.diasDeAtrasoMaximo > 0 ? `${posicao.diasDeAtrasoMaximo} dias` : '—'}
          </div>
        </div>
      </div>
    </Painel>
  );
}
