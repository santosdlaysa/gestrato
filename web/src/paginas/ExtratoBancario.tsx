import { useMemo } from 'react';
import { CabecalhoDaPagina } from '@/componentes/layout/CabecalhoDaPagina';
import { Painel } from '@/componentes/comuns/Painel';
import { ConteudoDaRequisicao } from '@/componentes/comuns/ConteudoDaRequisicao';
import { CampoDeSelecao, CampoDeTexto, type Opcao } from '@/componentes/comuns/Campo';
import { PainelDeSaldos } from '@/componentes/financeiro/PainelDeSaldos';
import { useFiltrosNaUrl } from '@/ganchos/useFiltrosNaUrl';
import { useRequisicao } from '@/ganchos/useRequisicao';
import { formatarData, formatarDinheiro } from '@/lib/formato';
import { listarContasBancarias, listarSaldos, obterExtrato } from '@/lib/api/fluxo-de-caixa';
import type { Extrato } from '@/tipos/fluxo-de-caixa';

type Chave = 'contaBancariaId' | 'de' | 'ate';

export function ExtratoBancario() {
  const { filtros, definirFiltro } = useFiltrosNaUrl<Chave>(['contaBancariaId', 'de', 'ate']);

  const contas = useRequisicao((sinal) => listarContasBancarias({ ativo: 'true', porPagina: 200 }, sinal), []);
  const saldos = useRequisicao((sinal) => listarSaldos(sinal), []);

  const opcoesDeConta = useMemo<Opcao[]>(() => (contas.dados?.itens ?? []).map((c) => ({ valor: c.id, texto: c.nome })), [contas.dados]);
  const contaSelecionada = filtros.contaBancariaId || opcoesDeConta[0]?.valor || '';

  const extrato = useRequisicao<Extrato | null>(
    (sinal) =>
      contaSelecionada
        ? obterExtrato({ contaBancariaId: contaSelecionada, de: filtros.de || undefined, ate: filtros.ate || undefined }, sinal)
        : Promise.resolve(null),
    [contaSelecionada, filtros.de, filtros.ate],
  );

  return (
    <>
      <CabecalhoDaPagina titulo="Extrato bancário" descricao="Movimentos de uma conta no período, com saldo corrente linha a linha." />

      <div className="corpo-da-pagina pilha">
        {saldos.dados && <PainelDeSaldos saldos={saldos.dados.itens} />}

        <Painel>
          <div className="filtros">
            <CampoDeSelecao rotulo="Conta" valor={contaSelecionada} opcoes={opcoesDeConta} aoMudar={(v) => definirFiltro('contaBancariaId', v)} textoVazio="Selecione" />
            <CampoDeTexto rotulo="De" tipo="date" valor={filtros.de} aoMudar={(v) => definirFiltro('de', v)} />
            <CampoDeTexto rotulo="Até" tipo="date" valor={filtros.ate} aoMudar={(v) => definirFiltro('ate', v)} />
          </div>
        </Painel>

        <Painel titulo="Extrato" semPreenchimento>
          <ConteudoDaRequisicao
            requisicao={extrato}
            vazio={(dados) => !dados || dados.linhas.length === 0}
            tituloDoVazio="Sem movimentos no período"
            descricaoDoVazio="Escolha uma conta e um período com lançamentos."
          >
            {(dados) => dados && (
              <div className="rolagem-horizontal">
                <table className="tabela">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Descrição</th>
                      <th>Categoria</th>
                      <th className="numerico">Entrada</th>
                      <th className="numerico">Saída</th>
                      <th className="numerico">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="linha-destacada">
                      <td colSpan={5}><strong>Saldo anterior</strong></td>
                      <td className="numerico"><strong>{formatarDinheiro(dados.saldoAnteriorCentavos)}</strong></td>
                    </tr>
                    {dados.linhas.map((l) => (
                      <tr key={l.id}>
                        <td>{formatarData(l.data)}</td>
                        <td className="celula-larga">{l.descricao}</td>
                        <td>{l.categoria?.nome ?? '—'}</td>
                        <td className="numerico">{l.tipo === 'ENTRADA' ? formatarDinheiro(l.valorCentavos) : '—'}</td>
                        <td className="numerico">{l.tipo === 'SAIDA' ? formatarDinheiro(l.valorCentavos) : '—'}</td>
                        <td className="numerico">{formatarDinheiro(l.saldoCentavos)}</td>
                      </tr>
                    ))}
                    <tr className="linha-destacada">
                      <td colSpan={5}><strong>Saldo final</strong></td>
                      <td className="numerico"><strong>{formatarDinheiro(dados.saldoFinalCentavos)}</strong></td>
                    </tr>
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
