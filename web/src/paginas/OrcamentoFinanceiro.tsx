import { useMemo, useState } from 'react';
import { CabecalhoDaPagina } from '@/componentes/layout/CabecalhoDaPagina';
import { Painel } from '@/componentes/comuns/Painel';
import { ConteudoDaRequisicao } from '@/componentes/comuns/ConteudoDaRequisicao';
import { CampoDeSelecao, type Opcao } from '@/componentes/comuns/Campo';
import { useFiltrosNaUrl } from '@/ganchos/useFiltrosNaUrl';
import { useRequisicao } from '@/ganchos/useRequisicao';
import { useAcao } from '@/ganchos/useAcao';
import { usePermissoes } from '@/contextos/AutenticacaoContexto';
import { podeEscrever } from '@/lib/permissoes';
import { centavosParaCampo, formatarDinheiro } from '@/lib/formato';
import { listarCategorias, listarEmpreendimentos, listarOrcamento, salvarOrcamento } from '@/lib/api/fluxo-de-caixa';
import type { CategoriaFinanceira, NaturezaFinanceira, RespostaDeOrcamento } from '@/tipos/fluxo-de-caixa';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const NATUREZAS: Opcao[] = [
  { valor: 'RECEBIVEL_VENDA', texto: 'Recebíveis de venda' },
  { valor: 'APORTE', texto: 'Aportes' },
  { valor: 'DESPESA_FIXA', texto: 'Despesas fixas' },
  { valor: 'DESPESA_VARIAVEL', texto: 'Despesas variáveis' },
  { valor: 'CUSTO_OBRA', texto: 'Custo de obra' },
  { valor: 'OUTRO', texto: 'Outros' },
];

function centavos(valor: string): number {
  const t = valor.trim();
  if (!t) return 0;
  const n = Number(t.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function anosDisponiveis(): Opcao[] {
  const atual = new Date().getFullYear();
  return [atual - 1, atual, atual + 1].map((a) => ({ valor: String(a), texto: String(a) }));
}

type Chave = 'ano' | 'empreendimentoFinanceiroId' | 'natureza';

export function OrcamentoFinanceiro() {
  const { filtros, definirFiltro } = useFiltrosNaUrl<Chave>(['ano', 'empreendimentoFinanceiroId', 'natureza']);
  const editavel = podeEscrever(usePermissoes());
  const acao = useAcao();
  const [edicoes, definirEdicoes] = useState<Record<string, string>>({});

  const ano = Number(filtros.ano || new Date().getFullYear());
  const natureza = (filtros.natureza as NaturezaFinanceira) || undefined;

  const empreendimentos = useRequisicao((sinal) => listarEmpreendimentos({ ativo: 'true', porPagina: 200 }, sinal), []);
  const categorias = useRequisicao((sinal) => listarCategorias({ ativo: 'true', porPagina: 500 }, sinal), []);

  const opcoesEmpreendimento = useMemo<Opcao[]>(() => (empreendimentos.dados?.itens ?? []).map((e) => ({ valor: e.id, texto: e.nome })), [empreendimentos.dados]);
  const empreendimentoId = filtros.empreendimentoFinanceiroId || opcoesEmpreendimento[0]?.valor || '';

  const orcamento = useRequisicao<RespostaDeOrcamento>(
    (sinal) =>
      empreendimentoId
        ? listarOrcamento({ ano, empreendimentoFinanceiroId: empreendimentoId, natureza }, sinal)
        : Promise.resolve({ ano, itens: [] }),
    [ano, empreendimentoId, natureza],
  );

  // Rubricas da grade: filtradas por natureza (quando escolhida) e ordenadas
  // como no plano de contas (natureza → ordem → nome).
  const linhas = useMemo<CategoriaFinanceira[]>(() => {
    const itens = (categorias.dados?.itens ?? []).filter((c) => c.ativa && (!natureza || c.natureza === natureza));
    return [...itens].sort((a, b) => a.natureza.localeCompare(b.natureza) || a.ordem - b.ordem || a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [categorias.dados, natureza]);

  // Valores gravados: chave "categoriaId:mes" → centavos.
  const gravado = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const item of orcamento.dados?.itens ?? []) mapa.set(`${item.categoriaId}:${item.mes}`, item.valorPrevistoCentavos);
    return mapa;
  }, [orcamento.dados]);

  function chave(categoriaId: string, mes: number): string {
    return `${categoriaId}:${mes}`;
  }
  function valorDaCelula(categoriaId: string, mes: number): number {
    const k = chave(categoriaId, mes);
    return edicoes[k] !== undefined ? centavos(edicoes[k]) : gravado.get(k) ?? 0;
  }
  function textoDaCelula(categoriaId: string, mes: number): string {
    const k = chave(categoriaId, mes);
    if (edicoes[k] !== undefined) return edicoes[k];
    const c = gravado.get(k);
    return c ? centavosParaCampo(c) : '';
  }

  async function salvarCelula(categoriaId: string, mes: number) {
    const k = chave(categoriaId, mes);
    if (edicoes[k] === undefined) return;
    const novo = centavos(edicoes[k]);
    if (novo === (gravado.get(k) ?? 0)) {
      definirEdicoes((atual) => { const c = { ...atual }; delete c[k]; return c; });
      return;
    }
    const sucesso = await acao.executar(() => salvarOrcamento({ categoriaId, empreendimentoFinanceiroId: empreendimentoId, ano, mes, valorPrevistoCentavos: novo }));
    if (sucesso) {
      definirEdicoes((atual) => { const c = { ...atual }; delete c[k]; return c; });
      orcamento.recarregar();
    }
  }

  const totalPorMes = MESES.map((_, i) => linhas.reduce((soma, cat) => soma + valorDaCelula(cat.id, i + 1), 0));
  const totalGeral = totalPorMes.reduce((s, v) => s + v, 0);

  return (
    <>
      <CabecalhoDaPagina titulo="Orçamento (previsto)" descricao="Valores previstos por rubrica e mês, por empreendimento — a base do orçado × realizado." />

      <div className="corpo-da-pagina pilha">
        <Painel>
          <div className="filtros">
            <CampoDeSelecao rotulo="Ano" valor={String(ano)} opcoes={anosDisponiveis()} aoMudar={(v) => definirFiltro('ano', v)} />
            <CampoDeSelecao rotulo="Empreendimento" valor={empreendimentoId} opcoes={opcoesEmpreendimento} aoMudar={(v) => definirFiltro('empreendimentoFinanceiroId', v)} textoVazio="Selecione" />
            <CampoDeSelecao rotulo="Natureza" valor={filtros.natureza} opcoes={NATUREZAS} aoMudar={(v) => definirFiltro('natureza', v)} textoVazio="Todas" />
          </div>
          {acao.erro && <div className="aviso aviso--erro">{acao.erro}</div>}
        </Painel>

        <Painel titulo="Grade orçamentária" descricao={`Total previsto no ano: ${formatarDinheiro(totalGeral)}`} semPreenchimento>
          <ConteudoDaRequisicao requisicao={orcamento} vazio={() => linhas.length === 0} tituloDoVazio="Sem categorias" descricaoDoVazio="Cadastre categorias financeiras para montar o orçamento.">
            {() => (
              <div className="rolagem-horizontal">
                <table className="tabela tabela--compacta">
                  <thead>
                    <tr>
                      <th>Categoria</th>
                      {MESES.map((m) => (<th key={m} className="numerico">{m}</th>))}
                      <th className="numerico">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linhas.map((cat) => {
                      const totalLinha = MESES.reduce((s, _m, i) => s + valorDaCelula(cat.id, i + 1), 0);
                      return (
                        <tr key={cat.id}>
                          <td className="celula-larga">{cat.nome}</td>
                          {MESES.map((_m, i) => {
                            const mes = i + 1;
                            return (
                              <td key={mes} className="numerico">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  className="entrada-grade"
                                  style={{ width: 80, textAlign: 'right' }}
                                  value={textoDaCelula(cat.id, mes)}
                                  disabled={!editavel}
                                  onChange={(e) => definirEdicoes((atual) => ({ ...atual, [chave(cat.id, mes)]: e.target.value }))}
                                  onBlur={() => void salvarCelula(cat.id, mes)}
                                />
                              </td>
                            );
                          })}
                          <td className="numerico"><strong>{formatarDinheiro(totalLinha)}</strong></td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="linha-destacada">
                      <td><strong>Total</strong></td>
                      {totalPorMes.map((v, i) => (<td key={i} className="numerico"><strong>{formatarDinheiro(v)}</strong></td>))}
                      <td className="numerico"><strong>{formatarDinheiro(totalGeral)}</strong></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </ConteudoDaRequisicao>
        </Painel>
      </div>
    </>
  );
}
