import { useState } from 'react';
import { Modal } from '@/componentes/comuns/Modal';
import { CampoDeTexto } from '@/componentes/comuns/Campo';
import { AvisoDeErro } from '@/componentes/comuns/Estados';
import { useAcao } from '@/ganchos/useAcao';
import { aplicarReajuste } from '@/lib/api/contratos';
import { hojeIso } from '@/lib/datas';

interface Props {
  contratoId: string;
  aoFechar: () => void;
  aoConcluir: () => void;
}

export function ModalDeReajuste({ contratoId, aoFechar, aoConcluir }: Props) {
  const [indice, definirIndice] = useState('IGPM');
  const [percentual, definirPercentual] = useState('0');
  const [aPartirDe, definirAPartirDe] = useState(hojeIso);
  const acao = useAcao();

  async function confirmar() {
    const sucesso = await acao.executar(() =>
      aplicarReajuste(contratoId, {
        indice,
        percentual: Number(percentual.replace(',', '.')) || 0,
        aPartirDe,
      }),
    );
    if (sucesso) {
      aoConcluir();
      aoFechar();
    }
  }

  return (
    <Modal
      titulo="Aplicar reajuste"
      descricao="O reajuste incide sobre as parcelas com vencimento a partir da data informada"
      aoFechar={aoFechar}
      rodape={
        <>
          <button type="button" className="botao" onClick={aoFechar}>
            Cancelar
          </button>
          <button
            type="button"
            className="botao botao--primario"
            onClick={confirmar}
            disabled={acao.emAndamento}
          >
            {acao.emAndamento ? 'Aplicando…' : 'Aplicar reajuste'}
          </button>
        </>
      }
    >
      <AvisoDeErro mensagem={acao.erro} />
      <div className="grade grade--3">
        <CampoDeTexto rotulo="Índice" valor={indice} aoMudar={definirIndice} />
        <CampoDeTexto rotulo="Percentual (%)" valor={percentual} aoMudar={definirPercentual} />
        <CampoDeTexto
          rotulo="A partir de"
          tipo="date"
          valor={aPartirDe}
          aoMudar={definirAPartirDe}
        />
      </div>
    </Modal>
  );
}
