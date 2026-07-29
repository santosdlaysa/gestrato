import { useState } from 'react';
import { ModalDeConfirmacao } from '@/componentes/comuns/ModalDeConfirmacao';
import { useAcao } from '@/ganchos/useAcao';
import { cancelarContrato, distratarContrato, quitarContrato } from '@/lib/api/contratos';

type Operacao = 'quitar' | 'cancelar' | 'distratar';

const TEXTOS: Record<Operacao, { titulo: string; mensagem: string; botao: string }> = {
  quitar: {
    titulo: 'Quitar contrato',
    mensagem: 'A quitação só é aceita quando não há parcela em aberto. Deseja continuar?',
    botao: 'Quitar',
  },
  cancelar: {
    titulo: 'Cancelar contrato',
    mensagem: 'O cancelamento libera o lote para nova venda. Esta ação altera o status do contrato.',
    botao: 'Cancelar contrato',
  },
  distratar: {
    titulo: 'Distratar contrato',
    mensagem: 'O distrato encerra o contrato e libera o lote. Confirma o distrato?',
    botao: 'Distratar',
  },
};

const EXECUTORES: Record<Operacao, (id: string) => Promise<unknown>> = {
  quitar: quitarContrato,
  cancelar: cancelarContrato,
  distratar: distratarContrato,
};

interface Props {
  contratoId: string;
  permitido: boolean;
  podeRenegociar: boolean;
  aoAtualizar: () => void;
  aoAbrirReajuste: () => void;
  aoAbrirRenegociacao: () => void;
}

export function AcoesDoContrato({
  contratoId,
  permitido,
  podeRenegociar,
  aoAtualizar,
  aoAbrirReajuste,
  aoAbrirRenegociacao,
}: Props) {
  const [operacao, definirOperacao] = useState<Operacao | null>(null);
  const acao = useAcao();

  if (!permitido) return null;

  async function confirmar() {
    if (!operacao) return;
    const sucesso = await acao.executar(() => EXECUTORES[operacao](contratoId));
    if (sucesso) {
      definirOperacao(null);
      aoAtualizar();
    }
  }

  return (
    <>
      {podeRenegociar && (
        <button type="button" className="botao botao--primario" onClick={aoAbrirRenegociacao}>
          Renegociar
        </button>
      )}
      <button type="button" className="botao" onClick={aoAbrirReajuste}>
        Reajuste
      </button>
      <button type="button" className="botao" onClick={() => definirOperacao('quitar')}>
        Quitar
      </button>
      <button type="button" className="botao" onClick={() => definirOperacao('distratar')}>
        Distratar
      </button>
      <button type="button" className="botao botao--perigo" onClick={() => definirOperacao('cancelar')}>
        Cancelar
      </button>

      {operacao && (
        <ModalDeConfirmacao
          titulo={TEXTOS[operacao].titulo}
          mensagem={TEXTOS[operacao].mensagem}
          textoDeConfirmacao={TEXTOS[operacao].botao}
          perigo={operacao !== 'quitar'}
          emAndamento={acao.emAndamento}
          erro={acao.erro}
          aoFechar={() => definirOperacao(null)}
          aoConfirmar={confirmar}
        />
      )}
    </>
  );
}
