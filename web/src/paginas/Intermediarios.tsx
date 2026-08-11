import { useState } from 'react';
import { CabecalhoDaPagina } from '@/componentes/layout/CabecalhoDaPagina';
import { Painel } from '@/componentes/comuns/Painel';
import { ConteudoDaRequisicao } from '@/componentes/comuns/ConteudoDaRequisicao';
import { Paginacao } from '@/componentes/comuns/Paginacao';
import { CampoDeSelecao, CampoDeTexto } from '@/componentes/comuns/Campo';
import { Selo } from '@/componentes/comuns/Selo';
import { ModalDeIntermediario } from '@/componentes/cadastros/ModalDeIntermediario';
import { useFiltrosNaUrl } from '@/ganchos/useFiltrosNaUrl';
import { useRequisicao } from '@/ganchos/useRequisicao';
import { useValorAtrasado } from '@/ganchos/useValorAtrasado';
import { listarCorretores, listarParceiros } from '@/lib/api/cadastros';
import { podeEscrever } from '@/lib/permissoes';
import { usePermissoes } from '@/contextos/AutenticacaoContexto';
import type { Corretor, Parceiro } from '@/tipos/cadastros';
import type { RespostaPaginada } from '@/tipos/comum';

type Tipo = 'corretor' | 'parceiro';
type Registro = Corretor | Parceiro;
type RespostaDeIntermediarios = RespostaPaginada<Registro>;

const ATIVOS = [
  { valor: 'true', texto: 'Ativos' },
  { valor: 'false', texto: 'Inativos' },
];

export function Intermediarios({ tipo }: { tipo: Tipo }) {
  const { filtros, definirFiltro } = useFiltrosNaUrl<'busca' | 'ativo' | 'pagina'>([
    'busca',
    'ativo',
    'pagina',
  ]);
  const [edicao, definirEdicao] = useState<Registro | null>(null);
  const [aberto, definirAberto] = useState(false);
  const papel = usePermissoes();
  const busca = useValorAtrasado(filtros.busca, 400);
  const pagina = Number(filtros.pagina || 1);
  const requisicao = useRequisicao<RespostaDeIntermediarios>(
    (sinal) =>
      tipo === 'corretor'
        ? (listarCorretores(sinal, {
            busca: busca || undefined,
            ativo: filtros.ativo || undefined,
            pagina,
            porPagina: 25,
          }) as Promise<RespostaDeIntermediarios>)
        : (listarParceiros(
            { busca: busca || undefined, ativo: filtros.ativo || undefined, pagina, porPagina: 25 },
            sinal,
          ) as Promise<RespostaDeIntermediarios>),
    [tipo, busca, filtros.ativo, pagina],
  );
  const titulo = tipo === 'corretor' ? 'Corretores' : 'Parceiros';
  const abrir = (item: Registro | null) => {
    definirEdicao(item);
    definirAberto(true);
  };

  return (
    <>
      <CabecalhoDaPagina
        titulo={titulo}
        descricao={tipo === 'corretor' ? 'Cadastro de corretores e comissões' : 'Cadastro de parceiros comerciais'}
        acoes={
          podeEscrever(papel) && (
            <button type="button" className="botao botao--primario" onClick={() => abrir(null)}>
              + Novo {tipo}
            </button>
          )
        }
      />
      <div className="corpo-da-pagina pilha">
        <Painel>
          <div className="filtros">
            <CampoDeTexto
              rotulo="Busca"
              valor={filtros.busca}
              aoMudar={(valor) => definirFiltro('busca', valor)}
              espacoReservado="Nome"
            />
            <CampoDeSelecao
              rotulo="Situação"
              valor={filtros.ativo}
              opcoes={ATIVOS}
              aoMudar={(valor) => definirFiltro('ativo', valor)}
            />
          </div>
        </Painel>
        <Painel
          titulo={titulo}
          semPreenchimento
          rodape={
            requisicao.dados && (
              <Paginacao
                pagina={requisicao.dados.pagina}
                totalDePaginas={requisicao.dados.totalDePaginas}
                total={requisicao.dados.total}
                aoMudarPagina={(valor) => definirFiltro('pagina', String(valor))}
              />
            )
          }
        >
          <ConteudoDaRequisicao
            requisicao={requisicao}
            vazio={(dados) => dados.itens.length === 0}
            tituloDoVazio={`Nenhum ${tipo}`}
            descricaoDoVazio={`Cadastre o primeiro ${tipo}.`}
          >
            {(dados) => (
              <div className="rolagem-horizontal">
                <table className="tabela">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Documento</th>
                      <th>E-mail</th>
                      <th>Telefone</th>
                      {tipo === 'corretor' && <th>Comissão</th>}
                      <th>Situação</th>
                      <th className="acoes">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.itens.map((item) => (
                      <tr key={item.id}>
                        <td className="celula-larga">{item.nome}</td>
                        <td>{item.documento || '—'}</td>
                        <td>{item.email || '—'}</td>
                        <td>{item.telefone || '—'}</td>
                        {tipo === 'corretor' && (
                          <td>{(item as Corretor).percentualDeComissao}%</td>
                        )}
                        <td>
                          <Selo texto={item.ativo ? 'Ativo' : 'Inativo'} tom={item.ativo ? 'ok' : 'neutro'} />
                        </td>
                        <td className="acoes">
                          {podeEscrever(papel) && (
                            <button
                              type="button"
                              className="botao botao--fantasma botao--pequeno"
                              onClick={() => abrir(item)}
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
      {aberto && (
        <ModalDeIntermediario
          tipo={tipo}
          registro={edicao}
          aoFechar={() => definirAberto(false)}
          aoConcluir={requisicao.recarregar}
        />
      )}
    </>
  );
}
