import { CabecalhoDaPagina } from '@/componentes/layout/CabecalhoDaPagina';
import { Painel } from '@/componentes/comuns/Painel';
import { ConteudoDaRequisicao } from '@/componentes/comuns/ConteudoDaRequisicao';
import { Paginacao } from '@/componentes/comuns/Paginacao';
import { CampoDeTexto } from '@/componentes/comuns/Campo';
import { useFiltrosNaUrl } from '@/ganchos/useFiltrosNaUrl';
import { useRequisicao } from '@/ganchos/useRequisicao';
import { useValorAtrasado } from '@/ganchos/useValorAtrasado';
import { listarSaldosDeEstoque } from '@/lib/api/estoque';
import { formatarDinheiro, formatarNumero } from '@/lib/formato';

export function Estoque() {
  const { filtros, definirFiltro } = useFiltrosNaUrl<'busca' | 'pagina'>(['busca', 'pagina']);
  const busca = useValorAtrasado(filtros.busca, 350);
  const pagina = Number(filtros.pagina || 1);
  const requisicao = useRequisicao(
    (sinal) => listarSaldosDeEstoque({ busca: busca || undefined, pagina, porPagina: 25 }, sinal),
    [busca, pagina],
  );

  return <>
    <CabecalhoDaPagina titulo="Saldo de estoque" descricao="Posição calculada a partir dos movimentos de entrada e saída do estoque." />
    <div className="corpo-da-pagina pilha">
      <Painel><CampoDeTexto rotulo="Busca" valor={filtros.busca} aoMudar={(valor) => definirFiltro('busca', valor)} espacoReservado="Nome do insumo" /></Painel>
      <Painel titulo="Insumos" semPreenchimento rodape={requisicao.dados && <Paginacao pagina={requisicao.dados.pagina} totalDePaginas={requisicao.dados.totalDePaginas} total={requisicao.dados.total} aoMudarPagina={(valor) => definirFiltro('pagina', String(valor))} />}>
        <ConteudoDaRequisicao requisicao={requisicao} vazio={(dados) => dados.itens.length === 0} tituloDoVazio="Nenhum insumo encontrado" descricaoDoVazio="Cadastre ou importe insumos para visualizar o saldo.">
          {(dados) => <div className="rolagem-horizontal"><table className="tabela"><thead><tr><th>Insumo</th><th>Unidade</th><th className="numerico">Saldo</th><th className="numerico">Valor calculado</th></tr></thead><tbody>{dados.itens.map((item) => <tr key={item.id}><td className="celula-larga">{item.nome}</td><td>{item.simbolo ?? '—'}</td><td className="numerico">{formatarNumero(item.saldo)}</td><td className="numerico">{formatarDinheiro(item.valorCentavos)}</td></tr>)}</tbody></table></div>}
        </ConteudoDaRequisicao>
      </Painel>
    </div>
  </>;
}
