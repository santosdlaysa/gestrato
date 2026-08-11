import { useCallback, useEffect, useState } from 'react';
import { CabecalhoDaPagina } from '@/componentes/layout/CabecalhoDaPagina';
import { Painel } from '@/componentes/comuns/Painel';
import { ConteudoDaRequisicao } from '@/componentes/comuns/ConteudoDaRequisicao';
import { AvisoDeErro, AvisoDeSucesso } from '@/componentes/comuns/Estados';
import { EXPLICACAO_DO_DOCUMENTO, EditorDeEtapas } from '@/componentes/regua/EditorDeEtapas';
import { EditorDeModelos } from '@/componentes/regua/EditorDeModelos';
import { LinhaDoTempoDaRegua } from '@/componentes/regua/LinhaDoTempoDaRegua';
import { ExecucaoDaRegua } from '@/componentes/regua/ExecucaoDaRegua';
import { PoliticaDeInadimplencia } from '@/componentes/regua/PoliticaDeInadimplencia';
import { useRequisicao } from '@/ganchos/useRequisicao';
import { useAcao } from '@/ganchos/useAcao';
import { buscarRegua, listarModelos, salvarRegua } from '@/lib/api/regua';
import { extrairItens } from '@/lib/colecoes';
import { podeConfigurarRegua, podeGerenciarRegua } from '@/lib/permissoes';
import { usePermissoes } from '@/contextos/AutenticacaoContexto';
import type { EventoDaRegua, Regua as ReguaConfigurada } from '@/tipos/cobranca';

type Aba = 'etapas' | 'modelos';

function normalizarEventos(dados: ReguaConfigurada | EventoDaRegua[] | null): EventoDaRegua[] {
  if (!dados) return [];
  const eventos = Array.isArray(dados) ? dados : dados.eventos;
  return (eventos ?? []).map((evento) => ({
    ...evento,
    canais: evento.canais ?? [],
    emitirDocumento: evento.emitirDocumento ?? true,
    tipoDeDocumento: evento.tipoDeDocumento ?? 'BOLETO_COM_PIX',
  }));
}

export function Regua() {
  const papel = usePermissoes();
  const editavel = podeGerenciarRegua(papel);
  const [aba, definirAba] = useState<Aba>('etapas');
  const [eventos, definirEventos] = useState<EventoDaRegua[]>([]);
  const [salvo, definirSalvo] = useState(false);
  const acao = useAcao();

  const requisicao = useRequisicao(
    useCallback((sinal: AbortSignal) => buscarRegua(sinal), []),
    [],
  );
  const modelos = useRequisicao(
    useCallback((sinal: AbortSignal) => listarModelos(sinal), []),
    [],
  );

  useEffect(() => {
    definirEventos(normalizarEventos(requisicao.dados));
  }, [requisicao.dados]);

  async function salvar() {
    const sucesso = await acao.executar(() => salvarRegua(eventos));
    if (sucesso) {
      definirSalvo(true);
      requisicao.recarregar();
    }
  }

  return (
    <>
      <CabecalhoDaPagina
        titulo="Régua de cobrança"
        descricao="Etapas automáticas, modelos de mensagem e execução"
        acoes={
          editavel &&
          aba === 'etapas' && (
            <button
              type="button"
              className="botao botao--primario"
              onClick={salvar}
              disabled={acao.emAndamento}
            >
              {acao.emAndamento ? 'Salvando…' : 'Salvar régua'}
            </button>
          )
        }
      />

      <div className="corpo-da-pagina pilha">
        <div className="abas">
          <button
            type="button"
            className={aba === 'etapas' ? 'abas__item abas__item--ativa' : 'abas__item'}
            onClick={() => definirAba('etapas')}
          >
            Etapas e execução
          </button>
          <button
            type="button"
            className={aba === 'modelos' ? 'abas__item abas__item--ativa' : 'abas__item'}
            onClick={() => definirAba('modelos')}
          >
            Modelos de mensagem
          </button>
        </div>

        {aba === 'etapas' ? (
          <ConteudoDaRequisicao requisicao={requisicao}>
            {() => (
              <div className="pilha">
                <AvisoDeErro mensagem={acao.erro} />
                <AvisoDeSucesso mensagem={salvo ? 'Régua salva.' : null} />

                <Painel titulo="Linha do tempo" descricao="Como a régua será executada">
                  <LinhaDoTempoDaRegua eventos={eventos} />
                </Painel>

                <Painel
                  titulo="Etapas"
                  descricao={
                    <>
                      {EXPLICACAO_DO_DOCUMENTO}
                      {!editavel && ' Seu papel permite apenas visualizar a régua.'}
                    </>
                  }
                >
                  <EditorDeEtapas
                    eventos={eventos}
                    somenteLeitura={!editavel}
                    aoMudar={(proximos) => {
                      definirEventos(proximos);
                      definirSalvo(false);
                    }}
                  />
                </Painel>

                <PoliticaDeInadimplencia editavel={podeConfigurarRegua(papel)} />

                <ExecucaoDaRegua habilitado={editavel} />
              </div>
            )}
          </ConteudoDaRequisicao>
        ) : (
          <ConteudoDaRequisicao requisicao={modelos}>
            {(dados) => (
              <EditorDeModelos
                modelos={extrairItens(dados)}
                somenteLeitura={!editavel}
                aoSalvar={modelos.recarregar}
              />
            )}
          </ConteudoDaRequisicao>
        )}
      </div>
    </>
  );
}
