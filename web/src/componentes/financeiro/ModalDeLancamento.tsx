import { useMemo, useState } from 'react';
import { Modal } from '@/componentes/comuns/Modal';
import { CampoDeDinheiro, CampoDeSelecao, CampoDeTexto, type Opcao } from '@/componentes/comuns/Campo';
import { AvisoDeErro } from '@/componentes/comuns/Estados';
import { useAcao } from '@/ganchos/useAcao';
import { atualizarLancamento, criarLancamento } from '@/lib/api/fluxo-de-caixa';
import type { CategoriaFinanceira, FormaPagamento, LancamentoFinanceiro, TipoLancamentoFinanceiro } from '@/tipos/fluxo-de-caixa';

const TIPOS: Opcao[] = [
  { valor: 'SAIDA', texto: 'Saída (despesa)' },
  { valor: 'ENTRADA', texto: 'Entrada (recebimento/aporte)' },
];
const FORMAS: Opcao[] = [
  { valor: 'PIX', texto: 'Pix' },
  { valor: 'TRANSFERENCIA', texto: 'Transferência' },
  { valor: 'BOLETO', texto: 'Boleto' },
  { valor: 'DINHEIRO', texto: 'Dinheiro' },
  { valor: 'CARTAO', texto: 'Cartão' },
  { valor: 'CHEQUE', texto: 'Cheque' },
  { valor: 'PERMUTA', texto: 'Permuta' },
];

/** "1.234,56" → 123456. Sem ponto flutuante no valor de negócio. */
function centavos(valor: string): number {
  const normalizado = valor.trim().replace(/\./g, '').replace(',', '.');
  return Math.round(Number(normalizado) * 100);
}

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

interface Props {
  lancamento: LancamentoFinanceiro | null;
  contas: Opcao[];
  categorias: CategoriaFinanceira[];
  empreendimentos: Opcao[];
  socios: Opcao[];
  aoFechar: () => void;
  aoConcluir: () => void;
}

export function ModalDeLancamento({ lancamento, contas, categorias, empreendimentos, socios, aoFechar, aoConcluir }: Props) {
  const [tipo, definirTipo] = useState<TipoLancamentoFinanceiro>(lancamento?.tipo ?? 'SAIDA');
  const [categoriaId, definirCategoria] = useState(lancamento?.categoriaId ?? '');
  const [contaBancariaId, definirConta] = useState(lancamento?.contaBancariaId ?? contas[0]?.valor ?? '');
  const [empreendimentoFinanceiroId, definirEmpreendimento] = useState(lancamento?.empreendimentoFinanceiroId ?? '');
  const [socioAportadorId, definirSocio] = useState(lancamento?.socioAportadorId ?? '');
  const [data, definirData] = useState(lancamento?.data?.slice(0, 10) ?? hoje());
  const [valor, definirValor] = useState(
    lancamento ? String(lancamento.valorCentavos / 100).replace('.', ',') : '',
  );
  const [numeroDocumento, definirDocumento] = useState(lancamento?.numeroDocumento ?? '');
  const [formaPagamento, definirForma] = useState<string>(lancamento?.formaPagamento ?? 'PIX');
  const [observacoes, definirObservacoes] = useState(lancamento?.observacoes ?? '');
  const acao = useAcao();

  // A categoria já diz se é entrada ou saída — só listamos as do tipo escolhido,
  // e trocar de tipo limpa uma categoria que não pertence mais àquele lado.
  const opcoesDeCategoria = useMemo<Opcao[]>(
    () => categorias.filter((c) => c.tipo === tipo && c.ativa).map((c) => ({ valor: c.id, texto: c.nome })),
    [categorias, tipo],
  );

  function trocarTipo(novo: string) {
    const proximo = novo === 'ENTRADA' ? 'ENTRADA' : 'SAIDA';
    definirTipo(proximo);
    if (categoriaId && !categorias.some((c) => c.id === categoriaId && c.tipo === proximo)) {
      definirCategoria('');
    }
  }

  const valorCentavos = centavos(valor);
  const valido = Boolean(contaBancariaId) && Boolean(data) && Number.isFinite(valorCentavos) && valorCentavos > 0 && descricaoValida();

  function descricaoValida(): boolean {
    // A descrição pode vir da categoria escolhida; exigimos ao menos uma das duas.
    return Boolean(categoriaId) || observacoes.trim().length > 0;
  }

  function descricao(): string {
    const nomeCategoria = categorias.find((c) => c.id === categoriaId)?.nome;
    return (observacoes.trim() || nomeCategoria || 'Lançamento').slice(0, 200);
  }

  async function salvar() {
    if (!valido) return;
    const corpo = {
      tipo,
      data,
      valorCentavos,
      descricao: descricao(),
      numeroDocumento: numeroDocumento.trim() || null,
      formaPagamento: (formaPagamento || null) as FormaPagamento | null,
      contaBancariaId,
      categoriaId: categoriaId || null,
      empreendimentoFinanceiroId: empreendimentoFinanceiroId || null,
      socioAportadorId: socioAportadorId || null,
      observacoes: observacoes.trim() || null,
    };
    const sucesso = await acao.executar(() =>
      lancamento ? atualizarLancamento(lancamento.id, corpo) : criarLancamento(corpo),
    );
    if (sucesso) {
      aoConcluir();
      aoFechar();
    }
  }

  return (
    <Modal
      titulo={lancamento ? 'Editar lançamento' : 'Novo lançamento'}
      descricao="Uma entrada ou saída efetiva numa conta. O saldo é recalculado a partir dos lançamentos."
      aoFechar={aoFechar}
      rodape={
        <>
          <button type="button" className="botao" onClick={aoFechar}>Cancelar</button>
          <button type="button" className="botao botao--primario" disabled={acao.emAndamento || !valido} onClick={() => void salvar()}>
            {acao.emAndamento ? 'Salvando…' : 'Salvar lançamento'}
          </button>
        </>
      }
    >
      <AvisoDeErro mensagem={acao.erro} />
      <div className="pilha">
        <div className="grade grade--2">
          <CampoDeSelecao rotulo="Tipo" valor={tipo} opcoes={TIPOS} aoMudar={trocarTipo} />
          <CampoDeSelecao rotulo="Categoria" valor={categoriaId} opcoes={opcoesDeCategoria} aoMudar={definirCategoria} textoVazio="Sem categoria" />
          <CampoDeSelecao rotulo="Conta bancária" valor={contaBancariaId} opcoes={contas} aoMudar={definirConta} textoVazio="Selecione" />
          <CampoDeSelecao rotulo="Empreendimento" valor={empreendimentoFinanceiroId} opcoes={empreendimentos} aoMudar={definirEmpreendimento} textoVazio="Nenhum" />
          <CampoDeDinheiro rotulo="Valor" valor={valor} aoMudar={definirValor} />
          <CampoDeTexto rotulo="Data" tipo="date" valor={data} aoMudar={definirData} obrigatorio />
          <CampoDeSelecao rotulo="Forma de pagamento" valor={formaPagamento} opcoes={FORMAS} aoMudar={definirForma} textoVazio="—" />
          <CampoDeTexto rotulo="Documento" valor={numeroDocumento} aoMudar={definirDocumento} />
          {tipo === 'ENTRADA' && (
            <CampoDeSelecao rotulo="Sócio (aporte)" valor={socioAportadorId} opcoes={socios} aoMudar={definirSocio} textoVazio="Nenhum" />
          )}
        </div>
        <CampoDeTexto rotulo="Descrição / observação" valor={observacoes} aoMudar={definirObservacoes} espacoReservado="Ex.: Energia elétrica — sede" />
      </div>
    </Modal>
  );
}
