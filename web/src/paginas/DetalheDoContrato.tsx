import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { CabecalhoDaPagina } from '@/componentes/layout/CabecalhoDaPagina';
import { Painel } from '@/componentes/comuns/Painel';
import { ConteudoDaRequisicao } from '@/componentes/comuns/ConteudoDaRequisicao';
import { EstadoDeErro } from '@/componentes/comuns/Estados';
import { PosicaoDoContrato } from '@/componentes/contratos/PosicaoDoContrato';
import { ExtratoDeParcelas } from '@/componentes/contratos/ExtratoDeParcelas';
import { AcoesDoContrato } from '@/componentes/contratos/AcoesDoContrato';
import { ModalDeReajuste } from '@/componentes/contratos/ModalDeReajuste';
import { ModalDeRenegociacao } from '@/componentes/contratos/ModalDeRenegociacao';
import { ModaisDeParcela } from '@/componentes/parcelas/ModaisDeParcela';
import type { AlvoDeModal } from '@/componentes/parcelas/ModaisDeParcela';
import { PainelDeAnexos } from '@/componentes/anexos/PainelDeAnexos';
import { useRequisicao } from '@/ganchos/useRequisicao';
import { buscarContrato, buscarExtrato } from '@/lib/api/contratos';
import { CATEGORIAS_DE_CONTRATO } from '@/lib/anexo';
import { estaEmAberto } from '@/lib/parcela';
import { podeDarBaixa, podeEscrever, podeGerenciarContratos } from '@/lib/permissoes';
import { usePermissoes } from '@/contextos/AutenticacaoContexto';
import { formatarData } from '@/lib/formato';

type Dialogo = 'reajuste' | 'renegociacao' | null;

export function DetalheDoContrato() {
  const { id = '' } = useParams();
  const papel = usePermissoes();
  const [dialogo, definirDialogo] = useState<Dialogo>(null);
  const [alvo, definirAlvo] = useState<AlvoDeModal | null>(null);

  const contrato = useRequisicao((sinal) => buscarContrato(id, sinal), [id]);
  const extrato = useRequisicao((sinal) => buscarExtrato(id, undefined, sinal), [id]);

  function recarregarTudo() {
    contrato.recarregar();
    extrato.recarregar();
  }

  const parcelas = extrato.dados?.parcelas ?? [];
  const emAberto = parcelas.filter(estaEmAberto);
  const posicao = contrato.dados?.posicao ?? extrato.dados?.posicao ?? null;
  const cliente = contrato.dados?.cliente?.nome ?? '—';

  if (!id) return <EstadoDeErro mensagem="Contrato não informado." />;

  return (
    <>
      <CabecalhoDaPagina
        titulo={contrato.dados ? `Contrato ${contrato.dados.numero}` : 'Contrato'}
        descricao={
          contrato.dados
            ? `${cliente} · assinado em ${formatarData(contrato.dados.dataAssinatura)}`
            : 'Carregando dados do contrato…'
        }
        acoes={
          <AcoesDoContrato
            contratoId={id}
            permitido={podeGerenciarContratos(papel)}
            podeRenegociar={podeDarBaixa(papel) && emAberto.length > 0}
            aoAtualizar={recarregarTudo}
            aoAbrirReajuste={() => definirDialogo('reajuste')}
            aoAbrirRenegociacao={() => definirDialogo('renegociacao')}
          />
        }
      />

      <div className="corpo-da-pagina pilha">
        <ConteudoDaRequisicao requisicao={contrato}>
          {() => <PosicaoDoContrato posicao={posicao} />}
        </ConteudoDaRequisicao>

        <Painel
          titulo="Extrato de parcelas"
          descricao="Valores atualizados na data de hoje"
          acoes={
            <button type="button" className="botao botao--pequeno" onClick={extrato.recarregar}>
              Atualizar extrato
            </button>
          }
          semPreenchimento
        >
          <ConteudoDaRequisicao
            requisicao={extrato}
            vazio={(dados) => (dados.parcelas ?? []).length === 0}
            tituloDoVazio="Sem parcelas"
            descricaoDoVazio="Este contrato ainda não possui parcelas geradas."
          >
            {(dados) => (
              <ExtratoDeParcelas
                parcelas={dados.parcelas}
                podeBaixar={podeDarBaixa(papel)}
                podeEmitir={podeEscrever(papel)}
                aoBaixar={(parcela) => definirAlvo({ tipo: 'baixa', parcela })}
                aoEmitir={(parcela) => definirAlvo({ tipo: 'documento', parcela })}
              />
            )}
          </ConteudoDaRequisicao>
        </Painel>

        <PainelDeAnexos
          escopo="CONTRATO"
          donoId={id}
          categorias={CATEGORIAS_DE_CONTRATO}
          titulo="Documentos do contrato"
          descricao="Contrato assinado, aditivos, termos e comprovantes"
        />
      </div>

      {dialogo === 'reajuste' && (
        <ModalDeReajuste
          contratoId={id}
          aoFechar={() => definirDialogo(null)}
          aoConcluir={recarregarTudo}
        />
      )}

      {dialogo === 'renegociacao' && (
        <ModalDeRenegociacao
          contratoId={id}
          parcelasEmAberto={emAberto}
          aoFechar={() => definirDialogo(null)}
          aoConcluir={recarregarTudo}
        />
      )}

      <ModaisDeParcela
        alvo={alvo}
        aoFechar={() => definirAlvo(null)}
        aoConcluir={recarregarTudo}
      />
    </>
  );
}
