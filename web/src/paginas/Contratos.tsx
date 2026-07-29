import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CabecalhoDaPagina } from '@/componentes/layout/CabecalhoDaPagina';
import { Painel } from '@/componentes/comuns/Painel';
import { Paginacao } from '@/componentes/comuns/Paginacao';
import { ConteudoDaRequisicao } from '@/componentes/comuns/ConteudoDaRequisicao';
import { CampoDeSelecao, CampoDeTexto } from '@/componentes/comuns/Campo';
import { TabelaDeContratos } from '@/componentes/contratos/TabelaDeContratos';
import { useFiltrosNaUrl } from '@/ganchos/useFiltrosNaUrl';
import { useRequisicao } from '@/ganchos/useRequisicao';
import { useValorAtrasado } from '@/ganchos/useValorAtrasado';
import {
  useOpcoesDeClientes,
  useOpcoesDeLotes,
  useOpcoesDeLoteamentos,
} from '@/ganchos/useOpcoesDeCadastro';
import { mapaDeOpcoes } from '@/lib/colecoes';
import { listarContratos } from '@/lib/api/contratos';
import { podeGerenciarContratos } from '@/lib/permissoes';
import { usePapel } from '@/contextos/AutenticacaoContexto';
import { SITUACOES_DO_CONTRATO, STATUS_DO_CONTRATO } from '@/tipos/contrato';
import { rotularEnum } from '@/lib/formato';
import { seloDaSituacaoDoContrato } from '@/lib/rotulos';

type Chave = 'busca' | 'situacao' | 'status' | 'loteamentoId' | 'pagina';

const CHAVES: readonly Chave[] = ['busca', 'situacao', 'status', 'loteamentoId', 'pagina'];

const OPCOES_DE_SITUACAO = SITUACOES_DO_CONTRATO.map((situacao) => ({
  valor: situacao,
  texto: seloDaSituacaoDoContrato(situacao).texto,
}));

const OPCOES_DE_STATUS = STATUS_DO_CONTRATO.map((status) => ({
  valor: status,
  texto: rotularEnum(status),
}));

export function Contratos() {
  const papel = usePapel();
  const { filtros, definirFiltro, limpar, algumPreenchido } = useFiltrosNaUrl<Chave>(CHAVES);
  const loteamentos = useOpcoesDeLoteamentos();
  const clientes = useOpcoesDeClientes();
  const lotes = useOpcoesDeLotes('');
  const pagina = Number(filtros.pagina || 1);
  const buscaAtrasada = useValorAtrasado(filtros.busca, 400);

  const nomesDeClientes = useMemo(() => mapaDeOpcoes(clientes), [clientes]);
  const descricoesDeLotes = useMemo(() => mapaDeOpcoes(lotes), [lotes]);

  const requisicao = useRequisicao(
    (sinal) =>
      listarContratos(
        {
          busca: buscaAtrasada || undefined,
          situacao: filtros.situacao || undefined,
          status: filtros.status || undefined,
          loteamentoId: filtros.loteamentoId || undefined,
          pagina,
          porPagina: 25,
        },
        sinal,
      ),
    [buscaAtrasada, filtros.situacao, filtros.status, filtros.loteamentoId, pagina],
  );

  return (
    <>
      <CabecalhoDaPagina
        titulo="Contratos"
        descricao="Carteira de contratos e sua situação de adimplência"
        acoes={
          podeGerenciarContratos(papel) && (
            <Link className="botao botao--primario" to="/contratos/novo">
              + Novo contrato
            </Link>
          )
        }
      />

      <div className="corpo-da-pagina pilha">
        <Painel>
          <div className="filtros">
            <CampoDeTexto
              rotulo="Busca"
              valor={filtros.busca}
              aoMudar={(valor) => definirFiltro('busca', valor)}
              espacoReservado="Número do contrato ou cliente"
            />
            <CampoDeSelecao
              rotulo="Situação"
              valor={filtros.situacao}
              opcoes={OPCOES_DE_SITUACAO}
              aoMudar={(valor) => definirFiltro('situacao', valor)}
            />
            <CampoDeSelecao
              rotulo="Status"
              valor={filtros.status}
              opcoes={OPCOES_DE_STATUS}
              aoMudar={(valor) => definirFiltro('status', valor)}
            />
            <CampoDeSelecao
              rotulo="Loteamento"
              valor={filtros.loteamentoId}
              opcoes={loteamentos}
              aoMudar={(valor) => definirFiltro('loteamentoId', valor)}
            />
            <div className="filtros__acoes">
              <button type="button" className="botao" onClick={limpar} disabled={!algumPreenchido}>
                Limpar filtros
              </button>
            </div>
          </div>
        </Painel>

        <Painel
          titulo="Contratos"
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
            tituloDoVazio="Nenhum contrato encontrado"
            descricaoDoVazio="Ajuste os filtros ou cadastre um novo contrato."
          >
            {(dados) => (
              <TabelaDeContratos
                contratos={dados.itens ?? []}
                nomesDeClientes={nomesDeClientes}
                descricoesDeLotes={descricoesDeLotes}
              />
            )}
          </ConteudoDaRequisicao>
        </Painel>
      </div>
    </>
  );
}
