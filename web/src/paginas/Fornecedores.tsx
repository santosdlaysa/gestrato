import { useState } from 'react';
import { CabecalhoDaPagina } from '@/componentes/layout/CabecalhoDaPagina';
import { Painel } from '@/componentes/comuns/Painel';
import { ConteudoDaRequisicao } from '@/componentes/comuns/ConteudoDaRequisicao';
import { Paginacao } from '@/componentes/comuns/Paginacao';
import { CampoDeSelecao, CampoDeTexto } from '@/componentes/comuns/Campo';
import { Selo } from '@/componentes/comuns/Selo';
import { ModalDeFornecedor } from '@/componentes/financeiro/ModalDeFornecedor';
import { useFiltrosNaUrl } from '@/ganchos/useFiltrosNaUrl';
import { useRequisicao } from '@/ganchos/useRequisicao';
import { useValorAtrasado } from '@/ganchos/useValorAtrasado';
import { listarFornecedores } from '@/lib/api/contas-a-pagar';
import { podeEscrever } from '@/lib/permissoes';
import { usePermissoes } from '@/contextos/AutenticacaoContexto';
import type { Fornecedor, RespostaDeFornecedores } from '@/tipos/contas-a-pagar';

const SITUACOES = [{ valor: 'true', texto: 'Ativos' }, { valor: 'false', texto: 'Inativos' }];

export function Fornecedores() {
  const { filtros, definirFiltro } = useFiltrosNaUrl<'busca' | 'ativo' | 'pagina'>(['busca', 'ativo', 'pagina']);
  const [edicao, definirEdicao] = useState<Fornecedor | null>(null);
  const [aberto, definirAberto] = useState(false);
  const papel = usePermissoes();
  const busca = useValorAtrasado(filtros.busca, 400);
  const pagina = Number(filtros.pagina || 1);
  const requisicao = useRequisicao<RespostaDeFornecedores>(
    (sinal) => listarFornecedores({ busca: busca || undefined, ativo: filtros.ativo || undefined, pagina, porPagina: 25 }, sinal),
    [busca, filtros.ativo, pagina],
  );
  const abrir = (fornecedor: Fornecedor | null) => { definirEdicao(fornecedor); definirAberto(true); };

  return <>
    <CabecalhoDaPagina titulo="Fornecedores" descricao="Cadastro de fornecedores e prestadores de serviço." acoes={podeEscrever(papel) && <button type="button" className="botao botao--primario" onClick={() => abrir(null)}>+ Novo fornecedor</button>} />
    <div className="corpo-da-pagina pilha">
      <Painel><div className="filtros"><CampoDeTexto rotulo="Busca" valor={filtros.busca} aoMudar={(valor) => definirFiltro('busca', valor)} espacoReservado="Nome do fornecedor" /><CampoDeSelecao rotulo="Situação" valor={filtros.ativo} opcoes={SITUACOES} aoMudar={(valor) => definirFiltro('ativo', valor)} textoVazio="Todos" /></div></Painel>
      <Painel titulo="Fornecedores" semPreenchimento rodape={requisicao.dados && <Paginacao pagina={requisicao.dados.pagina} totalDePaginas={requisicao.dados.totalDePaginas} total={requisicao.dados.total} aoMudarPagina={(valor) => definirFiltro('pagina', String(valor))} />}>
        <ConteudoDaRequisicao requisicao={requisicao} vazio={(dados) => dados.itens.length === 0} tituloDoVazio="Nenhum fornecedor encontrado" descricaoDoVazio="Cadastre o primeiro fornecedor.">
          {(dados) => <div className="rolagem-horizontal"><table className="tabela"><thead><tr><th>Nome</th><th>Documento</th><th>E-mail</th><th>Telefone</th><th>Situação</th><th className="acoes">Ações</th></tr></thead><tbody>{dados.itens.map((fornecedor) => <tr key={fornecedor.id}><td className="celula-larga">{fornecedor.nome}</td><td>{fornecedor.documento || '—'}</td><td>{fornecedor.email || '—'}</td><td>{fornecedor.telefone || '—'}</td><td><Selo texto={fornecedor.ativo ? 'Ativo' : 'Inativo'} tom={fornecedor.ativo ? 'ok' : 'neutro'} /></td><td className="acoes">{podeEscrever(papel) && <button type="button" className="botao botao--fantasma botao--pequeno" onClick={() => abrir(fornecedor)}>Editar</button>}</td></tr>)}</tbody></table></div>}
        </ConteudoDaRequisicao>
      </Painel>
    </div>
    {aberto && <ModalDeFornecedor fornecedor={edicao} aoFechar={() => definirAberto(false)} aoConcluir={requisicao.recarregar} />}
  </>;
}
