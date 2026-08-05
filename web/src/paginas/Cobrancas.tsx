import { useState } from 'react';
import { CabecalhoDaPagina } from '@/componentes/layout/CabecalhoDaPagina';
import { Painel } from '@/componentes/comuns/Painel';
import { Paginacao } from '@/componentes/comuns/Paginacao';
import { ConteudoDaRequisicao } from '@/componentes/comuns/ConteudoDaRequisicao';
import { CampoDeSelecao, CampoDeTexto } from '@/componentes/comuns/Campo';
import { TabelaDeCobrancas } from '@/componentes/cobrancas/TabelaDeCobrancas';
import { ModalDeTransicoes } from '@/componentes/cobrancas/ModalDeTransicoes';
import { useFiltrosNaUrl } from '@/ganchos/useFiltrosNaUrl';
import { useRequisicao } from '@/ganchos/useRequisicao';
import { useOpcoesDeClientes } from '@/ganchos/useOpcoesDeCadastro';
import { listarCobrancas } from '@/lib/api/cobrancas';
import { STATUS_DE_COBRANCA } from '@/tipos/cobranca';

type Chave = 'clienteId' | 'contratoId' | 'parcelaId' | 'status' | 'de' | 'ate' | 'pagina';

const CHAVES: readonly Chave[] = [
  'clienteId',
  'contratoId',
  'parcelaId',
  'status',
  'de',
  'ate',
  'pagina',
];

const OPCOES_DE_STATUS = STATUS_DE_COBRANCA.map((status) => ({ valor: status, texto: status }));

export function Cobrancas() {
  const { filtros, definirFiltro, limpar, algumPreenchido } = useFiltrosNaUrl<Chave>(CHAVES);
  const clientes = useOpcoesDeClientes();
  const pagina = Number(filtros.pagina || 1);
  const [detalheId, definirDetalheId] = useState<string | null>(null);

  const requisicao = useRequisicao(
    (sinal) =>
      listarCobrancas(
        {
          clienteId: filtros.clienteId || undefined,
          contratoId: filtros.contratoId || undefined,
          parcelaId: filtros.parcelaId || undefined,
          status: filtros.status || undefined,
          de: filtros.de || undefined,
          ate: filtros.ate || undefined,
          pagina,
          porPagina: 30,
        },
        sinal,
      ),
    [
      filtros.clienteId,
      filtros.contratoId,
      filtros.parcelaId,
      filtros.status,
      filtros.de,
      filtros.ate,
      pagina,
    ],
  );

  return (
    <>
      <CabecalhoDaPagina
        titulo="Histórico de cobranças"
        descricao="Todos os envios feitos pela régua e pelas cobranças avulsas"
        acoes={
          <button type="button" className="botao" onClick={requisicao.recarregar}>
            Atualizar
          </button>
        }
      />

      <div className="corpo-da-pagina pilha">
        <Painel>
          <div className="filtros">
            <CampoDeSelecao
              rotulo="Cliente"
              valor={filtros.clienteId}
              opcoes={clientes}
              aoMudar={(valor) => definirFiltro('clienteId', valor)}
            />
            <CampoDeSelecao
              rotulo="Status"
              valor={filtros.status}
              opcoes={OPCOES_DE_STATUS}
              aoMudar={(valor) => definirFiltro('status', valor)}
            />
            <CampoDeTexto
              rotulo="De"
              tipo="date"
              valor={filtros.de}
              aoMudar={(valor) => definirFiltro('de', valor)}
            />
            <CampoDeTexto
              rotulo="Até"
              tipo="date"
              valor={filtros.ate}
              aoMudar={(valor) => definirFiltro('ate', valor)}
            />
            <CampoDeTexto
              rotulo="Contrato (id)"
              valor={filtros.contratoId}
              aoMudar={(valor) => definirFiltro('contratoId', valor)}
            />
            <div className="filtros__acoes">
              <button type="button" className="botao" onClick={limpar} disabled={!algumPreenchido}>
                Limpar filtros
              </button>
            </div>
          </div>
        </Painel>

        <Painel
          titulo="Envios"
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
            tituloDoVazio="Nenhuma cobrança enviada"
            descricaoDoVazio="Nenhum envio corresponde aos filtros selecionados."
          >
            {(dados) => <TabelaDeCobrancas cobrancas={dados.itens ?? []} aoVerDetalhes={definirDetalheId} />}
          </ConteudoDaRequisicao>
        </Painel>
      </div>

      {detalheId && <ModalDeTransicoes cobrancaId={detalheId} aoFechar={() => definirDetalheId(null)} />}
    </>
  );
}
