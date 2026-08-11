import { useState } from 'react';
import { CabecalhoDaPagina } from '@/componentes/layout/CabecalhoDaPagina';
import { Painel } from '@/componentes/comuns/Painel';
import { Modal } from '@/componentes/comuns/Modal';
import { ConteudoDaRequisicao } from '@/componentes/comuns/ConteudoDaRequisicao';
import { Paginacao } from '@/componentes/comuns/Paginacao';
import { CampoDeDinheiro, CampoDeSelecao, CampoDeTexto } from '@/componentes/comuns/Campo';
import { Selo } from '@/componentes/comuns/Selo';
import { useFiltrosNaUrl } from '@/ganchos/useFiltrosNaUrl';
import { useRequisicao } from '@/ganchos/useRequisicao';
import { useAcao } from '@/ganchos/useAcao';
import { usePermissoes } from '@/contextos/AutenticacaoContexto';
import { podeEscrever } from '@/lib/permissoes';
import { formatarData, formatarDinheiro, rotularEnum } from '@/lib/formato';
import { baixarContaAPagar, criarContaAPagar, listarContasAPagar, listarFornecedores } from '@/lib/api/contas-a-pagar';
import type { ContaAPagar, StatusContaAPagar } from '@/tipos/contas-a-pagar';

const STATUS = [
  { valor: 'PENDENTE', texto: 'Pendentes' },
  { valor: 'PAGA_PARCIAL', texto: 'Pagas parcialmente' },
  { valor: 'PAGA', texto: 'Pagas' },
  { valor: 'CANCELADA', texto: 'Canceladas' },
];
const FORMAS = [
  { valor: 'TRANSFERENCIA', texto: 'Transferência' },
  { valor: 'PIX', texto: 'Pix' },
  { valor: 'BOLETO', texto: 'Boleto' },
  { valor: 'DINHEIRO', texto: 'Dinheiro' },
  { valor: 'CARTAO', texto: 'Cartão' },
  { valor: 'CHEQUE', texto: 'Cheque' },
  { valor: 'PERMUTA', texto: 'Permuta' },
];

function tom(status: StatusContaAPagar): 'ok' | 'atencao' | 'vencido' | 'neutro' {
  if (status === 'PAGA') return 'ok';
  if (status === 'PAGA_PARCIAL') return 'atencao';
  if (status === 'CANCELADA') return 'neutro';
  return 'vencido';
}

function centavos(valor: string): number {
  const normalizado = valor.trim().replace(/\./g, '').replace(',', '.');
  return Math.round(Number(normalizado) * 100);
}

interface Formulario {
  fornecedorId: string;
  numeroDocumento: string;
  descricao: string;
  valor: string;
  vencimento: string;
  formaPagamento: string;
  observacoes: string;
}

const FORMULARIO_VAZIO: Formulario = { fornecedorId: '', numeroDocumento: '', descricao: '', valor: '', vencimento: '', formaPagamento: 'TRANSFERENCIA', observacoes: '' };

export function ContasAPagar({ somentePagas = false }: { somentePagas?: boolean }) {
  const { filtros, definirFiltro } = useFiltrosNaUrl<'busca' | 'status' | 'fornecedorId' | 'de' | 'ate' | 'pagina'>(['busca', 'status', 'fornecedorId', 'de', 'ate', 'pagina']);
  const editavel = podeEscrever(usePermissoes());
  const [modalAberto, definirModalAberto] = useState(false);
  const [formulario, definirFormulario] = useState<Formulario>(FORMULARIO_VAZIO);
  const pagina = Number(filtros.pagina || 1);
  const acao = useAcao();
  const requisicao = useRequisicao(
    (sinal) => listarContasAPagar({ busca: filtros.busca || undefined, status: somentePagas ? 'PAGA' : (filtros.status as StatusContaAPagar | undefined), fornecedorId: filtros.fornecedorId || undefined, de: filtros.de || undefined, ate: filtros.ate || undefined, pagina, porPagina: 25 }, sinal),
    [filtros.busca, filtros.status, filtros.fornecedorId, filtros.de, filtros.ate, pagina, somentePagas],
  );
  const fornecedores = useRequisicao((sinal) => listarFornecedores({ porPagina: 100 }, sinal), []);
  const [baixandoId, definirBaixandoId] = useState<string | null>(null);

  async function salvar() {
    const valorCentavos = centavos(formulario.valor);
    if (!formulario.descricao.trim() || !formulario.vencimento || !Number.isFinite(valorCentavos) || valorCentavos <= 0) return;
    const sucesso = await acao.executar(() => criarContaAPagar({ fornecedorId: formulario.fornecedorId || null, numeroDocumento: formulario.numeroDocumento || null, descricao: formulario.descricao, valorOriginalCentavos: valorCentavos, vencimento: formulario.vencimento, formaPagamento: formulario.formaPagamento || null, observacoes: formulario.observacoes || null }));
    if (sucesso) { definirModalAberto(false); definirFormulario(FORMULARIO_VAZIO); requisicao.recarregar(); }
  }

  async function baixar(conta: ContaAPagar) {
    const saldo = Math.max(0, conta.valorOriginalCentavos - conta.valorPagoCentavos);
    definirBaixandoId(conta.id);
    const sucesso = await acao.executar(() => baixarContaAPagar(conta.id, { valorCentavos: saldo, pagoEm: new Date().toISOString().slice(0, 10), formaPagamento: conta.formaPagamento ?? 'TRANSFERENCIA' }));
    definirBaixandoId(null);
    if (sucesso) requisicao.recarregar();
  }

  return (
    <>
      <CabecalhoDaPagina titulo={somentePagas ? 'Pagamentos' : 'Contas a pagar'} descricao={somentePagas ? 'Contas totalmente pagas, consultadas pela API real de contas a pagar.' : 'Obrigações financeiras da loteadora, fornecedores e prestadores.'} acoes={!somentePagas && editavel ? <button type="button" className="botao botao--primario" onClick={() => definirModalAberto(true)}>+ Nova conta</button> : undefined} />
      <div className="corpo-da-pagina pilha">
        <Painel>
          <div className="filtros">
            <CampoDeTexto rotulo="Busca" valor={filtros.busca} aoMudar={(valor) => definirFiltro('busca', valor)} espacoReservado="Documento, descrição ou fornecedor" />
            <CampoDeSelecao rotulo="Fornecedor" valor={filtros.fornecedorId} opcoes={(fornecedores.dados?.itens ?? []).filter((item) => item.ativo).map((item) => ({ valor: item.id, texto: item.nome }))} aoMudar={(valor) => definirFiltro('fornecedorId', valor)} textoVazio="Todos" />
            {!somentePagas && <CampoDeSelecao rotulo="Situação" valor={filtros.status} opcoes={STATUS} aoMudar={(valor) => definirFiltro('status', valor)} textoVazio="Todas" />}
            <CampoDeTexto rotulo="Vencimento a partir de" tipo="date" valor={filtros.de} aoMudar={(valor) => definirFiltro('de', valor)} />
            <CampoDeTexto rotulo="Vencimento até" tipo="date" valor={filtros.ate} aoMudar={(valor) => definirFiltro('ate', valor)} />
          </div>
          {acao.erro && <div className="aviso aviso--erro">{acao.erro}</div>}
        </Painel>
        <Painel titulo={somentePagas ? 'Contas com pagamento registrado' : 'Obrigações'} semPreenchimento rodape={requisicao.dados && <Paginacao pagina={requisicao.dados.pagina} totalDePaginas={requisicao.dados.totalDePaginas} total={requisicao.dados.total} aoMudarPagina={(valor) => definirFiltro('pagina', String(valor))} />}>
          <ConteudoDaRequisicao requisicao={requisicao} vazio={(dados) => dados.itens.length === 0} tituloDoVazio={somentePagas ? 'Nenhum pagamento encontrado' : 'Nenhuma conta encontrada'}>
            {(dados) => <div className="rolagem-horizontal"><table className="tabela"><thead><tr><th>Fornecedor</th><th>Documento</th><th>Descrição</th><th>Vencimento</th><th className="numerico">Valor</th><th>Situação</th><th className="acoes">Ações</th></tr></thead><tbody>
              {dados.itens.map((conta) => { const saldo = Math.max(0, conta.valorOriginalCentavos - conta.valorPagoCentavos); return <tr key={conta.id}><td className="celula-larga">{conta.fornecedor?.nome ?? 'Fornecedor não identificado'}</td><td>{conta.numeroDocumento ?? '—'}</td><td>{conta.descricao ?? '—'}</td><td>{formatarData(conta.vencimento)}</td><td className="numerico">{formatarDinheiro(conta.valorOriginalCentavos)}</td><td><Selo texto={rotularEnum(conta.status)} tom={tom(conta.status)} /></td><td className="acoes">{editavel && conta.status !== 'PAGA' && conta.status !== 'CANCELADA' && <button type="button" className="botao botao--fantasma botao--pequeno" disabled={baixandoId === conta.id || saldo <= 0} onClick={() => baixar(conta)}>{baixandoId === conta.id ? 'Baixando…' : `Baixar ${formatarDinheiro(saldo)}`}</button>}</td></tr>; })}
            </tbody></table></div>}
          </ConteudoDaRequisicao>
        </Painel>
      </div>
      {!somentePagas && modalAberto && <Modal titulo="Nova conta a pagar" descricao="Cadastre a obrigação e vincule-a a um fornecedor." aoFechar={() => definirModalAberto(false)} rodape={<><button type="button" className="botao" onClick={() => definirModalAberto(false)}>Cancelar</button><button type="button" className="botao botao--primario" disabled={acao.emAndamento} onClick={() => void salvar()}>{acao.emAndamento ? 'Salvando…' : 'Salvar conta'}</button></>}>
        <div className="pilha"><CampoDeSelecao rotulo="Fornecedor" valor={formulario.fornecedorId} opcoes={(fornecedores.dados?.itens ?? []).filter((item) => item.ativo).map((item) => ({ valor: item.id, texto: item.nome }))} aoMudar={(valor) => definirFormulario({ ...formulario, fornecedorId: valor })} textoVazio="Sem fornecedor" /><div className="grade grade--2"><CampoDeTexto rotulo="Descrição" valor={formulario.descricao} aoMudar={(valor) => definirFormulario({ ...formulario, descricao: valor })} obrigatorio /><CampoDeTexto rotulo="Documento" valor={formulario.numeroDocumento} aoMudar={(valor) => definirFormulario({ ...formulario, numeroDocumento: valor })} /><CampoDeDinheiro rotulo="Valor original" valor={formulario.valor} aoMudar={(valor) => definirFormulario({ ...formulario, valor })} /><CampoDeTexto rotulo="Vencimento" tipo="date" valor={formulario.vencimento} aoMudar={(valor) => definirFormulario({ ...formulario, vencimento: valor })} obrigatorio /><CampoDeSelecao rotulo="Forma de pagamento" valor={formulario.formaPagamento} opcoes={FORMAS} aoMudar={(valor) => definirFormulario({ ...formulario, formaPagamento: valor })} /><CampoDeTexto rotulo="Observações" valor={formulario.observacoes} aoMudar={(valor) => definirFormulario({ ...formulario, observacoes: valor })} /></div></div>
      </Modal>}
    </>
  );
}
