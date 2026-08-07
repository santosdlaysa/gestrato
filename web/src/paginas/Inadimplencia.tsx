import { CabecalhoDaPagina } from '@/componentes/layout/CabecalhoDaPagina';
import { Painel } from '@/componentes/comuns/Painel';
import { Paginacao } from '@/componentes/comuns/Paginacao';
import { ConteudoDaRequisicao } from '@/componentes/comuns/ConteudoDaRequisicao';
import { FiltrosDeInadimplencia } from '@/componentes/inadimplencia/FiltrosDeInadimplencia';
import type { ChaveDeFiltroDeInadimplencia } from '@/componentes/inadimplencia/FiltrosDeInadimplencia';
import { ResumoDaInadimplencia } from '@/componentes/inadimplencia/ResumoDaInadimplencia';
import { TabelaDeInadimplentes } from '@/componentes/inadimplencia/TabelaDeInadimplentes';
import { useFiltrosNaUrl } from '@/ganchos/useFiltrosNaUrl';
import { useListaDeInadimplentes } from '@/ganchos/useListaDeInadimplentes';
import { useOpcoesDeLoteamentos } from '@/ganchos/useOpcoesDeCadastro';

const CHAVES: readonly ChaveDeFiltroDeInadimplencia[] = [
  'busca',
  'loteamentoId',
  'risco',
  'ordenarPor',
  'clienteId',
  'pagina',
];

const POR_PAGINA = 25;

export function Inadimplencia() {
  const controle = useFiltrosNaUrl<ChaveDeFiltroDeInadimplencia>(CHAVES);
  const { filtros, definirFiltro } = controle;
  const pagina = Number(filtros.pagina || 1);

  const requisicao = useListaDeInadimplentes({
    busca: filtros.busca || undefined,
    loteamentoId: filtros.loteamentoId || undefined,
    risco: filtros.risco || undefined,
    ordenarPor: filtros.ordenarPor || undefined,
    clienteId: filtros.clienteId || undefined,
    pagina,
    porPagina: POR_PAGINA,
  });

  const loteamentos = useOpcoesDeLoteamentos();

  return (
    <>
      <CabecalhoDaPagina
        titulo="Controle de inadimplência"
        descricao="Quem está devendo, quanto e há quanto tempo — agrupado por cliente"
        acoes={
          <button type="button" className="botao" onClick={requisicao.recarregar}>
            Atualizar
          </button>
        }
      />

      <div className="corpo-da-pagina pilha">
        <Painel>
          <FiltrosDeInadimplencia controle={controle} loteamentos={loteamentos} />
        </Painel>

        {requisicao.dados && <ResumoDaInadimplencia resumo={requisicao.dados.resumo} />}

        <Painel
          titulo="Devedores"
          descricao={
            requisicao.dados
              ? `${requisicao.dados.total} cliente(s) com parcelas em atraso`
              : undefined
          }
          semPreenchimento
          rodape={
            requisicao.dados && (
              <Paginacao
                pagina={requisicao.dados.pagina || pagina}
                totalDePaginas={requisicao.dados.totalDePaginas}
                total={requisicao.dados.total}
                aoMudarPagina={(proxima) => definirFiltro('pagina', String(proxima))}
              />
            )
          }
        >
          <ConteudoDaRequisicao
            requisicao={requisicao}
            vazio={(dados) => (dados.itens ?? []).length === 0}
            tituloDoVazio="Nenhum inadimplente encontrado"
            descricaoDoVazio="Ajuste os filtros de risco, loteamento ou busca para ver outros clientes."
          >
            {(dados) => <TabelaDeInadimplentes inadimplentes={dados.itens} />}
          </ConteudoDaRequisicao>
        </Painel>
      </div>
    </>
  );
}
