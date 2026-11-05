import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CabecalhoDaPagina } from '@/componentes/layout/CabecalhoDaPagina';
import { Painel } from '@/componentes/comuns/Painel';
import { Indicador } from '@/componentes/comuns/Indicador';
import { Selo } from '@/componentes/comuns/Selo';
import { ConteudoDaRequisicao } from '@/componentes/comuns/ConteudoDaRequisicao';
import { EstadoDeErro } from '@/componentes/comuns/Estados';
import { TabelaDeContratos } from '@/componentes/contratos/TabelaDeContratos';
import { TabelaDeCobrancas } from '@/componentes/cobrancas/TabelaDeCobrancas';
import { ModalDeTransicoes } from '@/componentes/cobrancas/ModalDeTransicoes';
import { ModalDeCliente } from '@/componentes/cadastros/ModalDeCliente';
import { PainelDeAnexos } from '@/componentes/anexos/PainelDeAnexos';
import { useRequisicao } from '@/ganchos/useRequisicao';
import { useListaDeParcelas } from '@/ganchos/useListaDeParcelas';
import { buscarCliente } from '@/lib/api/cadastros';
import { listarContratos } from '@/lib/api/contratos';
import { listarCobrancas } from '@/lib/api/cobrancas';
import { CATEGORIAS_DE_CLIENTE } from '@/lib/anexo';
import {
  diasDeAtraso,
  idDoContrato,
  numeroDoContrato,
  descricaoDoImovel,
  valorAtualizadoCentavos,
} from '@/lib/parcela';
import { seloDaSituacaoDaParcela } from '@/lib/rotulos';
import {
  formatarData,
  formatarDinheiro,
  formatarDocumento,
  formatarNumero,
  formatarTelefone,
  rotularEnum,
} from '@/lib/formato';
import { podeEscrever } from '@/lib/permissoes';
import { usePermissoes } from '@/contextos/AutenticacaoContexto';
import type { Endereco } from '@/tipos/cadastros';
import type { Contrato } from '@/tipos/contrato';

const PARCELAS_EM_ABERTO_NA_TELA = 10;
const COBRANCAS_NA_TELA = 10;

function formatarEndereco(endereco: Endereco | null): string {
  if (!endereco) return '—';
  const rua = [endereco.logradouro, endereco.numero].filter(Boolean).join(', ');
  const cidade = [endereco.cidade, endereco.uf].filter(Boolean).join('/');
  const texto = [rua, endereco.complemento, endereco.bairro, cidade, endereco.cep]
    .filter(Boolean)
    .join(' · ');
  return texto || '—';
}

/** Soma a posição de todos os contratos do cliente para o resumo do topo. */
function resumirCarteira(contratos: Contrato[]) {
  return contratos.reduce(
    (resumo, contrato) => {
      const posicao = contrato.posicao;
      if (contrato.status === 'ATIVO') resumo.ativos += 1;
      if (!posicao) return resumo;
      resumo.recebidoCentavos += posicao.totalRecebidoCentavos;
      resumo.saldoDevedorCentavos += posicao.saldoDevedorCentavos;
      resumo.vencidoCentavos += posicao.totalVencidoCentavos;
      resumo.parcelasVencidas += posicao.parcelasVencidas;
      resumo.maiorAtraso = Math.max(resumo.maiorAtraso, posicao.diasDeAtrasoMaximo);
      return resumo;
    },
    {
      ativos: 0,
      recebidoCentavos: 0,
      saldoDevedorCentavos: 0,
      vencidoCentavos: 0,
      parcelasVencidas: 0,
      maiorAtraso: 0,
    },
  );
}

/**
 * Tudo sobre um comprador numa tela só: cadastro, contratos com a posição de
 * cada um, parcelas em aberto, cobranças que recebeu e documentos.
 */
export function DetalheDoCliente() {
  const { id = '' } = useParams();
  const papel = usePermissoes();
  const [editando, definirEditando] = useState(false);
  const [transicoesDe, definirTransicoesDe] = useState<string | null>(null);

  const cliente = useRequisicao((sinal) => buscarCliente(id, sinal), [id]);
  const contratos = useRequisicao(
    (sinal) => listarContratos({ clienteId: id, porPagina: 200 }, sinal),
    [id],
  );
  const parcelas = useListaDeParcelas({
    clienteId: id,
    pagina: 1,
    porPagina: PARCELAS_EM_ABERTO_NA_TELA,
  });
  const cobrancas = useRequisicao(
    (sinal) => listarCobrancas({ clienteId: id, pagina: 1, porPagina: COBRANCAS_NA_TELA }, sinal),
    [id],
  );

  if (!id) return <EstadoDeErro mensagem="Cliente não informado." />;

  const listaDeContratos = contratos.dados?.itens ?? [];
  const resumo = resumirCarteira(listaDeContratos);
  const dados = cliente.dados;

  return (
    <>
      <CabecalhoDaPagina
        titulo={dados?.nome ?? 'Cliente'}
        descricao={
          dados
            ? `${dados.documentoFormatado ?? formatarDocumento(dados.documento)} · ${rotularEnum(dados.tipoPessoa)}`
            : 'Carregando dados do cliente…'
        }
        acoes={
          <>
            <Link className="botao" to="/clientes">
              Voltar
            </Link>
            {dados && podeEscrever(papel) && (
              <button
                type="button"
                className="botao botao--primario"
                onClick={() => definirEditando(true)}
              >
                Editar cadastro
              </button>
            )}
          </>
        }
      />

      <div className="corpo-da-pagina pilha">
        <ConteudoDaRequisicao requisicao={contratos}>
          {() => (
            <div className="grade grade--4">
              <Indicador
                rotulo="Contratos"
                valor={formatarNumero(listaDeContratos.length)}
                detalhe={`${formatarNumero(resumo.ativos)} ativo(s)`}
                tom="info"
              />
              <Indicador
                rotulo="Já pago"
                valor={formatarDinheiro(resumo.recebidoCentavos)}
                detalhe="Soma de todos os contratos"
                tom="ok"
              />
              <Indicador
                rotulo="Saldo devedor"
                valor={formatarDinheiro(resumo.saldoDevedorCentavos)}
                detalhe="Ver parcelas em aberto"
                tom="neutro"
                destino={`/parcelas?clienteId=${id}`}
              />
              <Indicador
                rotulo="Vencido"
                valor={formatarDinheiro(resumo.vencidoCentavos)}
                detalhe={
                  resumo.parcelasVencidas > 0
                    ? `${formatarNumero(resumo.parcelasVencidas)} parcela(s) · até ${resumo.maiorAtraso} dias`
                    : 'Nenhuma parcela vencida'
                }
                tom={resumo.vencidoCentavos > 0 ? 'vencido' : 'ok'}
                destino={
                  resumo.parcelasVencidas > 0
                    ? `/parcelas?situacao=VENCIDA&clienteId=${id}`
                    : undefined
                }
              />
            </div>
          )}
        </ConteudoDaRequisicao>

        <Painel
          titulo="Dados cadastrais"
          acoes={
            dados && (
              <Selo texto={dados.ativo ? 'Ativo' : 'Inativo'} tom={dados.ativo ? 'ok' : 'neutro'} />
            )
          }
        >
          <ConteudoDaRequisicao requisicao={cliente}>
            {(cadastro) => (
              <div className="pilha">
                <div className="definicoes">
                  <div>
                    <div className="definicao__rotulo">Documento</div>
                    <div className="definicao__valor">
                      {cadastro.documentoFormatado ?? formatarDocumento(cadastro.documento)}
                    </div>
                  </div>
                  <div>
                    <div className="definicao__rotulo">E-mail</div>
                    <div className="definicao__valor">{cadastro.email ?? '—'}</div>
                  </div>
                  <div>
                    <div className="definicao__rotulo">Telefone</div>
                    <div className="definicao__valor">{formatarTelefone(cadastro.telefone)}</div>
                  </div>
                  <div>
                    <div className="definicao__rotulo">WhatsApp</div>
                    <div className="definicao__valor">{formatarTelefone(cadastro.whatsapp)}</div>
                  </div>
                  <div>
                    <div className="definicao__rotulo">Nascimento</div>
                    <div className="definicao__valor">{formatarData(cadastro.dataNascimento)}</div>
                  </div>
                </div>
                <div>
                  <div className="definicao__rotulo">Endereço</div>
                  <div className="definicao__valor">{formatarEndereco(cadastro.endereco)}</div>
                </div>
                {cadastro.observacoes && (
                  <div>
                    <div className="definicao__rotulo">Observações</div>
                    <div className="definicao__valor">{cadastro.observacoes}</div>
                  </div>
                )}
              </div>
            )}
          </ConteudoDaRequisicao>
        </Painel>

        <Painel
          titulo="Contratos"
          descricao="Clique no número para abrir o extrato completo do contrato"
          semPreenchimento
        >
          <ConteudoDaRequisicao
            requisicao={contratos}
            vazio={(lista) => (lista.itens ?? []).length === 0}
            tituloDoVazio="Nenhum contrato"
            descricaoDoVazio="Este cliente ainda não tem contratos."
          >
            {(lista) => (
              <TabelaDeContratos
                contratos={lista.itens ?? []}
                nomesDeClientes={new Map(dados ? [[dados.id, dados.nome]] : [])}
              />
            )}
          </ConteudoDaRequisicao>
        </Painel>

        <Painel
          titulo="Parcelas em aberto"
          descricao={
            parcelas.dados
              ? `${formatarNumero(parcelas.dados.total)} parcela(s) em aberto · próximas pelo vencimento`
              : undefined
          }
          acoes={
            <Link className="botao botao--pequeno" to={`/parcelas?clienteId=${id}`}>
              Ver todas na cobrança
            </Link>
          }
          semPreenchimento
        >
          <ConteudoDaRequisicao
            requisicao={parcelas}
            vazio={(lista) => (lista.itens ?? []).length === 0}
            tituloDoVazio="Nada em aberto"
            descricaoDoVazio="Todas as parcelas deste cliente estão quitadas."
          >
            {(lista) => (
              <div className="rolagem-horizontal">
                <table className="tabela tabela--compacta">
                  <thead>
                    <tr>
                      <th>Vencimento</th>
                      <th>Contrato</th>
                      <th>Imóvel</th>
                      <th className="numerico">Parcela</th>
                      <th className="numerico">Valor original</th>
                      <th className="numerico">Valor atualizado</th>
                      <th className="numerico">Atraso</th>
                      <th>Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(lista.itens ?? []).map((parcela) => {
                      const selo = seloDaSituacaoDaParcela(parcela.situacao);
                      const contratoId = idDoContrato(parcela);
                      const atraso = diasDeAtraso(parcela);
                      return (
                        <tr key={parcela.id}>
                          <td className="numerico">{formatarData(parcela.vencimento)}</td>
                          <td>
                            {contratoId ? (
                              <Link to={`/contratos/${contratoId}`}>
                                {numeroDoContrato(parcela)}
                              </Link>
                            ) : (
                              numeroDoContrato(parcela)
                            )}
                          </td>
                          <td className="texto-suave">{descricaoDoImovel(parcela)}</td>
                          <td className="numerico">
                            {parcela.numero}
                            {parcela.totalDeParcelas ? `/${parcela.totalDeParcelas}` : ''}
                          </td>
                          <td className="numerico">
                            {formatarDinheiro(parcela.valorOriginalCentavos)}
                          </td>
                          <td className="numerico">
                            {formatarDinheiro(valorAtualizadoCentavos(parcela))}
                          </td>
                          <td className="numerico">
                            {atraso > 0 ? <span className="texto-vencido">{atraso}</span> : '—'}
                          </td>
                          <td>
                            <Selo texto={selo.texto} tom={selo.tom} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </ConteudoDaRequisicao>
        </Painel>

        <Painel
          titulo="Cobranças recebidas"
          descricao="Últimos envios da régua e cobranças avulsas"
          acoes={
            <Link className="botao botao--pequeno" to={`/cobrancas?clienteId=${id}`}>
              Ver histórico completo
            </Link>
          }
          semPreenchimento
        >
          <ConteudoDaRequisicao
            requisicao={cobrancas}
            vazio={(lista) => (lista.itens ?? []).length === 0}
            tituloDoVazio="Nenhuma cobrança enviada"
            descricaoDoVazio="Este cliente ainda não recebeu cobranças."
          >
            {(lista) => (
              <TabelaDeCobrancas
                cobrancas={lista.itens ?? []}
                aoVerDetalhes={definirTransicoesDe}
              />
            )}
          </ConteudoDaRequisicao>
        </Painel>

        <PainelDeAnexos
          escopo="CLIENTE"
          donoId={id}
          categorias={CATEGORIAS_DE_CLIENTE}
          titulo="Documentos do cliente"
          descricao="RG, CPF, comprovantes e demais arquivos"
        />
      </div>

      {editando && dados && (
        <ModalDeCliente
          cliente={dados}
          aoFechar={() => definirEditando(false)}
          aoConcluir={cliente.recarregar}
        />
      )}

      {transicoesDe && (
        <ModalDeTransicoes cobrancaId={transicoesDe} aoFechar={() => definirTransicoesDe(null)} />
      )}
    </>
  );
}
