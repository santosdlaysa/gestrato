import { Link } from 'react-router-dom';
import { Selo } from '@/componentes/comuns/Selo';
import { formatarDataHora } from '@/lib/formato';
import { rotuloDoCanal, rotuloDoEvento, rotuloDoStatusDeCobranca, tomDoStatusDeCobranca } from '@/lib/rotulos';
import type { Cobranca } from '@/tipos/cobranca';

interface Props {
  cobrancas: Cobranca[];
  aoVerDetalhes?: (id: string) => void;
}

export function TabelaDeCobrancas({ cobrancas, aoVerDetalhes }: Props) {
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
            <th>Etapa</th>
            <th>Status</th>
            <th>Erro</th>
            {aoVerDetalhes && <th className="acoes">Ações</th>}
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
              <td>{rotuloDoEvento(cobranca.evento)}</td>
              <td>
                <Selo texto={rotuloDoStatusDeCobranca(cobranca.status)} tom={tomDoStatusDeCobranca(cobranca.status)} />
              </td>
              <td className="celula-larga texto-vencido">{cobranca.erro ?? ''}</td>
              {aoVerDetalhes && (
                <td className="acoes">
                  <button type="button" className="botao botao--fantasma botao--pequeno" onClick={() => aoVerDetalhes(cobranca.id)}>
                    Detalhes
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
