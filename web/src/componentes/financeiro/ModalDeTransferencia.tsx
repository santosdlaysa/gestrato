import { useState } from 'react';
import { Modal } from '@/componentes/comuns/Modal';
import { CampoDeDinheiro, CampoDeSelecao, CampoDeTexto, type Opcao } from '@/componentes/comuns/Campo';
import { AvisoDeErro } from '@/componentes/comuns/Estados';
import { useAcao } from '@/ganchos/useAcao';
import { criarTransferencia } from '@/lib/api/fluxo-de-caixa';

function centavos(valor: string): number {
  const normalizado = valor.trim().replace(/\./g, '').replace(',', '.');
  return Math.round(Number(normalizado) * 100);
}

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

interface Props {
  contas: Opcao[];
  aoFechar: () => void;
  aoConcluir: () => void;
}

/**
 * Transferência entre contas: uma saída na origem e uma entrada no destino, com
 * o mesmo valor. O backend cria as duas pernas juntas; aqui só coletamos os dados.
 */
export function ModalDeTransferencia({ contas, aoFechar, aoConcluir }: Props) {
  const [contaOrigemId, definirOrigem] = useState(contas[0]?.valor ?? '');
  const [contaDestinoId, definirDestino] = useState(contas[1]?.valor ?? '');
  const [data, definirData] = useState(hoje());
  const [valor, definirValor] = useState('');
  const [descricao, definirDescricao] = useState('');
  const acao = useAcao();

  const valorCentavos = centavos(valor);
  const mesmaConta = Boolean(contaOrigemId) && contaOrigemId === contaDestinoId;
  const valido = Boolean(contaOrigemId) && Boolean(contaDestinoId) && !mesmaConta && Boolean(data) && Number.isFinite(valorCentavos) && valorCentavos > 0;

  async function salvar() {
    if (!valido) return;
    const sucesso = await acao.executar(() =>
      criarTransferencia({
        contaOrigemId,
        contaDestinoId,
        data,
        valorCentavos,
        descricao: descricao.trim() || null,
      }),
    );
    if (sucesso) {
      aoConcluir();
      aoFechar();
    }
  }

  return (
    <Modal
      titulo="Nova transferência"
      descricao="Move um valor de uma conta para outra, gerando a saída e a entrada correspondentes."
      aoFechar={aoFechar}
      rodape={
        <>
          <button type="button" className="botao" onClick={aoFechar}>Cancelar</button>
          <button type="button" className="botao botao--primario" disabled={acao.emAndamento || !valido} onClick={() => void salvar()}>
            {acao.emAndamento ? 'Transferindo…' : 'Transferir'}
          </button>
        </>
      }
    >
      <AvisoDeErro mensagem={acao.erro} />
      <div className="pilha">
        <div className="grade grade--2">
          <CampoDeSelecao rotulo="Conta de origem" valor={contaOrigemId} opcoes={contas} aoMudar={definirOrigem} textoVazio="Selecione" />
          <CampoDeSelecao rotulo="Conta de destino" valor={contaDestinoId} opcoes={contas} aoMudar={definirDestino} textoVazio="Selecione" />
          <CampoDeDinheiro rotulo="Valor" valor={valor} aoMudar={definirValor} />
          <CampoDeTexto rotulo="Data" tipo="date" valor={data} aoMudar={definirData} obrigatorio />
        </div>
        <CampoDeTexto rotulo="Descrição" valor={descricao} aoMudar={definirDescricao} espacoReservado="Transferência entre contas" />
        {mesmaConta && <p className="texto-auxiliar" style={{ color: 'var(--cor-vencido, #b91c1c)' }}>A origem e o destino devem ser diferentes.</p>}
      </div>
    </Modal>
  );
}
