import { CampoDeSelecao, CampoDeTexto } from '@/componentes/comuns/Campo';
import type { Opcao } from '@/componentes/comuns/Campo';
import type { ControleDeFiltros } from '@/ganchos/useFiltrosNaUrl';

export type ChaveDeFiltroDeParcela =
  | 'situacao'
  | 'de'
  | 'ate'
  | 'contratoId'
  | 'clienteId'
  | 'loteamentoId'
  | 'pagina';

const SITUACOES: Opcao[] = [
  { valor: 'VENCIDA', texto: 'Vencidas' },
  { valor: 'VENCE_HOJE', texto: 'Vencem hoje' },
  { valor: 'A_VENCER', texto: 'A vencer' },
];

interface Props {
  controle: ControleDeFiltros<ChaveDeFiltroDeParcela>;
  loteamentos: Opcao[];
  clientes: Opcao[];
}

export function FiltrosDeParcelas({ controle, loteamentos, clientes }: Props) {
  const { filtros, definirFiltro, limpar, algumPreenchido } = controle;

  return (
    <div className="filtros">
      <CampoDeSelecao
        rotulo="Situação"
        valor={filtros.situacao}
        opcoes={SITUACOES}
        aoMudar={(valor) => definirFiltro('situacao', valor)}
        textoVazio="Todas em aberto"
      />
      <CampoDeTexto
        rotulo="Vencimento de"
        tipo="date"
        valor={filtros.de}
        aoMudar={(valor) => definirFiltro('de', valor)}
      />
      <CampoDeTexto
        rotulo="Vencimento até"
        tipo="date"
        valor={filtros.ate}
        aoMudar={(valor) => definirFiltro('ate', valor)}
      />
      <CampoDeSelecao
        rotulo="Loteamento"
        valor={filtros.loteamentoId}
        opcoes={loteamentos}
        aoMudar={(valor) => definirFiltro('loteamentoId', valor)}
      />
      <CampoDeSelecao
        rotulo="Cliente"
        valor={filtros.clienteId}
        opcoes={clientes}
        aoMudar={(valor) => definirFiltro('clienteId', valor)}
      />
      <CampoDeTexto
        rotulo="Contrato (id)"
        valor={filtros.contratoId}
        aoMudar={(valor) => definirFiltro('contratoId', valor)}
        espacoReservado="Filtrar por contrato"
      />
      <div className="filtros__acoes">
        <button type="button" className="botao" onClick={limpar} disabled={!algumPreenchido}>
          Limpar filtros
        </button>
      </div>
    </div>
  );
}
