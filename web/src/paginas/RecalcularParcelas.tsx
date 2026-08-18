import { useCallback, useMemo, useState } from 'react';
import { CabecalhoDaPagina } from '@/componentes/layout/CabecalhoDaPagina';
import { Painel } from '@/componentes/comuns/Painel';
import { Indicador } from '@/componentes/comuns/Indicador';
import { Selo } from '@/componentes/comuns/Selo';
import { CampoDeTexto } from '@/componentes/comuns/Campo';
import { ConteudoDaRequisicao } from '@/componentes/comuns/ConteudoDaRequisicao';
import { AvisoDeErro, AvisoDeSucesso } from '@/componentes/comuns/Estados';
import { useRequisicao } from '@/ganchos/useRequisicao';
import { useAcao } from '@/ganchos/useAcao';
import { usePermissoes } from '@/contextos/AutenticacaoContexto';
import { podeGerenciarContratos } from '@/lib/permissoes';
import { listarContratos, reajustarEmLote } from '@/lib/api/contratos';
import { alternarNoConjunto } from '@/lib/colecoes';
import { formatarDinheiro, formatarNumero } from '@/lib/formato';
import { hojeIso } from '@/lib/datas';
import type { ResultadoDoReajusteEmLote } from '@/tipos/contrato';

export function RecalcularParcelas() {
  const podeGerir = podeGerenciarContratos(usePermissoes());
  const [indice, definirIndice] = useState('IGPM');
  const [percentual, definirPercentual] = useState('0');
  const [aPartirDe, definirAPartirDe] = useState(hojeIso);
  const [selecionados, definirSelecionados] = useState<Set<string>>(new Set());
  const [resultado, definirResultado] = useState<ResultadoDoReajusteEmLote | null>(null);
  const acao = useAcao();

  const requisicao = useRequisicao(
    useCallback(
      (sinal: AbortSignal) => listarContratos({ status: 'ATIVO', porPagina: 200 }, sinal),
      [],
    ),
    [],
  );

  const contratos = useMemo(() => requisicao.dados?.itens ?? [], [requisicao.dados]);
  const todosMarcados = contratos.length > 0 && selecionados.size === contratos.length;
  const percentualNumero = Number(percentual.replace(',', '.')) || 0;
  const podeAplicar = selecionados.size > 0 && percentualNumero > 0 && Boolean(aPartirDe);

  function alternarTodos() {
    definirSelecionados(todosMarcados ? new Set() : new Set(contratos.map((c) => c.id)));
  }

  async function aplicar() {
    definirResultado(null);
    const ids = [...selecionados];
    const ok = await acao.executar(async () => {
      definirResultado(
        await reajustarEmLote({
          contratoIds: ids,
          indice,
          percentual: percentualNumero,
          aplicadoAPartirDe: aPartirDe,
        }),
      );
    });
    if (ok) {
      definirSelecionados(new Set());
      requisicao.recarregar();
    }
  }

  return (
    <>
      <CabecalhoDaPagina
        titulo="Recalcular parcelas (reajuste)"
        descricao="Aplica um reajuste percentual às parcelas pendentes futuras dos contratos selecionados."
        acoes={
          podeGerir && (
            <button
              type="button"
              className="botao botao--primario"
              onClick={aplicar}
              disabled={acao.emAndamento || !podeAplicar}
            >
              {acao.emAndamento ? 'Aplicando…' : `Aplicar reajuste (${selecionados.size})`}
            </button>
          )
        }
      />

      <div className="corpo-da-pagina pilha">
        <AvisoDeErro mensagem={acao.erro} />

        <Painel titulo="Reajuste a aplicar" descricao="Incide sobre parcelas pendentes com vencimento a partir da data.">
          <div className="grade grade--3">
            <CampoDeTexto rotulo="Índice" valor={indice} aoMudar={definirIndice} espacoReservado="IGPM, IPCA…" />
            <CampoDeTexto rotulo="Percentual (%)" valor={percentual} aoMudar={definirPercentual} />
            <CampoDeTexto rotulo="A partir de" tipo="date" valor={aPartirDe} aoMudar={definirAPartirDe} />
          </div>
        </Painel>

        {resultado && (
          <Painel titulo="Resultado do reajuste">
            <div className="grade grade--3">
              <Indicador rotulo="Contratos processados" valor={formatarNumero(resultado.processados)} />
              <Indicador rotulo="Parcelas afetadas" valor={formatarNumero(resultado.totalParcelasAfetadas)} tom="ok" />
              <Indicador rotulo="Acréscimo total" valor={formatarDinheiro(resultado.acrescimoTotalCentavos)} tom="info" />
            </div>
            {resultado.totalParcelasAfetadas > 0 && (
              <div style={{ marginTop: 12 }}>
                <AvisoDeSucesso mensagem={`Reajuste aplicado a ${resultado.totalParcelasAfetadas} parcela(s).`} />
              </div>
            )}
            <div className="rolagem-horizontal" style={{ marginTop: 12 }}>
              <table className="tabela tabela--compacta">
                <thead>
                  <tr>
                    <th>Contrato</th>
                    <th className="numerico">Parcelas afetadas</th>
                    <th className="numerico">Acréscimo</th>
                    <th>Resultado</th>
                    <th>Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.itens.map((item) => (
                    <tr key={item.contratoId}>
                      <td>{item.contratoId}</td>
                      <td className="numerico">{item.parcelasAfetadas || '—'}</td>
                      <td className="numerico">{formatarDinheiro(item.acrescimoTotalCentavos)}</td>
                      <td>
                        <Selo
                          texto={item.resultado === 'REAJUSTADO' ? 'Reajustado' : 'Falhou'}
                          tom={item.resultado === 'REAJUSTADO' ? 'ok' : 'vencido'}
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

        <Painel titulo="Contratos ativos" descricao="Selecione os contratos que receberão o reajuste." semPreenchimento>
          <ConteudoDaRequisicao
            requisicao={requisicao}
            vazio={(dados) => (dados.itens ?? []).length === 0}
            tituloDoVazio="Nenhum contrato ativo"
            descricaoDoVazio="Não há contratos ativos para reajustar."
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
                      <th className="numerico">Valor total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dados.itens ?? []).map((contrato) => (
                      <tr key={contrato.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selecionados.has(contrato.id)}
                            onChange={() => definirSelecionados((atual) => alternarNoConjunto(atual, contrato.id))}
                            disabled={!podeGerir}
                            aria-label={`Selecionar contrato ${contrato.numero}`}
                          />
                        </td>
                        <td>{contrato.numero}</td>
                        <td className="celula-larga">{contrato.cliente?.nome ?? '—'}</td>
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
