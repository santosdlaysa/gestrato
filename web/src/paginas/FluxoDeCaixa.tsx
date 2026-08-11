import { useState, type ReactNode } from 'react';
import { CabecalhoDaPagina } from '@/componentes/layout/CabecalhoDaPagina';
import { Painel } from '@/componentes/comuns/Painel';
import { Modal } from '@/componentes/comuns/Modal';
import { ConteudoDaRequisicao } from '@/componentes/comuns/ConteudoDaRequisicao';
import { Paginacao } from '@/componentes/comuns/Paginacao';
import { CampoDeTexto, CampoDeSelecao, CampoDeDinheiro } from '@/componentes/comuns/Campo';
import { Selo } from '@/componentes/comuns/Selo';
import { useFiltrosNaUrl } from '@/ganchos/useFiltrosNaUrl';
import { useRequisicao } from '@/ganchos/useRequisicao';
import { useAcao } from '@/ganchos/useAcao';
import { usePermissoes } from '@/contextos/AutenticacaoContexto';
import { podeEscrever } from '@/lib/permissoes';
import { formatarDinheiro } from '@/lib/formato';
import type { RespostaPaginada } from '@/tipos/comum';
import {
  listarContasBancarias,
  criarContaBancaria,
  atualizarContaBancaria,
  listarSocios,
  criarSocio,
  atualizarSocio,
  listarEmpreendimentos,
  criarEmpreendimento,
  atualizarEmpreendimento,
  listarCategorias,
  criarCategoria,
  atualizarCategoria,
} from '@/lib/api/fluxo-de-caixa';
import type {
  ContaBancaria,
  SocioAportador,
  EmpreendimentoFinanceiro,
  CategoriaFinanceira,
  NaturezaFinanceira,
  TipoLancamentoFinanceiro,
} from '@/tipos/fluxo-de-caixa';

// -------------------------------------------------------------------- utilitarios

/** "1.234,56" → 123456 centavos. */
function paraCentavos(valor: string): number {
  const normalizado = valor.trim().replace(/\./g, '').replace(',', '.');
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? Math.round(numero * 100) : 0;
}

/** 123456 centavos → "1234,56" (para preencher o formulário de edição). */
function paraReais(centavos: number): string {
  return (centavos / 100).toFixed(2).replace('.', ',');
}

const NATUREZAS: Record<NaturezaFinanceira, string> = {
  RECEBIVEL_VENDA: 'Recebível de venda',
  APORTE: 'Aporte',
  TRANSFERENCIA: 'Transferência',
  DESPESA_FIXA: 'Despesa fixa',
  DESPESA_VARIAVEL: 'Despesa variável',
  CUSTO_OBRA: 'Custo de obra',
  OUTRO: 'Outro',
};

// ------------------------------------------------------ componente generico de cadastro

interface Coluna<T> {
  titulo: string;
  numerico?: boolean;
  larga?: boolean;
  conteudo: (item: T) => ReactNode;
}

interface ConfigDeCadastro<T, F> {
  titulo: string;
  descricao: string;
  textoNovo: string;
  buscaReservada: string;
  colunas: Coluna<T>[];
  estaAtivo: (item: T) => boolean;
  listar: (filtros: { busca?: string; ativo?: string; pagina: number; porPagina: number }, sinal?: AbortSignal) => Promise<RespostaPaginada<T>>;
  formularioVazio: F;
  paraFormulario: (item: T) => F;
  formulario: (valor: F, definir: (proximo: F) => void) => ReactNode;
  valido: (valor: F) => boolean;
  criar: (valor: F) => Promise<T>;
  atualizar: (id: string, valor: F) => Promise<T>;
  alternarAtivo: (item: T) => Promise<unknown>;
  identificador: (item: T) => string;
}

function CadastroFinanceiro<T, F>({ config }: { config: ConfigDeCadastro<T, F> }) {
  const { filtros, definirFiltro } = useFiltrosNaUrl<'busca' | 'ativo' | 'pagina'>(['busca', 'ativo', 'pagina']);
  const editavel = podeEscrever(usePermissoes());
  const pagina = Number(filtros.pagina || 1);
  const acao = useAcao();

  const [modalAberto, definirModalAberto] = useState(false);
  const [editandoId, definirEditandoId] = useState<string | null>(null);
  const [formulario, definirFormulario] = useState<F>(config.formularioVazio);
  const [alternandoId, definirAlternandoId] = useState<string | null>(null);

  const requisicao = useRequisicao(
    (sinal) => config.listar({ busca: filtros.busca || undefined, ativo: filtros.ativo || undefined, pagina, porPagina: 50 }, sinal),
    [filtros.busca, filtros.ativo, pagina],
  );

  function abrirNovo() {
    definirEditandoId(null);
    definirFormulario(config.formularioVazio);
    definirModalAberto(true);
  }

  function abrirEdicao(item: T) {
    definirEditandoId(config.identificador(item));
    definirFormulario(config.paraFormulario(item));
    definirModalAberto(true);
  }

  async function salvar() {
    if (!config.valido(formulario)) return;
    const sucesso = await acao.executar(() =>
      editandoId ? config.atualizar(editandoId, formulario) : config.criar(formulario),
    );
    if (sucesso) {
      definirModalAberto(false);
      definirEditandoId(null);
      definirFormulario(config.formularioVazio);
      requisicao.recarregar();
    }
  }

  async function alternar(item: T) {
    definirAlternandoId(config.identificador(item));
    const sucesso = await acao.executar(() => config.alternarAtivo(item));
    definirAlternandoId(null);
    if (sucesso) requisicao.recarregar();
  }

  return (
    <>
      <CabecalhoDaPagina
        titulo={config.titulo}
        descricao={config.descricao}
        acoes={editavel ? <button type="button" className="botao botao--primario" onClick={abrirNovo}>+ {config.textoNovo}</button> : undefined}
      />
      <div className="corpo-da-pagina pilha">
        <Painel>
          <div className="filtros">
            <CampoDeTexto rotulo="Busca" valor={filtros.busca} aoMudar={(valor) => definirFiltro('busca', valor)} espacoReservado={config.buscaReservada} />
            <CampoDeSelecao rotulo="Situação" valor={filtros.ativo} opcoes={[{ valor: 'true', texto: 'Ativos' }, { valor: 'false', texto: 'Inativos' }]} aoMudar={(valor) => definirFiltro('ativo', valor)} textoVazio="Todos" />
          </div>
          {acao.erro && <div className="aviso aviso--erro">{acao.erro}</div>}
        </Painel>
        <Painel
          semPreenchimento
          rodape={requisicao.dados && <Paginacao pagina={requisicao.dados.pagina} totalDePaginas={requisicao.dados.totalDePaginas} total={requisicao.dados.total} aoMudarPagina={(valor) => definirFiltro('pagina', String(valor))} />}
        >
          <ConteudoDaRequisicao requisicao={requisicao} vazio={(dados) => dados.itens.length === 0} tituloDoVazio="Nenhum registro encontrado">
            {(dados) => (
              <div className="rolagem-horizontal">
                <table className="tabela">
                  <thead>
                    <tr>
                      {config.colunas.map((coluna) => (
                        <th key={coluna.titulo} className={coluna.numerico ? 'numerico' : undefined}>{coluna.titulo}</th>
                      ))}
                      <th>Situação</th>
                      {editavel && <th className="acoes">Ações</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {dados.itens.map((item) => {
                      const id = config.identificador(item);
                      const ativo = config.estaAtivo(item);
                      return (
                        <tr key={id}>
                          {config.colunas.map((coluna) => (
                            <td key={coluna.titulo} className={[coluna.numerico ? 'numerico' : '', coluna.larga ? 'celula-larga' : ''].filter(Boolean).join(' ') || undefined}>
                              {coluna.conteudo(item)}
                            </td>
                          ))}
                          <td><Selo texto={ativo ? 'Ativo' : 'Inativo'} tom={ativo ? 'ok' : 'neutro'} /></td>
                          {editavel && (
                            <td className="acoes">
                              <button type="button" className="botao botao--fantasma botao--pequeno" onClick={() => abrirEdicao(item)}>Editar</button>
                              <button type="button" className="botao botao--fantasma botao--pequeno" disabled={alternandoId === id} onClick={() => alternar(item)}>
                                {alternandoId === id ? '…' : ativo ? 'Desativar' : 'Ativar'}
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </ConteudoDaRequisicao>
        </Painel>
      </div>
      {modalAberto && (
        <Modal
          titulo={editandoId ? `Editar ${config.textoNovo.toLowerCase()}` : config.textoNovo}
          aoFechar={() => definirModalAberto(false)}
          rodape={
            <>
              <button type="button" className="botao" onClick={() => definirModalAberto(false)}>Cancelar</button>
              <button type="button" className="botao botao--primario" disabled={acao.emAndamento} onClick={() => void salvar()}>{acao.emAndamento ? 'Salvando…' : 'Salvar'}</button>
            </>
          }
        >
          <div className="pilha">{config.formulario(formulario, definirFormulario)}</div>
        </Modal>
      )}
    </>
  );
}

// ---------------------------------------------------------------- contas bancarias

interface FormContaBancaria {
  nome: string;
  instituicao: string;
  agencia: string;
  numero: string;
  saldoInicial: string;
}

export function ContasBancarias() {
  return (
    <CadastroFinanceiro<ContaBancaria, FormContaBancaria>
      config={{
        titulo: 'Contas bancárias',
        descricao: 'Contas usadas no controle de fluxo de caixa (Sicoob, Sicredi…).',
        textoNovo: 'Conta bancária',
        buscaReservada: 'Nome da conta',
        identificador: (item) => item.id,
        estaAtivo: (item) => item.ativa,
        listar: listarContasBancarias,
        colunas: [
          { titulo: 'Conta', larga: true, conteudo: (item) => item.nome },
          { titulo: 'Instituição', conteudo: (item) => item.instituicao ?? '—' },
          { titulo: 'Agência', conteudo: (item) => item.agencia ?? '—' },
          { titulo: 'Número', conteudo: (item) => item.numero ?? '—' },
          { titulo: 'Saldo inicial', numerico: true, conteudo: (item) => formatarDinheiro(item.saldoInicialCentavos) },
        ],
        formularioVazio: { nome: '', instituicao: '', agencia: '', numero: '', saldoInicial: '' },
        paraFormulario: (item) => ({ nome: item.nome, instituicao: item.instituicao ?? '', agencia: item.agencia ?? '', numero: item.numero ?? '', saldoInicial: paraReais(item.saldoInicialCentavos) }),
        valido: (form) => form.nome.trim().length > 0,
        criar: (form) => criarContaBancaria({ nome: form.nome, instituicao: form.instituicao || null, agencia: form.agencia || null, numero: form.numero || null, saldoInicialCentavos: paraCentavos(form.saldoInicial) }),
        atualizar: (id, form) => atualizarContaBancaria(id, { nome: form.nome, instituicao: form.instituicao || null, agencia: form.agencia || null, numero: form.numero || null, saldoInicialCentavos: paraCentavos(form.saldoInicial) }),
        alternarAtivo: (item) => atualizarContaBancaria(item.id, { ativa: !item.ativa }),
        formulario: (form, definir) => (
          <>
            <CampoDeTexto rotulo="Nome da conta" valor={form.nome} aoMudar={(valor) => definir({ ...form, nome: valor })} obrigatorio />
            <div className="grade grade--2">
              <CampoDeTexto rotulo="Instituição" valor={form.instituicao} aoMudar={(valor) => definir({ ...form, instituicao: valor })} />
              <CampoDeDinheiro rotulo="Saldo inicial" valor={form.saldoInicial} aoMudar={(valor) => definir({ ...form, saldoInicial: valor })} />
              <CampoDeTexto rotulo="Agência" valor={form.agencia} aoMudar={(valor) => definir({ ...form, agencia: valor })} />
              <CampoDeTexto rotulo="Número da conta" valor={form.numero} aoMudar={(valor) => definir({ ...form, numero: valor })} />
            </div>
          </>
        ),
      }}
    />
  );
}

// ------------------------------------------------------------------------- socios

interface FormSocio {
  nome: string;
  documento: string;
}

export function SociosAportadores() {
  return (
    <CadastroFinanceiro<SocioAportador, FormSocio>
      config={{
        titulo: 'Sócios (aportes)',
        descricao: 'Investidores que fazem aportes mensais de capital.',
        textoNovo: 'Sócio',
        buscaReservada: 'Nome do sócio',
        identificador: (item) => item.id,
        estaAtivo: (item) => item.ativo,
        listar: listarSocios,
        colunas: [
          { titulo: 'Sócio', larga: true, conteudo: (item) => item.nome },
          { titulo: 'Documento', conteudo: (item) => item.documento ?? '—' },
        ],
        formularioVazio: { nome: '', documento: '' },
        paraFormulario: (item) => ({ nome: item.nome, documento: item.documento ?? '' }),
        valido: (form) => form.nome.trim().length > 0,
        criar: (form) => criarSocio({ nome: form.nome, documento: form.documento || null }),
        atualizar: (id, form) => atualizarSocio(id, { nome: form.nome, documento: form.documento || null }),
        alternarAtivo: (item) => atualizarSocio(item.id, { ativo: !item.ativo }),
        formulario: (form, definir) => (
          <>
            <CampoDeTexto rotulo="Nome do sócio" valor={form.nome} aoMudar={(valor) => definir({ ...form, nome: valor })} obrigatorio />
            <CampoDeTexto rotulo="CPF/CNPJ (opcional)" valor={form.documento} aoMudar={(valor) => definir({ ...form, documento: valor })} />
          </>
        ),
      }}
    />
  );
}

// ------------------------------------------------------------------ empreendimentos

interface FormEmpreendimento {
  nome: string;
}

export function EmpreendimentosFinanceiros() {
  return (
    <CadastroFinanceiro<EmpreendimentoFinanceiro, FormEmpreendimento>
      config={{
        titulo: 'Empreendimentos',
        descricao: 'Centros de custo pelos quais as despesas são agrupadas (Sede, loteamentos).',
        textoNovo: 'Empreendimento',
        buscaReservada: 'Nome do empreendimento',
        identificador: (item) => item.id,
        estaAtivo: (item) => item.ativo,
        listar: listarEmpreendimentos,
        colunas: [
          { titulo: 'Empreendimento', larga: true, conteudo: (item) => item.nome },
          { titulo: 'Loteamento vinculado', conteudo: (item) => item.loteamento?.nome ?? '—' },
        ],
        formularioVazio: { nome: '' },
        paraFormulario: (item) => ({ nome: item.nome }),
        valido: (form) => form.nome.trim().length > 0,
        criar: (form) => criarEmpreendimento({ nome: form.nome }),
        atualizar: (id, form) => atualizarEmpreendimento(id, { nome: form.nome }),
        alternarAtivo: (item) => atualizarEmpreendimento(item.id, { ativo: !item.ativo }),
        formulario: (form, definir) => (
          <CampoDeTexto rotulo="Nome do empreendimento" valor={form.nome} aoMudar={(valor) => definir({ ...form, nome: valor })} obrigatorio />
        ),
      }}
    />
  );
}

// ------------------------------------------------------------------------ categorias

interface FormCategoria {
  nome: string;
  natureza: NaturezaFinanceira;
}

/** A direção (entrada/saída) decorre da natureza — o usuário não precisa escolher. */
function tipoDaNatureza(natureza: NaturezaFinanceira): TipoLancamentoFinanceiro {
  return natureza === 'RECEBIVEL_VENDA' || natureza === 'APORTE' ? 'ENTRADA' : 'SAIDA';
}

export function CategoriasFinanceiras() {
  return (
    <CadastroFinanceiro<CategoriaFinanceira, FormCategoria>
      config={{
        titulo: 'Categorias financeiras',
        descricao: 'Plano de rubricas de receita, aporte e despesa do fluxo de caixa.',
        textoNovo: 'Categoria',
        buscaReservada: 'Nome da categoria',
        identificador: (item) => item.id,
        estaAtivo: (item) => item.ativa,
        listar: listarCategorias,
        colunas: [
          { titulo: 'Categoria', larga: true, conteudo: (item) => item.nome },
          { titulo: 'Natureza', conteudo: (item) => NATUREZAS[item.natureza] },
          { titulo: 'Direção', conteudo: (item) => (item.tipo === 'ENTRADA' ? 'Entrada' : 'Saída') },
        ],
        formularioVazio: { nome: '', natureza: 'DESPESA_FIXA' },
        paraFormulario: (item) => ({ nome: item.nome, natureza: item.natureza }),
        valido: (form) => form.nome.trim().length > 0,
        criar: (form) => criarCategoria({ nome: form.nome, natureza: form.natureza, tipo: tipoDaNatureza(form.natureza) }),
        atualizar: (id, form) => atualizarCategoria(id, { nome: form.nome, natureza: form.natureza, tipo: tipoDaNatureza(form.natureza) }),
        alternarAtivo: (item) => atualizarCategoria(item.id, { ativa: !item.ativa }),
        formulario: (form, definir) => (
          <>
            <CampoDeTexto rotulo="Nome da categoria" valor={form.nome} aoMudar={(valor) => definir({ ...form, nome: valor })} obrigatorio />
            <CampoDeSelecao
              rotulo="Natureza"
              valor={form.natureza}
              opcoes={(Object.keys(NATUREZAS) as NaturezaFinanceira[]).map((chave) => ({ valor: chave, texto: NATUREZAS[chave] }))}
              aoMudar={(valor) => definir({ ...form, natureza: valor as NaturezaFinanceira })}
              textoVazio="Selecione"
            />
          </>
        ),
      }}
    />
  );
}
