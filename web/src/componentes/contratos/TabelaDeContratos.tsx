import { Link } from 'react-router-dom';
import { Selo } from '@/componentes/comuns/Selo';
import { formatarData, formatarDinheiro, rotularEnum } from '@/lib/formato';
import { seloDaSituacaoDoContrato } from '@/lib/rotulos';
import type { Contrato } from '@/tipos/contrato';

interface Props {
  contratos: Contrato[];
  /** A listagem devolve só os ids; os nomes vêm dos cadastros já carregados. */
  nomesDeClientes?: Map<string, string>;
  descricoesDeLotes?: Map<string, string>;
}

function nomeDoCliente(contrato: Contrato, nomes: Map<string, string> | undefined): string {
  return contrato.cliente?.nome ?? nomes?.get(contrato.clienteId) ?? '—';
}

function descricaoDoLote(contrato: Contrato, lotes: Map<string, string> | undefined): string {
  const lote = contrato.lote;
  if (lote) {
    const partes = [lote.loteamento, lote.quadra && `Q ${lote.quadra}`, `L ${lote.numero}`];
    return partes.filter(Boolean).join(' · ');
  }
  return lotes?.get(contrato.loteId) ?? contrato.loteamento ?? '—';
}

export function TabelaDeContratos({ contratos, nomesDeClientes, descricoesDeLotes }: Props) {
  return (
    <div className="rolagem-horizontal">
      <table className="tabela">
        <thead>
          <tr>
            <th>Contrato</th>
            <th>Cliente</th>
            <th>Imóvel</th>
            <th className="numerico">Valor total</th>
            <th className="numerico">Saldo devedor</th>
            <th className="numerico">Vencido</th>
            <th className="numerico">Atraso</th>
            <th className="numerico">Próx. vencimento</th>
            <th>Situação</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {contratos.map((contrato) => {
            const posicao = contrato.posicao;
            const selo = seloDaSituacaoDoContrato(posicao?.situacao ?? contrato.situacao ?? '');
            const atraso = posicao?.diasDeAtrasoMaximo ?? 0;
            return (
              <tr key={contrato.id}>
                <td>
                  <Link to={`/contratos/${contrato.id}`}>
                    <strong>{contrato.numero}</strong>
                  </Link>
                </td>
                <td className="celula-larga">{nomeDoCliente(contrato, nomesDeClientes)}</td>
                <td className="texto-suave">{descricaoDoLote(contrato, descricoesDeLotes)}</td>
                <td className="numerico">{formatarDinheiro(contrato.valorTotalCentavos)}</td>
                <td className="numerico">
                  {posicao ? formatarDinheiro(posicao.saldoDevedorCentavos) : '—'}
                </td>
                <td className="numerico">
                  {posicao && posicao.totalVencidoCentavos > 0 ? (
                    <span className="texto-vencido">
                      {formatarDinheiro(posicao.totalVencidoCentavos)}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="numerico">
                  {atraso > 0 ? <span className="texto-vencido">{atraso}</span> : '—'}
                </td>
                <td className="numerico">{formatarData(posicao?.proximoVencimento)}</td>
                <td>
                  <Selo texto={selo.texto} tom={selo.tom} />
                </td>
                <td className="texto-suave">{rotularEnum(contrato.status)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
