import { Link } from 'react-router-dom';
import { Selo } from '@/componentes/comuns/Selo';
import { formatarData, formatarDinheiro } from '@/lib/formato';
import { seloDaSituacaoDaParcela } from '@/lib/rotulos';
import {
  classeDaLinha,
  descricaoDoImovel,
  diasDeAtraso,
  estaEmAberto,
  idDoContrato,
  nomeDoCliente,
  numeroDoContrato,
  valorAtualizadoCentavos,
} from '@/lib/parcela';
import type { ParcelaDeCobranca } from '@/tipos/parcela';

export interface PermissoesDaLinha {
  emitir: boolean;
  cobrar: boolean;
  baixar: boolean;
}

interface Props {
  parcela: ParcelaDeCobranca;
  selecionada: boolean;
  aoSelecionar: (id: string) => void;
  permissoes: PermissoesDaLinha;
  aoEmitir: (parcela: ParcelaDeCobranca) => void;
  aoCobrar: (parcela: ParcelaDeCobranca) => void;
  aoBaixar: (parcela: ParcelaDeCobranca) => void;
}

export function LinhaDeParcela({
  parcela,
  selecionada,
  aoSelecionar,
  permissoes,
  aoEmitir,
  aoCobrar,
  aoBaixar,
}: Props) {
  const selo = seloDaSituacaoDaParcela(parcela.situacao);
  const atraso = diasDeAtraso(parcela);
  const contratoId = idDoContrato(parcela);
  const temDocumento = Boolean(parcela.documentoVigente);
  // Emitir/cobrar/baixar só fazem sentido em parcela em aberto (não PAGA,
  // CANCELADA nem RENEGOCIADA); nos demais o backend recusa a operação.
  const emAberto = estaEmAberto(parcela);

  return (
    <tr className={classeDaLinha(parcela, selecionada)}>
      <td className="selecao">
        <input
          type="checkbox"
          checked={selecionada}
          onChange={() => aoSelecionar(parcela.id)}
          aria-label={`Selecionar parcela ${parcela.numero}`}
        />
      </td>
      <td>
        {contratoId ? (
          <Link to={`/contratos/${contratoId}`}>{numeroDoContrato(parcela)}</Link>
        ) : (
          numeroDoContrato(parcela)
        )}
      </td>
      <td className="celula-larga">{nomeDoCliente(parcela)}</td>
      <td className="texto-suave">{descricaoDoImovel(parcela)}</td>
      <td className="numerico">
        {parcela.numero}
        {parcela.totalDeParcelas ? `/${parcela.totalDeParcelas}` : ''}
      </td>
      <td className="numerico">{formatarData(parcela.vencimento)}</td>
      <td className="numerico">{formatarDinheiro(parcela.valorOriginalCentavos)}</td>
      <td className="numerico">
        <strong>{formatarDinheiro(valorAtualizadoCentavos(parcela))}</strong>
      </td>
      <td className="numerico">
        {atraso > 0 && estaEmAberto(parcela) ? (
          <span className="texto-vencido">{atraso}</span>
        ) : (
          <span>—</span>
        )}
      </td>
      <td>
        <Selo texto={selo.texto} tom={selo.tom} />
      </td>
      <td>
        {temDocumento ? (
          <Selo texto={parcela.documentoVigente?.status ?? 'Emitido'} tom="info" />
        ) : (
          <span className="texto-fraco">—</span>
        )}
      </td>
      <td className="acoes">
        {permissoes.emitir && emAberto && (
          <button
            type="button"
            className="botao botao--fantasma botao--pequeno"
            onClick={() => aoEmitir(parcela)}
          >
            {temDocumento ? 'Reemitir' : 'Emitir'}
          </button>
        )}
        {permissoes.cobrar && emAberto && (
          <button
            type="button"
            className="botao botao--fantasma botao--pequeno"
            onClick={() => aoCobrar(parcela)}
          >
            Cobrar
          </button>
        )}
        {permissoes.baixar && emAberto && (
          <button
            type="button"
            className="botao botao--fantasma botao--pequeno"
            onClick={() => aoBaixar(parcela)}
          >
            Baixa
          </button>
        )}
      </td>
    </tr>
  );
}
