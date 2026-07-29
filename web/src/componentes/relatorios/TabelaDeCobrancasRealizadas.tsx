import { Link } from 'react-router-dom';
import { Selo } from '@/componentes/comuns/Selo';
import { formatarData, formatarDataHora, formatarDinheiro } from '@/lib/formato';
import { rotuloDoCanal, tomDoStatusDeCobranca } from '@/lib/rotulos';
import type { CobrancaRealizada } from '@/tipos/relatorio';

export function TabelaDeCobrancasRealizadas({ itens }: { itens: CobrancaRealizada[] }) {
  return (
    <div className="rolagem-horizontal">
      <table className="tabela">
        <thead>
          <tr>
            <th>Referência</th>
            <th>Envio</th>
            <th>Cliente</th>
            <th>Contrato</th>
            <th className="numerico">Parcela</th>
            <th>Canal</th>
            <th>Destino</th>
            <th>Evento</th>
            <th>Status</th>
            <th className="numerico">Valor</th>
            <th>Erro</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item, indice) => (
            <tr key={item.id ?? `${item.canal}-${indice}`}>
              <td className="numerico">{formatarData(item.dataDeReferencia)}</td>
              <td className="numerico">{formatarDataHora(item.enviadaEm ?? item.criadaEm)}</td>
              <td className="celula-larga">{item.cliente ?? '—'}</td>
              <td>
                {item.contratoId ? (
                  <Link to={`/contratos/${item.contratoId}`}>{item.contrato ?? '—'}</Link>
                ) : (
                  (item.contrato ?? '—')
                )}
              </td>
              <td className="numerico">{item.parcela ?? '—'}</td>
              <td>{rotuloDoCanal(item.canal)}</td>
              <td className="texto-suave">{item.destino ?? '—'}</td>
              <td>{item.evento ?? '—'}</td>
              <td>
                <Selo texto={item.status} tom={tomDoStatusDeCobranca(item.status)} />
              </td>
              <td className="numerico">{formatarDinheiro(item.valorCentavos ?? 0)}</td>
              <td className="celula-larga texto-vencido">{item.erro ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
