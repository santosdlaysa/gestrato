import { formatarData, formatarDinheiro } from '@/lib/formato';
import { valorAtualizadoCentavos } from '@/lib/parcela';
import type { Parcela } from '@/tipos/parcela';

interface Props {
  parcelas: Parcela[];
  selecionadas: Set<string>;
  aoAlternar: (id: string) => void;
  aoAlternarTodas: () => void;
}

export function SelecaoDeParcelasDoAcordo({
  parcelas,
  selecionadas,
  aoAlternar,
  aoAlternarTodas,
}: Props) {
  const todas = parcelas.length > 0 && selecionadas.size === parcelas.length;

  return (
    <div className="rolagem-horizontal" style={{ maxHeight: 240, overflowY: 'auto' }}>
      <table className="tabela tabela--compacta">
        <thead>
          <tr>
            <th className="selecao">
              <input
                type="checkbox"
                checked={todas}
                onChange={aoAlternarTodas}
                aria-label="Selecionar todas as parcelas em aberto"
              />
            </th>
            <th className="numerico">Nº</th>
            <th className="numerico">Vencimento</th>
            <th className="numerico">Original</th>
            <th className="numerico">Atualizado</th>
          </tr>
        </thead>
        <tbody>
          {parcelas.map((parcela) => (
            <tr key={parcela.id} className={selecionadas.has(parcela.id) ? 'linha--selecionada' : ''}>
              <td className="selecao">
                <input
                  type="checkbox"
                  checked={selecionadas.has(parcela.id)}
                  onChange={() => aoAlternar(parcela.id)}
                  aria-label={`Incluir parcela ${parcela.numero} no acordo`}
                />
              </td>
              <td className="numerico">{parcela.numero}</td>
              <td className="numerico">{formatarData(parcela.vencimento)}</td>
              <td className="numerico">{formatarDinheiro(parcela.valorOriginalCentavos)}</td>
              <td className="numerico">{formatarDinheiro(valorAtualizadoCentavos(parcela))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
