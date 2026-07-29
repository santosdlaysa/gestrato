import { Link } from 'react-router-dom';
import { Selo } from '@/componentes/comuns/Selo';
import { formatarDataHora } from '@/lib/formato';
import { rotuloDoCanal, tomDoStatusDeCobranca } from '@/lib/rotulos';
import type { Cobranca } from '@/tipos/cobranca';

export function TabelaDeCobrancas({ cobrancas }: { cobrancas: Cobranca[] }) {
  return (
    <div className="rolagem-horizontal">
      <table className="tabela">
        <thead>
          <tr>
            <th>Data</th>
            <th>Cliente</th>
            <th>Contrato</th>
            <th className="numerico">Parcela</th>
            <th>Canal</th>
            <th>Evento</th>
            <th>Status</th>
            <th>Erro</th>
          </tr>
        </thead>
        <tbody>
          {cobrancas.map((cobranca) => (
            <tr key={cobranca.id}>
              <td className="numerico">{formatarDataHora(cobranca.enviadaEm ?? cobranca.criadaEm)}</td>
              <td className="celula-larga">{cobranca.cliente ?? '—'}</td>
              <td>
                {cobranca.contratoId ? (
                  <Link to={`/contratos/${cobranca.contratoId}`}>{cobranca.contrato ?? '—'}</Link>
                ) : (
                  (cobranca.contrato ?? '—')
                )}
              </td>
              <td className="numerico">{cobranca.parcela ?? '—'}</td>
              <td>{rotuloDoCanal(cobranca.canal)}</td>
              <td>{cobranca.evento ?? '—'}</td>
              <td>
                <Selo texto={cobranca.status} tom={tomDoStatusDeCobranca(cobranca.status)} />
              </td>
              <td className="celula-larga texto-vencido">{cobranca.erro ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
