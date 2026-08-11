import { useState } from 'react';
import { CabecalhoDaPagina } from '@/componentes/layout/CabecalhoDaPagina';
import { Painel } from '@/componentes/comuns/Painel';
import { Paginacao } from '@/componentes/comuns/Paginacao';
import { ConteudoDaRequisicao } from '@/componentes/comuns/ConteudoDaRequisicao';
import { CampoDeSelecao } from '@/componentes/comuns/Campo';
import { Selo } from '@/componentes/comuns/Selo';
import { ModalDeLote } from '@/componentes/cadastros/ModalDeLote';
import { useFiltrosNaUrl } from '@/ganchos/useFiltrosNaUrl';
import { useRequisicao } from '@/ganchos/useRequisicao';
import { useOpcoesDeLoteamentos } from '@/ganchos/useOpcoesDeCadastro';
import { listarLotes } from '@/lib/api/cadastros';
import { formatarDinheiro, formatarNumero, rotularEnum } from '@/lib/formato';
import { podeEscrever } from '@/lib/permissoes';
import { usePermissoes } from '@/contextos/AutenticacaoContexto';
import { SITUACOES_DO_LOTE } from '@/tipos/cadastros';
import type { Lote } from '@/tipos/cadastros';

type Chave = 'loteamentoId' | 'situacao' | 'pagina';

const CHAVES: readonly Chave[] = ['loteamentoId', 'situacao', 'pagina'];

const OPCOES_DE_SITUACAO = SITUACOES_DO_LOTE.map((situacao) => ({
  valor: situacao,
  texto: rotularEnum(situacao),
}));

const TONS: Record<string, 'ok' | 'atencao' | 'info' | 'neutro'> = {
  DISPONIVEL: 'ok',
  RESERVADO: 'atencao',
  VENDIDO: 'info',
  INDISPONIVEL: 'neutro',
};

export function Lotes() {
  const papel = usePermissoes();
  const editavel = podeEscrever(papel);
  const { filtros, definirFiltro } = useFiltrosNaUrl<Chave>(CHAVES);
  const loteamentos = useOpcoesDeLoteamentos();
  const [emEdicao, definirEmEdicao] = useState<Lote | null>(null);
  const [modalAberto, definirModalAberto] = useState(false);
  const pagina = Number(filtros.pagina || 1);

  const requisicao = useRequisicao(
    (sinal) =>
      listarLotes(
        {
          loteamentoId: filtros.loteamentoId || undefined,
          situacao: filtros.situacao || undefined,
          pagina,
          porPagina: 25,
        },
        sinal,
      ),
    [filtros.loteamentoId, filtros.situacao, pagina],
  );

  function abrir(lote: Lote | null) {
    definirEmEdicao(lote);
    definirModalAberto(true);
  }

  return (
    <>
      <CabecalhoDaPagina
        titulo="Lotes"
        descricao="Estoque de lotes por loteamento"
        acoes={
          editavel && (
            <button type="button" className="botao botao--primario" onClick={() => abrir(null)}>
              + Novo lote
            </button>
          )
        }
      />

      <div className="corpo-da-pagina pilha">
        <Painel>
          <div className="filtros">
            <CampoDeSelecao
              rotulo="Loteamento"
              valor={filtros.loteamentoId}
              opcoes={loteamentos}
              aoMudar={(valor) => definirFiltro('loteamentoId', valor)}
            />
            <CampoDeSelecao
              rotulo="Situação"
              valor={filtros.situacao}
              opcoes={OPCOES_DE_SITUACAO}
              aoMudar={(valor) => definirFiltro('situacao', valor)}
            />
          </div>
        </Painel>

        <Painel
          titulo="Lotes"
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
            tituloDoVazio="Nenhum lote"
            descricaoDoVazio="Cadastre lotes para vincular aos contratos."
          >
            {(dados) => (
              <div className="rolagem-horizontal">
                <table className="tabela">
                  <thead>
                    <tr>
                      <th>Loteamento</th>
                      <th>Quadra</th>
                      <th>Lote</th>
                      <th className="numerico">Área (m²)</th>
                      <th className="numerico">Valor de tabela</th>
                      <th>Situação</th>
                      <th className="acoes">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dados.itens ?? []).map((lote) => (
                      <tr key={lote.id}>
                        <td className="celula-larga">{lote.loteamento ?? '—'}</td>
                        <td>{lote.quadra ?? '—'}</td>
                        <td>{lote.numero}</td>
                        <td className="numerico">
                          {lote.areaEmMetrosQuadrados
                            ? formatarNumero(lote.areaEmMetrosQuadrados)
                            : '—'}
                        </td>
                        <td className="numerico">
                          {formatarDinheiro(lote.valorDeTabelaCentavos)}
                        </td>
                        <td>
                          <Selo
                            texto={rotularEnum(lote.situacao)}
                            tom={TONS[lote.situacao] ?? 'neutro'}
                          />
                        </td>
                        <td className="acoes">
                          {editavel && (
                            <button
                              type="button"
                              className="botao botao--fantasma botao--pequeno"
                              onClick={() => abrir(lote)}
                            >
                              Editar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ConteudoDaRequisicao>
        </Painel>
      </div>

      {modalAberto && (
        <ModalDeLote
          lote={emEdicao}
          loteamentos={loteamentos}
          aoFechar={() => definirModalAberto(false)}
          aoConcluir={requisicao.recarregar}
        />
      )}
    </>
  );
}
