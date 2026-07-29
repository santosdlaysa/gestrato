import { LinhaDeParcela } from './LinhaDeParcela';
import type { PermissoesDaLinha } from './LinhaDeParcela';
import type { ParcelaDeCobranca } from '@/tipos/parcela';

interface Props {
  parcelas: ParcelaDeCobranca[];
  selecionadas: Set<string>;
  aoSelecionar: (id: string) => void;
  aoSelecionarTodas: () => void;
  permissoes: PermissoesDaLinha;
  aoEmitir: (parcela: ParcelaDeCobranca) => void;
  aoCobrar: (parcela: ParcelaDeCobranca) => void;
  aoBaixar: (parcela: ParcelaDeCobranca) => void;
}

export function TabelaDeParcelas({
  parcelas,
  selecionadas,
  aoSelecionar,
  aoSelecionarTodas,
  permissoes,
  aoEmitir,
  aoCobrar,
  aoBaixar,
}: Props) {
  const todasSelecionadas = parcelas.length > 0 && selecionadas.size === parcelas.length;

  return (
    <div className="rolagem-horizontal">
      <table className="tabela">
        <thead>
          <tr>
            <th className="selecao">
              <input
                type="checkbox"
                checked={todasSelecionadas}
                onChange={aoSelecionarTodas}
                aria-label="Selecionar todas as parcelas da página"
              />
            </th>
            <th>Contrato</th>
            <th>Cliente</th>
            <th>Imóvel</th>
            <th className="numerico">Parcela</th>
            <th className="numerico">Vencimento</th>
            <th className="numerico">Valor original</th>
            <th className="numerico">Valor atualizado</th>
            <th className="numerico">Atraso</th>
            <th>Situação</th>
            <th>Documento</th>
            <th className="acoes">Ações</th>
          </tr>
        </thead>
        <tbody>
          {parcelas.map((parcela) => (
            <LinhaDeParcela
              key={parcela.id}
              parcela={parcela}
              selecionada={selecionadas.has(parcela.id)}
              aoSelecionar={aoSelecionar}
              permissoes={permissoes}
              aoEmitir={aoEmitir}
              aoCobrar={aoCobrar}
              aoBaixar={aoBaixar}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
