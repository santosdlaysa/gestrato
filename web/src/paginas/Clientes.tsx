import { useState } from 'react';
import { CabecalhoDaPagina } from '@/componentes/layout/CabecalhoDaPagina';
import { Painel } from '@/componentes/comuns/Painel';
import { Paginacao } from '@/componentes/comuns/Paginacao';
import { ConteudoDaRequisicao } from '@/componentes/comuns/ConteudoDaRequisicao';
import { CampoDeSelecao, CampoDeTexto } from '@/componentes/comuns/Campo';
import { Selo } from '@/componentes/comuns/Selo';
import { ModalDeCliente } from '@/componentes/cadastros/ModalDeCliente';
import { PainelDeAnexos } from '@/componentes/anexos/PainelDeAnexos';
import { CATEGORIAS_DE_CLIENTE } from '@/lib/anexo';
import { useFiltrosNaUrl } from '@/ganchos/useFiltrosNaUrl';
import { useRequisicao } from '@/ganchos/useRequisicao';
import { useValorAtrasado } from '@/ganchos/useValorAtrasado';
import { listarClientes } from '@/lib/api/cadastros';
import { formatarDocumento, formatarTelefone } from '@/lib/formato';
import { podeEscrever } from '@/lib/permissoes';
import { usePapel } from '@/contextos/AutenticacaoContexto';
import type { Cliente } from '@/tipos/cadastros';

type Chave = 'busca' | 'ativo' | 'pagina';

const CHAVES: readonly Chave[] = ['busca', 'ativo', 'pagina'];

const OPCOES_DE_ATIVO = [
  { valor: 'true', texto: 'Ativos' },
  { valor: 'false', texto: 'Inativos' },
];

export function Clientes() {
  const papel = usePapel();
  const editavel = podeEscrever(papel);
  const { filtros, definirFiltro } = useFiltrosNaUrl<Chave>(CHAVES);
  const [emEdicao, definirEmEdicao] = useState<Cliente | null>(null);
  const [modalAberto, definirModalAberto] = useState(false);
  // Anexos exigem um cliente já gravado, então a seção fica na listagem (fora do
  // modal de cadastro, que também atende o cliente novo, ainda sem id).
  const [comDocumentos, definirComDocumentos] = useState<Cliente | null>(null);
  const pagina = Number(filtros.pagina || 1);
  const busca = useValorAtrasado(filtros.busca, 400);

  const requisicao = useRequisicao(
    (sinal) =>
      listarClientes(
        { busca: busca || undefined, ativo: filtros.ativo || undefined, pagina, porPagina: 25 },
        sinal,
      ),
    [busca, filtros.ativo, pagina],
  );

  function abrir(cliente: Cliente | null) {
    definirEmEdicao(cliente);
    definirModalAberto(true);
  }

  return (
    <>
      <CabecalhoDaPagina
        titulo="Clientes"
        descricao="Cadastro de compradores"
        acoes={
          editavel && (
            <button type="button" className="botao botao--primario" onClick={() => abrir(null)}>
              + Novo cliente
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
              espacoReservado="Nome ou documento"
            />
            <CampoDeSelecao
              rotulo="Situação"
              valor={filtros.ativo}
              opcoes={OPCOES_DE_ATIVO}
              aoMudar={(valor) => definirFiltro('ativo', valor)}
            />
          </div>
        </Painel>

        <Painel
          titulo="Clientes"
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
            tituloDoVazio="Nenhum cliente"
            descricaoDoVazio="Cadastre o primeiro cliente para começar."
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
                      <th>WhatsApp</th>
                      <th>Situação</th>
                      <th className="acoes">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dados.itens ?? []).map((cliente) => (
                      <tr
                        key={cliente.id}
                        className={comDocumentos?.id === cliente.id ? 'linha--selecionada' : ''}
                      >
                        <td className="celula-larga">{cliente.nome}</td>
                        <td>
                          {cliente.documentoFormatado ?? formatarDocumento(cliente.documento)}
                        </td>
                        <td>{cliente.email ?? '—'}</td>
                        <td>{formatarTelefone(cliente.telefone)}</td>
                        <td>{formatarTelefone(cliente.whatsapp)}</td>
                        <td>
                          <Selo
                            texto={cliente.ativo ? 'Ativo' : 'Inativo'}
                            tom={cliente.ativo ? 'ok' : 'neutro'}
                          />
                        </td>
                        <td className="acoes">
                          <button
                            type="button"
                            className="botao botao--fantasma botao--pequeno"
                            onClick={() => definirComDocumentos(cliente)}
                          >
                            Documentos
                          </button>
                          {editavel && (
                            <button
                              type="button"
                              className="botao botao--fantasma botao--pequeno"
                              onClick={() => abrir(cliente)}
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

        {comDocumentos && (
          <PainelDeAnexos
            key={comDocumentos.id}
            escopo="CLIENTE"
            donoId={comDocumentos.id}
            categorias={CATEGORIAS_DE_CLIENTE}
            titulo="Documentos do cliente"
            descricao={comDocumentos.nome}
            acoes={
              <button
                type="button"
                className="botao botao--pequeno"
                onClick={() => definirComDocumentos(null)}
              >
                Fechar
              </button>
            }
          />
        )}
      </div>

      {modalAberto && (
        <ModalDeCliente
          cliente={emEdicao}
          aoFechar={() => definirModalAberto(false)}
          aoConcluir={requisicao.recarregar}
        />
      )}
    </>
  );
}
