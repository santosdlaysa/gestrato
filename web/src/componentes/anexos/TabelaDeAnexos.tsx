import { Selo } from '@/componentes/comuns/Selo';
import { formatarTamanho } from '@/lib/anexo';
import { formatarDataHora, rotularEnum } from '@/lib/formato';
import type { Anexo } from '@/tipos/anexo';

interface Props {
  anexos: Anexo[];
  podeRemover: boolean;
  ocupado: boolean;
  aoBaixar: (anexo: Anexo) => void;
  aoRemover: (anexo: Anexo) => void;
}

export function TabelaDeAnexos({ anexos, podeRemover, ocupado, aoBaixar, aoRemover }: Props) {
  return (
    <div className="rolagem-horizontal">
      <table className="tabela tabela--compacta">
        <thead>
          <tr>
            <th>Arquivo</th>
            <th>Categoria</th>
            <th className="numerico">Tamanho</th>
            <th>Enviado por</th>
            <th>Enviado em</th>
            <th className="acoes">Ações</th>
          </tr>
        </thead>
        <tbody>
          {anexos.map((anexo) => (
            <tr key={anexo.id}>
              <td className="anexo__arquivo">
                <div className="anexo__nome">{anexo.nomeOriginal}</div>
                {anexo.descricao && <div className="anexo__descricao">{anexo.descricao}</div>}
              </td>
              <td>
                <Selo texto={anexo.categoriaRotulo || rotularEnum(anexo.categoria)} tom="info" />
              </td>
              <td className="numerico">{formatarTamanho(anexo.tamanhoBytes)}</td>
              <td>{anexo.enviadoPor}</td>
              <td>{formatarDataHora(anexo.enviadoEm)}</td>
              <td className="acoes">
                <button
                  type="button"
                  className="botao botao--fantasma botao--pequeno"
                  disabled={ocupado}
                  onClick={() => aoBaixar(anexo)}
                >
                  Baixar
                </button>
                {podeRemover && (
                  <button
                    type="button"
                    className="botao botao--fantasma botao--pequeno texto-vencido"
                    disabled={ocupado}
                    onClick={() => aoRemover(anexo)}
                  >
                    Remover
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
