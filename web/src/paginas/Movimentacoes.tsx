import { useMemo, useState } from 'react';
import { CabecalhoDaPagina } from '@/componentes/layout/CabecalhoDaPagina';
import { Painel } from '@/componentes/comuns/Painel';
import { Paginacao } from '@/componentes/comuns/Paginacao';
import { ConteudoDaRequisicao } from '@/componentes/comuns/ConteudoDaRequisicao';
import { Indicador } from '@/componentes/comuns/Indicador';
import { Selo } from '@/componentes/comuns/Selo';
import { CampoDeSelecao, CampoDeTexto, type Opcao } from '@/componentes/comuns/Campo';
import { ModalDeLancamento } from '@/componentes/financeiro/ModalDeLancamento';
import { ModalDeTransferencia } from '@/componentes/financeiro/ModalDeTransferencia';
import { useFiltrosNaUrl } from '@/ganchos/useFiltrosNaUrl';
import { useRequisicao } from '@/ganchos/useRequisicao';
import { useAcao } from '@/ganchos/useAcao';
import { usePapel } from '@/contextos/AutenticacaoContexto';
import { podeEscrever } from '@/lib/permissoes';
import { formatarData, formatarDinheiro } from '@/lib/formato';
import {
  excluirLancamento,
  listarCategorias,
  listarContasBancarias,
  listarEmpreendimentos,
  listarLancamentos,
  listarSocios,
} from '@/lib/api/fluxo-de-caixa';
import type { LancamentoFinanceiro, TipoLancamentoFinanceiro } from '@/tipos/fluxo-de-caixa';

const TIPOS: Opcao[] = [
  { valor: 'ENTRADA', texto: 'Entradas' },
  { valor: 'SAIDA', texto: 'Saídas' },
];

type Chave = 'busca' | 'contaBancariaId' | 'categoriaId' | 'tipo' | 'de' | 'ate' | 'pagina';

interface Props {
  titulo?: string;
  descricao?: string;
  focoTransferencia?: boolean;
}

export function Movimentacoes({ titulo = 'Movimentações', descricao = 'Lançamentos realizados nas contas — entradas, saídas e transferências.', focoTransferencia = false }: Props) {
  const { filtros, definirFiltro } = useFiltrosNaUrl<Chave>(['busca', 'contaBancariaId', 'categoriaId', 'tipo', 'de', 'ate', 'pagina']);
  const editavel = podeEscrever(usePapel());
  const pagina = Number(filtros.pagina || 1);
  const acao = useAcao();
  const [modalLancamento, definirModalLancamento] = useState<LancamentoFinanceiro | null | undefined>(undefined);
  const [modalTransferencia, definirModalTransferencia] = useState(focoTransferencia);

  const contas = useRequisicao((sinal) => listarContasBancarias({ ativo: 'true', porPagina: 200 }, sinal), []);
  const categorias = useRequisicao((sinal) => listarCategorias({ ativo: 'true', porPagina: 500 }, sinal), []);
  const empreendimentos = useRequisicao((sinal) => listarEmpreendimentos({ ativo: 'true', porPagina: 200 }, sinal), []);
  const socios = useRequisicao((sinal) => listarSocios({ ativo: 'true', porPagina: 200 }, sinal), []);

  const requisicao = useRequisicao(
    (sinal) =>
      listarLancamentos(
        {
          busca: filtros.busca || undefined,
          contaBancariaId: filtros.contaBancariaId || undefined,
          categoriaId: filtros.categoriaId || undefined,
          tipo: (filtros.tipo as TipoLancamentoFinanceiro) || undefined,
          de: filtros.de || undefined,
          ate: filtros.ate || undefined,
          pagina,
          porPagina: 25,
        },
        sinal,
      ),
    [filtros.busca, filtros.contaBancariaId, filtros.categoriaId, filtros.tipo, filtros.de, filtros.ate, pagina],
  );

  const opcoesDeConta = useMemo<Opcao[]>(() => (contas.dados?.itens ?? []).map((c) => ({ valor: c.id, texto: c.nome })), [contas.dados]);
  const opcoesDeCategoria = useMemo<Opcao[]>(() => (categorias.dados?.itens ?? []).map((c) => ({ valor: c.id, texto: c.nome })), [categorias.dados]);
  const opcoesDeEmpreendimento = useMemo<Opcao[]>(() => (empreendimentos.dados?.itens ?? []).map((e) => ({ valor: e.id, texto: e.nome })), [empreendimentos.dados]);
  const opcoesDeSocio = useMemo<Opcao[]>(() => (socios.dados?.itens ?? []).map((s) => ({ valor: s.id, texto: s.nome })), [socios.dados]);

  function recarregarTudo() {
    requisicao.recarregar();
  }

  async function excluir(lancamento: LancamentoFinanceiro) {
    const aviso = lancamento.transferenciaId
      ? 'Excluir esta transferência remove as duas pernas (origem e destino). Continuar?'
      : 'Excluir este lançamento?';
    if (!window.confirm(aviso)) return;
    const sucesso = await acao.executar(() => excluirLancamento(lancamento.id));
    if (sucesso) recarregarTudo();
  }

  return (
    <>
      <CabecalhoDaPagina
        titulo={titulo}
        descricao={descricao}
        acoes={
          editavel ? (
            <div className="linha" style={{ gap: 8 }}>
              <button type="button" className="botao" onClick={() => definirModalTransferencia(true)}>Transferência</button>
              <button type="button" className="botao botao--primario" onClick={() => definirModalLancamento(null)}>+ Novo lançamento</button>
            </div>
          ) : undefined
        }
      />

      <div className="corpo-da-pagina pilha">
        <Painel>
          <div className="filtros">
            <CampoDeTexto rotulo="Busca" valor={filtros.busca} aoMudar={(v) => definirFiltro('busca', v)} espacoReservado="Descrição ou documento" />
            <CampoDeSelecao rotulo="Conta" valor={filtros.contaBancariaId} opcoes={opcoesDeConta} aoMudar={(v) => definirFiltro('contaBancariaId', v)} textoVazio="Todas" />
            <CampoDeSelecao rotulo="Categoria" valor={filtros.categoriaId} opcoes={opcoesDeCategoria} aoMudar={(v) => definirFiltro('categoriaId', v)} textoVazio="Todas" />
            <CampoDeSelecao rotulo="Tipo" valor={filtros.tipo} opcoes={TIPOS} aoMudar={(v) => definirFiltro('tipo', v)} textoVazio="Todos" />
            <CampoDeTexto rotulo="De" tipo="date" valor={filtros.de} aoMudar={(v) => definirFiltro('de', v)} />
            <CampoDeTexto rotulo="Até" tipo="date" valor={filtros.ate} aoMudar={(v) => definirFiltro('ate', v)} />
          </div>
          {acao.erro && <div className="aviso aviso--erro">{acao.erro}</div>}
        </Painel>

        {requisicao.dados && (
          <div className="grade grade--3">
            <Indicador rotulo="Entradas no período" valor={formatarDinheiro(requisicao.dados.resumo.totalEntradasCentavos)} tom="ok" />
            <Indicador rotulo="Saídas no período" valor={formatarDinheiro(requisicao.dados.resumo.totalSaidasCentavos)} tom="vencido" />
            <Indicador rotulo="Saldo do período" valor={formatarDinheiro(requisicao.dados.resumo.saldoDoPeriodoCentavos)} tom={requisicao.dados.resumo.saldoDoPeriodoCentavos < 0 ? 'vencido' : 'info'} />
          </div>
        )}

        <Painel
          titulo="Lançamentos"
          descricao={requisicao.dados ? `${requisicao.dados.total} lançamento(s)` : undefined}
          semPreenchimento
          rodape={requisicao.dados && <Paginacao pagina={requisicao.dados.pagina} totalDePaginas={requisicao.dados.totalDePaginas} total={requisicao.dados.total} aoMudarPagina={(v) => definirFiltro('pagina', String(v))} />}
        >
          <ConteudoDaRequisicao requisicao={requisicao} vazio={(dados) => dados.itens.length === 0} tituloDoVazio="Nenhum lançamento encontrado" descricaoDoVazio="Ajuste os filtros ou registre um novo lançamento.">
            {(dados) => (
              <div className="rolagem-horizontal">
                <table className="tabela">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Descrição</th>
                      <th>Categoria</th>
                      <th>Conta</th>
                      <th>Empreendimento</th>
                      <th className="numerico">Valor</th>
                      {editavel && <th className="acoes">Ações</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {dados.itens.map((l) => {
                      const sinalado = l.tipo === 'SAIDA' ? -l.valorCentavos : l.valorCentavos;
                      return (
                        <tr key={l.id}>
                          <td>{formatarData(l.data)}</td>
                          <td className="celula-larga">
                            {l.descricao}
                            {l.transferenciaId && <> <Selo texto="Transferência" tom="info" /></>}
                          </td>
                          <td>{l.categoria?.nome ?? '—'}</td>
                          <td>{l.contaBancaria.nome}</td>
                          <td>{l.empreendimentoFinanceiro?.nome ?? '—'}</td>
                          <td className="numerico">
                            <Selo texto={formatarDinheiro(sinalado)} tom={l.tipo === 'SAIDA' ? 'vencido' : 'ok'} />
                          </td>
                          {editavel && (
                            <td className="acoes">
                              {!l.transferenciaId && (
                                <button type="button" className="botao botao--fantasma botao--pequeno" onClick={() => definirModalLancamento(l)}>Editar</button>
                              )}
                              <button type="button" className="botao botao--fantasma botao--pequeno" onClick={() => void excluir(l)}>Excluir</button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </ConteudoDaRequisicao>
        </Painel>
      </div>

      {modalLancamento !== undefined && (
        <ModalDeLancamento
          lancamento={modalLancamento}
          contas={opcoesDeConta}
          categorias={categorias.dados?.itens ?? []}
          empreendimentos={opcoesDeEmpreendimento}
          socios={opcoesDeSocio}
          aoFechar={() => definirModalLancamento(undefined)}
          aoConcluir={recarregarTudo}
        />
      )}
      {modalTransferencia && (
        <ModalDeTransferencia
          contas={opcoesDeConta}
          aoFechar={() => definirModalTransferencia(false)}
          aoConcluir={recarregarTudo}
        />
      )}
    </>
  );
}
