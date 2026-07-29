import { Painel } from '@/componentes/comuns/Painel';
import { EstadoVazio } from '@/componentes/comuns/Estados';
import { formatarDinheiro, formatarNumero } from '@/lib/formato';
import type { QuebraDeCobrancas as Quebra } from '@/tipos/relatorio';

interface Props {
  titulo: string;
  cabecalho: string;
  linhas: Quebra[];
  rotulo: (linha: Quebra) => string;
}

export function QuebraDeCobrancas({ titulo, cabecalho, linhas, rotulo }: Props) {
  return (
    <Painel titulo={titulo} semPreenchimento>
      {linhas.length === 0 ? (
        <EstadoVazio titulo="Sem quebras" descricao="Nenhum envio agrupado neste recorte." />
      ) : (
        <div className="rolagem-horizontal">
          <table className="tabela tabela--compacta">
            <thead>
              <tr>
                <th>{cabecalho}</th>
                <th className="numerico">Envios</th>
                <th className="numerico">Enviadas</th>
                <th className="numerico">Falhas</th>
                <th className="numerico">Valor</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha, indice) => (
                <tr key={`${rotulo(linha)}-${indice}`}>
                  <td className="celula-larga">{rotulo(linha)}</td>
                  <td className="numerico">{formatarNumero(linha.envios ?? 0)}</td>
                  <td className="numerico texto-ok">{formatarNumero(linha.enviadas ?? 0)}</td>
                  <td className="numerico">
                    {(linha.falhas ?? 0) > 0 ? (
                      <span className="texto-vencido">{formatarNumero(linha.falhas ?? 0)}</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="numerico">{formatarDinheiro(linha.valorCentavos ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Painel>
  );
}
