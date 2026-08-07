import { Fragment, useMemo } from 'react';
import { CabecalhoDaPagina } from '@/componentes/layout/CabecalhoDaPagina';
import { Painel } from '@/componentes/comuns/Painel';
import { ConteudoDaRequisicao } from '@/componentes/comuns/ConteudoDaRequisicao';
import { Indicador } from '@/componentes/comuns/Indicador';
import { CampoDeSelecao, type Opcao } from '@/componentes/comuns/Campo';
import { useFiltrosNaUrl } from '@/ganchos/useFiltrosNaUrl';
import { useRequisicao } from '@/ganchos/useRequisicao';
import { formatarDinheiro, formatarPercentual } from '@/lib/formato';
import { listarEmpreendimentos, obterPainel } from '@/lib/api/fluxo-de-caixa';
import type { GrupoDoPainel, NaturezaFinanceira, PainelFinanceiro } from '@/tipos/fluxo-de-caixa';

const ROTULO_NATUREZA: Record<NaturezaFinanceira, string> = {
  RECEBIVEL_VENDA: 'Recebíveis de venda',
  APORTE: 'Aportes de sócios',
  TRANSFERENCIA: 'Transferências',
  DESPESA_FIXA: 'Despesas fixas',
  DESPESA_VARIAVEL: 'Despesas variáveis',
  CUSTO_OBRA: 'Custo de obra',
  OUTRO: 'Outros',
};

function anosDisponiveis(): Opcao[] {
  const atual = new Date().getFullYear();
  return [atual - 1, atual, atual + 1].map((a) => ({ valor: String(a), texto: String(a) }));
}

function percentual(realizado: number, previsto: number): string {
  if (previsto === 0) return '—';
  return formatarPercentual((realizado / previsto) * 100, 0);
}

/** Variação realizado − previsto, com o tom certo por lado (receita × despesa). */
function tomDaVariacao(variacao: number, ehReceita: boolean): 'ok' | 'vencido' | 'neutro' {
  if (variacao === 0) return 'neutro';
  const favoravel = ehReceita ? variacao > 0 : variacao < 0;
  return favoravel ? 'ok' : 'vencido';
}

type Chave = 'ano' | 'empreendimentoFinanceiroId';

export function PainelOrcadoRealizado() {
  const { filtros, definirFiltro } = useFiltrosNaUrl<Chave>(['ano', 'empreendimentoFinanceiroId']);
  const ano = Number(filtros.ano || new Date().getFullYear());

  const empreendimentos = useRequisicao((sinal) => listarEmpreendimentos({ ativo: 'true', porPagina: 200 }, sinal), []);
  const opcoesEmpreendimento = useMemo<Opcao[]>(() => (empreendimentos.dados?.itens ?? []).map((e) => ({ valor: e.id, texto: e.nome })), [empreendimentos.dados]);

  const painel = useRequisicao<PainelFinanceiro>(
    (sinal) => obterPainel({ ano, empreendimentoFinanceiroId: filtros.empreendimentoFinanceiroId || undefined }, sinal),
    [ano, filtros.empreendimentoFinanceiroId],
  );

  return (
    <>
      <CabecalhoDaPagina titulo="Painel orçado × realizado" descricao="Previsto (orçamento) contra realizado (lançamentos) do ano, por rubrica e empreendimento." />

      <div className="corpo-da-pagina pilha">
        <Painel>
          <div className="filtros">
            <CampoDeSelecao rotulo="Ano" valor={String(ano)} opcoes={anosDisponiveis()} aoMudar={(v) => definirFiltro('ano', v)} />
            <CampoDeSelecao rotulo="Empreendimento" valor={filtros.empreendimentoFinanceiroId} opcoes={opcoesEmpreendimento} aoMudar={(v) => definirFiltro('empreendimentoFinanceiroId', v)} textoVazio="Todos (consolidado)" />
          </div>
        </Painel>

        {painel.dados && (
          <div className="grade grade--3">
            <Indicador rotulo="Receitas" valor={formatarDinheiro(painel.dados.totais.receitasRealizadoCentavos)} detalhe={`Previsto ${formatarDinheiro(painel.dados.totais.receitasPrevistoCentavos)}`} tom="ok" />
            <Indicador rotulo="Despesas" valor={formatarDinheiro(painel.dados.totais.despesasRealizadoCentavos)} detalhe={`Previsto ${formatarDinheiro(painel.dados.totais.despesasPrevistoCentavos)}`} tom="vencido" />
            <Indicador rotulo="Resultado" valor={formatarDinheiro(painel.dados.totais.resultadoRealizadoCentavos)} detalhe={`Previsto ${formatarDinheiro(painel.dados.totais.resultadoPrevistoCentavos)}`} tom={painel.dados.totais.resultadoRealizadoCentavos < 0 ? 'vencido' : 'info'} />
          </div>
        )}

        <Painel titulo="Orçado × realizado por rubrica" semPreenchimento>
          <ConteudoDaRequisicao requisicao={painel} vazio={(dados) => dados.grupos.length === 0} tituloDoVazio="Sem dados no período" descricaoDoVazio="Cadastre orçamento (previsto) ou registre lançamentos (realizado) para o ano escolhido.">
            {(dados) => (
              <div className="rolagem-horizontal">
                <table className="tabela">
                  <thead>
                    <tr>
                      <th>Rubrica</th>
                      <th className="numerico">Previsto</th>
                      <th className="numerico">Realizado</th>
                      <th className="numerico">Variação</th>
                      <th className="numerico">% do previsto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.grupos.map((grupo: GrupoDoPainel) => {
                      const variacaoGrupo = grupo.realizadoCentavos - grupo.previstoCentavos;
                      return (
                        <Fragment key={grupo.natureza}>
                          <tr className="linha-destacada">
                            <td><strong>{ROTULO_NATUREZA[grupo.natureza]}</strong></td>
                            <td className="numerico"><strong>{formatarDinheiro(grupo.previstoCentavos)}</strong></td>
                            <td className="numerico"><strong>{formatarDinheiro(grupo.realizadoCentavos)}</strong></td>
                            <td className={`numerico tom--${tomDaVariacao(variacaoGrupo, grupo.ehReceita)}`}><strong>{formatarDinheiro(variacaoGrupo)}</strong></td>
                            <td className="numerico"><strong>{percentual(grupo.realizadoCentavos, grupo.previstoCentavos)}</strong></td>
                          </tr>
                          {grupo.linhas.map((linha) => {
                            const variacao = linha.realizadoCentavos - linha.previstoCentavos;
                            return (
                              <tr key={linha.categoriaId}>
                                <td className="celula-larga" style={{ paddingLeft: 24 }}>{linha.categoria}</td>
                                <td className="numerico">{formatarDinheiro(linha.previstoCentavos)}</td>
                                <td className="numerico">{formatarDinheiro(linha.realizadoCentavos)}</td>
                                <td className={`numerico tom--${tomDaVariacao(variacao, grupo.ehReceita)}`}>{formatarDinheiro(variacao)}</td>
                                <td className="numerico">{percentual(linha.realizadoCentavos, linha.previstoCentavos)}</td>
                              </tr>
                            );
                          })}
                        </Fragment>
                      );
                    })}
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
