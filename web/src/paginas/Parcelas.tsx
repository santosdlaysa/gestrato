import { useState } from 'react';
import { CabecalhoDaPagina } from '@/componentes/layout/CabecalhoDaPagina';
import { Painel } from '@/componentes/comuns/Painel';
import { Paginacao } from '@/componentes/comuns/Paginacao';
import { ConteudoDaRequisicao } from '@/componentes/comuns/ConteudoDaRequisicao';
import { AvisoDeErro } from '@/componentes/comuns/Estados';
import { FiltrosDeParcelas } from '@/componentes/parcelas/FiltrosDeParcelas';
import type { ChaveDeFiltroDeParcela } from '@/componentes/parcelas/FiltrosDeParcelas';
import { TabelaDeParcelas } from '@/componentes/parcelas/TabelaDeParcelas';
import { AcoesEmLote } from '@/componentes/parcelas/AcoesEmLote';
import { ModaisDeParcela } from '@/componentes/parcelas/ModaisDeParcela';
import type { AlvoDeModal, TipoDeModalDeParcela } from '@/componentes/parcelas/ModaisDeParcela';
import { useFiltrosNaUrl } from '@/ganchos/useFiltrosNaUrl';
import { useListaDeParcelas } from '@/ganchos/useListaDeParcelas';
import { useSelecao } from '@/ganchos/useSelecao';
import { useLote } from '@/ganchos/useLote';
import { useOpcoesDeClientes, useOpcoesDeLoteamentos } from '@/ganchos/useOpcoesDeCadastro';
import { cobrarAgora, emitirDocumento, reemitirDocumento } from '@/lib/api/parcelas';
import { somarValoresAtualizados } from '@/lib/parcela';
import { formatarDinheiro } from '@/lib/formato';
import { podeDarBaixa, podeEscrever } from '@/lib/permissoes';
import { usePapel } from '@/contextos/AutenticacaoContexto';
import type { ParcelaDeCobranca } from '@/tipos/parcela';

const CHAVES: readonly ChaveDeFiltroDeParcela[] = [
  'situacao',
  'de',
  'ate',
  'contratoId',
  'clienteId',
  'loteamentoId',
  'pagina',
];

const POR_PAGINA = 25;

interface Props {
  modo?: 'padrao' | 'manual';
}

export function Parcelas({ modo = 'padrao' }: Props) {
  const papel = usePapel();
  const controle = useFiltrosNaUrl<ChaveDeFiltroDeParcela>(CHAVES);
  const { filtros, definirFiltro } = controle;
  const pagina = Number(filtros.pagina || 1);
  const [alvo, definirAlvo] = useState<AlvoDeModal | null>(null);

  const requisicao = useListaDeParcelas({
    situacao: filtros.situacao || undefined,
    de: filtros.de || undefined,
    ate: filtros.ate || undefined,
    contratoId: filtros.contratoId || undefined,
    clienteId: filtros.clienteId || undefined,
    loteamentoId: filtros.loteamentoId || undefined,
    pagina,
    porPagina: POR_PAGINA,
  });

  const parcelas = requisicao.dados?.itens ?? [];
  const selecao = useSelecao(parcelas.map((parcela) => parcela.id));
  const lote = useLote();
  const loteamentos = useOpcoesDeLoteamentos();
  const clientes = useOpcoesDeClientes();

  const selecionadas = parcelas.filter((parcela) => selecao.selecionadas.has(parcela.id));
  const permissoes = {
    emitir: podeEscrever(papel),
    cobrar: podeEscrever(papel),
    baixar: podeDarBaixa(papel),
  };

  const abrir = (tipo: TipoDeModalDeParcela) => (parcela: ParcelaDeCobranca) =>
    definirAlvo({ tipo, parcela });

  async function emitirEmLote() {
    const comDocumento = new Set(
      selecionadas.filter((parcela) => parcela.documentoVigente).map((parcela) => parcela.id),
    );
    await lote.executar(
      selecionadas.map((parcela) => parcela.id),
      (id) =>
        comDocumento.has(id)
          ? reemitirDocumento(id, 'BOLETO_COM_PIX')
          : emitirDocumento(id, 'BOLETO_COM_PIX'),
      'Emitindo documentos',
    );
    selecao.limpar();
    requisicao.recarregar();
  }

  async function cobrarEmLote() {
    await lote.executar(
      selecionadas.map((parcela) => parcela.id),
      (id) => cobrarAgora(id),
      'Enviando cobranças',
    );
    selecao.limpar();
    requisicao.recarregar();
  }

  return (
    <>
      <CabecalhoDaPagina
        titulo={modo === 'manual' ? 'Cobrança manual' : 'Cobrança · Parcelas'}
        descricao={
          modo === 'manual'
            ? 'Selecione uma parcela e envie a cobrança diretamente ao cliente'
            : 'Emissão de documentos, envio de cobrança e baixa de parcelas'
        }
        acoes={
          <button type="button" className="botao" onClick={requisicao.recarregar}>
            Atualizar
          </button>
        }
      />

      <div className="corpo-da-pagina pilha">
        <Painel
          titulo={modo === 'manual' ? 'Operação' : undefined}
          descricao={modo === 'manual' ? 'Filtre as parcelas e envie a cobrança ao cliente' : undefined}
        >
          <FiltrosDeParcelas controle={controle} loteamentos={loteamentos} clientes={clientes} />
        </Painel>

        <AvisoDeErro mensagem={lote.erro} />

        <Painel
          titulo={modo === 'manual' ? 'Parcelas para cobrança' : 'Parcelas'}
          descricao={
            requisicao.dados
              ? `${requisicao.dados.total} parcela(s) · ${formatarDinheiro(somarValoresAtualizados(parcelas))} atualizados nesta página`
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
          <AcoesEmLote
            quantidade={selecionadas.length}
            valorCentavos={somarValoresAtualizados(selecionadas)}
            emAndamento={lote.emAndamento}
            progresso={lote.progresso}
            podeEmitir={permissoes.emitir}
            podeCobrar={permissoes.cobrar}
            aoEmitirDocumentos={emitirEmLote}
            aoEnviarCobrancas={cobrarEmLote}
            aoLimparSelecao={selecao.limpar}
          />

          <ConteudoDaRequisicao
            requisicao={requisicao}
            vazio={(dados) => (dados.itens ?? []).length === 0}
            tituloDoVazio="Nenhuma parcela encontrada"
            descricaoDoVazio="Ajuste os filtros de situação ou período para ver outras parcelas."
          >
            {() => (
              <TabelaDeParcelas
                parcelas={parcelas}
                selecionadas={selecao.selecionadas}
                aoSelecionar={selecao.alternar}
                aoSelecionarTodas={selecao.alternarTodas}
                permissoes={permissoes}
                aoEmitir={abrir('documento')}
                aoCobrar={abrir('cobranca')}
                aoBaixar={abrir('baixa')}
              />
            )}
          </ConteudoDaRequisicao>
        </Painel>
      </div>

      <ModaisDeParcela
        alvo={alvo}
        aoFechar={() => definirAlvo(null)}
        aoConcluir={requisicao.recarregar}
      />
    </>
  );
}
