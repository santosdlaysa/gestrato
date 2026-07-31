import { Selo } from '@/componentes/comuns/Selo';
import { formatarData, formatarDinheiro, rotularEnum } from '@/lib/formato';
import type { DocumentoDeCobranca, Parcela } from '@/tipos/parcela';

interface Item {
  parcela: Parcela;
  documento: DocumentoDeCobranca;
}

interface Props {
  itens: Item[];
}

export function TabelaDeDocumentosDeCobranca({ itens }: Props) {
  return (
    <div className="rolagem-horizontal">
      <table className="tabela">
        <thead>
          <tr>
            <th>Parcela</th>
            <th>Vencimento</th>
            <th>Tipo</th>
            <th className="numerico">Valor</th>
            <th>Status</th>
            <th>Dados para pagamento</th>
          </tr>
        </thead>
        <tbody>
          {itens.map(({ parcela, documento }) => (
            <tr key={documento.id}>
              <td>{parcela.numero}</td>
              <td>{formatarData(parcela.vencimento)}</td>
              <td>{rotularEnum(documento.tipo)}</td>
              <td className="numerico">{formatarDinheiro(documento.valorCentavos ?? parcela.valorOriginalCentavos)}</td>
              <td><Selo texto={rotularEnum(documento.status)} tom={documento.status === 'EMITIDO' ? 'ok' : 'neutro'} /></td>
              <td className="celula-larga">
                {documento.linhaDigitavel && <div><strong>Linha:</strong> {documento.linhaDigitavel}</div>}
                {documento.pixCopiaECola && <div><strong>Pix:</strong> {documento.pixCopiaECola}</div>}
                {!documento.linhaDigitavel && !documento.pixCopiaECola && documento.urlDoDocumento && (
                  <a href={documento.urlDoDocumento} target="_blank" rel="noreferrer">Abrir documento</a>
                )}
                {!documento.linhaDigitavel && !documento.pixCopiaECola && !documento.urlDoDocumento && '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
