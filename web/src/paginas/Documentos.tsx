import { useMemo, useState } from 'react';
import { CabecalhoDaPagina } from '@/componentes/layout/CabecalhoDaPagina';
import { Painel } from '@/componentes/comuns/Painel';
import { ConteudoDaRequisicao } from '@/componentes/comuns/ConteudoDaRequisicao';
import { CampoDeTexto } from '@/componentes/comuns/Campo';
import { PainelDeAnexos } from '@/componentes/anexos/PainelDeAnexos';
import { TabelaDeDocumentosDeCobranca } from '@/componentes/documentos/TabelaDeDocumentosDeCobranca';
import { useRequisicao } from '@/ganchos/useRequisicao';
import { buscarExtrato, listarContratos } from '@/lib/api/contratos';
import { listarDocumentos } from '@/lib/api/parcelas';
import { CATEGORIAS_DE_CONTRATO } from '@/lib/anexo';
import { formatarData, rotularEnum } from '@/lib/formato';
import type { Contrato } from '@/tipos/contrato';

export type ModoDeDocumentos = 'contratos' | 'termos' | 'cobranca';

interface Props { modo?: ModoDeDocumentos; }

function nomeDoCliente(contrato: Contrato): string {
  return contrato.cliente?.nome ?? 'Cliente não informado';
}

export function Documentos({ modo = 'contratos' }: Props) {
  const [busca, definirBusca] = useState('');
  const [contratoId, definirContratoId] = useState('');
  const contratos = useRequisicao(
    (sinal) => listarContratos({ busca: busca || undefined, pagina: 1, porPagina: 50 }, sinal),
    [busca],
  );
  const contratoSelecionado = useMemo(
    () => contratos.dados?.itens.find((item) => item.id === contratoId) ?? null,
    [contratos.dados, contratoId],
  );
  const extrato = useRequisicao(
    async (sinal) => {
      if (!contratoId) return null;
      const resultado = await buscarExtrato(contratoId, undefined, sinal);
      const documentosPorParcela = await Promise.all(
        resultado.parcelas.map(async (parcela) => ({
          parcela,
          documentos: await listarDocumentos(parcela.id, sinal),
        })),
      );
      return { ...resultado, documentosPorParcela };
    },
    [contratoId],
  );

  const documentos = useMemo(() => {
    return extrato.dados?.documentosPorParcela.flatMap(({ parcela, documentos }) =>
      (Array.isArray(documentos) ? documentos : documentos.itens).map((documento) => ({ parcela, documento })),
    ) ?? [];
  }, [extrato.dados]);

  const titulo = modo === 'cobranca' ? 'Documentos de cobrança' : modo === 'termos' ? 'Termos e aditivos' : 'Contratos e anexos';
  const descricao = modo === 'cobranca'
    ? 'Boletos e Pix emitidos para as parcelas do contrato selecionado.'
    : 'Consulte e baixe os arquivos vinculados aos contratos.';

  return (
    <>
      <CabecalhoDaPagina titulo={titulo} descricao={descricao} />
      <div className="corpo-da-pagina pilha">
        <Painel titulo="Selecionar contrato" descricao="Busque pelo número do contrato ou selecione um resultado.">
          <CampoDeTexto rotulo="Buscar contrato" valor={busca} aoMudar={definirBusca} espacoReservado="Número ou cliente" />
          <ConteudoDaRequisicao requisicao={contratos} vazio={(dados) => dados.itens.length === 0} tituloDoVazio="Nenhum contrato encontrado">
            {(dados) => (
              <div className="lista-de-selecao">
                {dados.itens.map((contrato) => (
                  <button
                    type="button"
                    key={contrato.id}
                    className={`item-de-selecao ${contrato.id === contratoId ? 'item-de-selecao--selecionado' : ''}`}
                    onClick={() => definirContratoId(contrato.id)}
                  >
                    <strong>{contrato.numero}</strong>
                    <span>{nomeDoCliente(contrato)} · {rotularEnum(contrato.status)}</span>
                  </button>
                ))}
              </div>
            )}
          </ConteudoDaRequisicao>
        </Painel>

        {contratoSelecionado && modo === 'cobranca' && (
          <Painel titulo={`Emissões do contrato ${contratoSelecionado.numero}`} descricao={nomeDoCliente(contratoSelecionado)} semPreenchimento>
            <ConteudoDaRequisicao requisicao={extrato} vazio={() => documentos.length === 0} tituloDoVazio="Nenhum documento emitido" descricaoDoVazio="Emita um boleto ou Pix pela tela de Parcelas para que ele apareça aqui.">
              {() => <TabelaDeDocumentosDeCobranca itens={documentos} />}
            </ConteudoDaRequisicao>
          </Painel>
        )}

        {contratoSelecionado && modo !== 'cobranca' && (
          <PainelDeAnexos
            escopo="CONTRATO"
            donoId={contratoSelecionado.id}
            categorias={CATEGORIAS_DE_CONTRATO}
            filtroDeCategoria={modo === 'termos' ? ['ADITIVO', 'TERMO_DE_RENEGOCIACAO', 'DISTRATO', 'TERMO_DE_QUITACAO'] : undefined}
            titulo={`Arquivos do contrato ${contratoSelecionado.numero}`}
            descricao={`${nomeDoCliente(contratoSelecionado)} · assinatura ${formatarData(contratoSelecionado.dataAssinatura)}`}
          />
        )}
      </div>
    </>
  );
}
