import { useCallback, useMemo, useState } from 'react';
import { CabecalhoDaPagina } from '@/componentes/layout/CabecalhoDaPagina';
import { Painel } from '@/componentes/comuns/Painel';
import { Indicador } from '@/componentes/comuns/Indicador';
import { Selo } from '@/componentes/comuns/Selo';
import { ConteudoDaRequisicao } from '@/componentes/comuns/ConteudoDaRequisicao';
import { AvisoDeErro, AvisoDeSucesso } from '@/componentes/comuns/Estados';
import { useRequisicao } from '@/ganchos/useRequisicao';
import { useAcao } from '@/ganchos/useAcao';
import { usePermissoes } from '@/contextos/AutenticacaoContexto';
import { podeGerenciarContratos } from '@/lib/permissoes';
import { gerarParcelasEmLote, listarContratosSemParcelas } from '@/lib/api/contratos';
import { alternarNoConjunto } from '@/lib/colecoes';
import { formatarDinheiro, formatarNumero } from '@/lib/formato';
import type { ResultadoDaGeracao, ResultadoDaGeracaoEmLote } from '@/tipos/contrato';
import type { TomDoSelo } from '@/lib/rotulos';

const ROTULO_RESULTADO: Record<ResultadoDaGeracao, { texto: string; tom: TomDoSelo }> = {
  GERADAS: { texto: 'Geradas', tom: 'ok' },
  JA_TINHA: { texto: 'Já tinha parcelas', tom: 'neutro' },
  NAO_ENCONTRADO: { texto: 'Não encontrado', tom: 'atencao' },
  FALHA: { texto: 'Falhou', tom: 'vencido' },
};

export function GeracaoDeParcelas() {
  const podeGerir = podeGerenciarContratos(usePermissoes());
  const [selecionados, definirSelecionados] = useState<Set<string>>(new Set());
  const [resultado, definirResultado] = useState<ResultadoDaGeracaoEmLote | null>(null);
  const acao = useAcao();

  const requisicao = useRequisicao(
    useCallback((sinal: AbortSignal) => listarContratosSemParcelas(sinal), []),
    [],
  );

  const contratos = useMemo(() => requisicao.dados ?? [], [requisicao.dados]);
  const todosMarcados = contratos.length > 0 && selecionados.size === contratos.length;

  function alternarUm(contratoId: string) {
    definirSelecionados((atual) => alternarNoConjunto(atual, contratoId));
  }

  function alternarTodos() {
    definirSelecionados(todosMarcados ? new Set() : new Set(contratos.map((c) => c.contratoId)));
  }

  async function gerar() {
    definirResultado(null);
    const ids = [...selecionados];
    const ok = await acao.executar(async () => {
      definirResultado(await gerarParcelasEmLote(ids));
    });
    if (ok) {
      definirSelecionados(new Set());
      requisicao.recarregar();
    }
  }

  return (
    <>
      <CabecalhoDaPagina
        titulo="Geração de parcelas"
        descricao="Gera o plano de parcelas dos contratos que estão sem nenhuma (ex.: importados). Contratos que já têm parcelas são ignorados."
        acoes={
          podeGerir && (
            <button
              type="button"
              className="botao botao--primario"
              onClick={gerar}
              disabled={acao.emAndamento || selecionados.size === 0}
            >
              {acao.emAndamento ? 'Gerando…' : `Gerar parcelas (${selecionados.size})`}
            </button>
          )
        }
      />

      <div className="corpo-da-pagina pilha">
        <AvisoDeErro mensagem={acao.erro} />

        {resultado && (
          <Painel titulo="Resultado da geração">
            <div className="grade grade--3">
              <Indicador rotulo="Contratos processados" valor={formatarNumero(resultado.processados)} />
              <Indicador rotulo="Parcelas geradas" valor={formatarNumero(resultado.totalGeradas)} tom="ok" />
              <Indicador
                rotulo="Sem geração"
                valor={formatarNumero(resultado.itens.filter((i) => i.resultado !== 'GERADAS').length)}
                tom="atencao"
              />
            </div>
            {resultado.totalGeradas > 0 && (
              <div style={{ marginTop: 12 }}>
                <AvisoDeSucesso mensagem={`${resultado.totalGeradas} parcela(s) geradas com sucesso.`} />
              </div>
            )}
            <div className="rolagem-horizontal" style={{ marginTop: 12 }}>
              <table className="tabela tabela--compacta">
                <thead>
                  <tr>
                    <th>Contrato</th>
                    <th className="numerico">Parcelas geradas</th>
                    <th>Resultado</th>
                    <th>Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.itens.map((item) => (
                    <tr key={item.contratoId}>
                      <td>{item.numero}</td>
                      <td className="numerico">{item.parcelasGeradas || '—'}</td>
                      <td>
                        <Selo
                          texto={ROTULO_RESULTADO[item.resultado].texto}
                          tom={ROTULO_RESULTADO[item.resultado].tom}
                        />
                      </td>
                      <td className="celula-larga texto-vencido">{item.motivo ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Painel>
        )}

        <Painel
          titulo="Contratos sem parcelas"
          descricao="Selecione os contratos e gere o plano de parcelas de cada um."
          semPreenchimento
        >
          <ConteudoDaRequisicao
            requisicao={requisicao}
            vazio={(dados) => dados.length === 0}
            tituloDoVazio="Nenhum contrato sem parcelas"
            descricaoDoVazio="Todos os contratos ativos já têm o plano de parcelas gerado."
          >
            {(dados) => (
              <div className="rolagem-horizontal">
                <table className="tabela">
                  <thead>
                    <tr>
                      <th style={{ width: 36 }}>
                        <input
                          type="checkbox"
                          checked={todosMarcados}
                          onChange={alternarTodos}
                          disabled={!podeGerir}
                          aria-label="Selecionar todos"
                        />
                      </th>
                      <th>Contrato</th>
                      <th className="celula-larga">Cliente</th>
                      <th className="numerico">Parcelas do plano</th>
                      <th className="numerico">Valor total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.map((contrato) => (
                      <tr key={contrato.contratoId}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selecionados.has(contrato.contratoId)}
                            onChange={() => alternarUm(contrato.contratoId)}
                            disabled={!podeGerir}
                            aria-label={`Selecionar contrato ${contrato.numero}`}
                          />
                        </td>
                        <td>{contrato.numero}</td>
                        <td className="celula-larga">{contrato.clienteNome}</td>
                        <td className="numerico">{formatarNumero(contrato.quantidadeDeParcelas)}</td>
                        <td className="numerico">{formatarDinheiro(contrato.valorTotalCentavos)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ConteudoDaRequisicao>
        </Painel>
      </div>
    </>
  );
}
