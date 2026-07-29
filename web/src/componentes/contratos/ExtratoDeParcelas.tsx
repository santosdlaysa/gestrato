import { Selo } from '@/componentes/comuns/Selo';
import { formatarData, formatarDinheiro, rotularEnum } from '@/lib/formato';
import { seloDaSituacaoDaParcela } from '@/lib/rotulos';
import { classeDaLinha, valorAtualizadoCentavos } from '@/lib/parcela';
import type { Parcela, ParcelaDeCobranca } from '@/tipos/parcela';

interface Props {
  parcelas: Parcela[];
  podeBaixar: boolean;
  podeEmitir: boolean;
  aoBaixar: (parcela: ParcelaDeCobranca) => void;
  aoEmitir: (parcela: ParcelaDeCobranca) => void;
}

export function ExtratoDeParcelas({
  parcelas,
  podeBaixar,
  podeEmitir,
  aoBaixar,
  aoEmitir,
}: Props) {
  return (
    <div className="rolagem-horizontal">
      <table className="tabela tabela--compacta">
        <thead>
          <tr>
            <th className="numerico">Nº</th>
            <th>Tipo</th>
            <th>Descrição</th>
            <th className="numerico">Vencimento</th>
            <th className="numerico">Valor original</th>
            <th className="numerico">Atualizado</th>
            <th className="numerico">Pago</th>
            <th className="numerico">Atraso</th>
            <th>Situação</th>
            <th className="acoes">Ações</th>
          </tr>
        </thead>
        <tbody>
          {parcelas.map((parcela) => {
            const selo = seloDaSituacaoDaParcela(parcela.situacao);
            const atraso = parcela.demonstrativo?.diasDeAtraso ?? 0;
            const emAberto = parcela.status !== 'PAGA' && parcela.status !== 'RENEGOCIADA';
            return (
              <tr key={parcela.id} className={classeDaLinha(parcela, false)}>
                <td className="numerico">{parcela.numero}</td>
                <td>{rotularEnum(parcela.tipo)}</td>
                <td className="celula-larga">{parcela.descricao}</td>
                <td className="numerico">{formatarData(parcela.vencimento)}</td>
                <td className="numerico">{formatarDinheiro(parcela.valorOriginalCentavos)}</td>
                <td className="numerico">
                  <strong>{formatarDinheiro(valorAtualizadoCentavos(parcela))}</strong>
                </td>
                <td className="numerico">{formatarDinheiro(parcela.valorPagoCentavos)}</td>
                <td className="numerico">
                  {atraso > 0 && emAberto ? (
                    <span className="texto-vencido">{atraso}</span>
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  <Selo texto={selo.texto} tom={selo.tom} />
                </td>
                <td className="acoes">
                  {podeEmitir && emAberto && (
                    <button
                      type="button"
                      className="botao botao--fantasma botao--pequeno"
                      onClick={() => aoEmitir(parcela)}
                    >
                      {parcela.documentoVigente ? 'Reemitir' : 'Emitir'}
                    </button>
                  )}
                  {podeBaixar && emAberto && (
                    <button
                      type="button"
                      className="botao botao--fantasma botao--pequeno"
                      onClick={() => aoBaixar(parcela)}
                    >
                      Baixa
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
