import { Link } from 'react-router-dom';
import { Selo } from '@/componentes/comuns/Selo';
import { formatarData, formatarDinheiro, formatarDocumento, formatarNumero } from '@/lib/formato';
import { seloDaSituacaoDoContrato } from '@/lib/rotulos';
import type { Inadimplente } from '@/tipos/inadimplencia';

interface Props {
  inadimplentes: Inadimplente[];
}

/** Monta o link do WhatsApp a partir dos dígitos guardados (adiciona o 55 se faltar). */
function linkDoWhatsApp(whatsapp: string | null): string | null {
  if (!whatsapp) return null;
  const digitos = whatsapp.replace(/\D/g, '');
  if (!digitos) return null;
  const completo = /^55/.test(digitos) ? digitos : `55${digitos}`;
  return `https://wa.me/${completo}`;
}

function unidade(inadimplente: Inadimplente): string {
  const { loteamento, quadra, lote } = inadimplente.unidadePrincipal;
  return `${loteamento} · QD ${quadra} LT ${lote}`;
}

export function TabelaDeInadimplentes({ inadimplentes }: Props) {
  return (
    <div className="rolagem-horizontal">
      <table className="tabela">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Unidade principal</th>
            <th className="numerico">Parcelas</th>
            <th className="numerico">Atraso máx.</th>
            <th className="numerico">Total em atraso</th>
            <th>Risco</th>
            <th className="acoes">Ações</th>
          </tr>
        </thead>
        <tbody>
          {inadimplentes.map((item) => {
            const risco = seloDaSituacaoDoContrato(item.risco);
            const whatsapp = linkDoWhatsApp(item.cliente.whatsapp);
            return (
              <tr key={item.clienteId}>
                <td className="celula-larga">
                  <div>{item.cliente.nome}</div>
                  <div className="texto-suave">{formatarDocumento(item.cliente.documento)}</div>
                </td>
                <td>
                  <div>{unidade(item)}</div>
                  {item.contratosEmAtraso > 1 && (
                    <div className="texto-suave">
                      +{item.contratosEmAtraso - 1} outro
                      {item.contratosEmAtraso - 1 === 1 ? '' : 's'} contrato
                      {item.contratosEmAtraso - 1 === 1 ? '' : 's'}
                    </div>
                  )}
                </td>
                <td className="numerico">{formatarNumero(item.parcelasVencidas)}</td>
                <td className="numerico">
                  <div>
                    {formatarNumero(item.diasDeAtrasoMaximo)} dia
                    {item.diasDeAtrasoMaximo === 1 ? '' : 's'}
                  </div>
                  <div className="texto-suave">desde {formatarData(item.vencimentoMaisAntigo)}</div>
                </td>
                <td className="numerico texto-vencido">
                  <div>{formatarDinheiro(item.totalEmAtrasoCentavos)}</div>
                  {item.encargosCentavos > 0 && (
                    <div className="texto-suave">
                      {formatarDinheiro(item.encargosCentavos)} de encargos
                    </div>
                  )}
                </td>
                <td>
                  <Selo
                    texto={risco.texto}
                    tom={risco.tom}
                    titulo={
                      item.diasAteARetomada > 0
                        ? `${item.diasAteARetomada} dia(s) até a retomada do lote`
                        : 'Lote já sujeito a retomada'
                    }
                  />
                </td>
                <td className="acoes">
                  <div className="linha">
                    <Link
                      className="botao botao--pequeno"
                      to={`/parcelas?situacao=VENCIDA&clienteId=${item.clienteId}`}
                    >
                      Parcelas
                    </Link>
                    {whatsapp && (
                      <a
                        className="botao botao--pequeno"
                        href={whatsapp}
                        target="_blank"
                        rel="noreferrer"
                      >
                        WhatsApp
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
