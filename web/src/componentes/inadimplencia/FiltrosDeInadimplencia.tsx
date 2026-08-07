import { CampoDeSelecao, CampoDeTexto } from '@/componentes/comuns/Campo';
import type { Opcao } from '@/componentes/comuns/Campo';
import type { ControleDeFiltros } from '@/ganchos/useFiltrosNaUrl';

export type ChaveDeFiltroDeInadimplencia =
  | 'busca'
  | 'loteamentoId'
  | 'risco'
  | 'ordenarPor'
  | 'clienteId'
  | 'pagina';

const RISCOS: Opcao[] = [
  { valor: 'EM_ATRASO', texto: 'Em atraso (a partir de 1 dia)' },
  { valor: 'INADIMPLENTE', texto: 'Inadimplentes' },
  { valor: 'SUJEITO_A_RETOMADA', texto: 'Sujeitos a retomada' },
];

const ORDENS: Opcao[] = [
  { valor: 'VALOR', texto: 'Maior valor em atraso' },
  { valor: 'ATRASO', texto: 'Maior atraso (dias)' },
  { valor: 'NOME', texto: 'Nome do cliente' },
];

interface Props {
  controle: ControleDeFiltros<ChaveDeFiltroDeInadimplencia>;
  loteamentos: Opcao[];
}

export function FiltrosDeInadimplencia({ controle, loteamentos }: Props) {
  const { filtros, definirFiltro, limpar, algumPreenchido } = controle;

  return (
    <div className="filtros">
      <CampoDeTexto
        rotulo="Cliente"
        valor={filtros.busca}
        aoMudar={(valor) => definirFiltro('busca', valor)}
        espacoReservado="Nome ou CPF/CNPJ"
      />
      <CampoDeSelecao
        rotulo="Loteamento"
        valor={filtros.loteamentoId}
        opcoes={loteamentos}
        aoMudar={(valor) => definirFiltro('loteamentoId', valor)}
      />
      <CampoDeSelecao
        rotulo="Risco mínimo"
        valor={filtros.risco}
        opcoes={RISCOS}
        aoMudar={(valor) => definirFiltro('risco', valor)}
        textoVazio="Qualquer atraso"
      />
      <CampoDeSelecao
        rotulo="Ordenar por"
        valor={filtros.ordenarPor}
        opcoes={ORDENS}
        aoMudar={(valor) => definirFiltro('ordenarPor', valor)}
        textoVazio="Maior valor em atraso"
      />
      <div className="filtros__acoes">
        <button type="button" className="botao" onClick={limpar} disabled={!algumPreenchido}>
          Limpar filtros
        </button>
      </div>
    </div>
  );
}
