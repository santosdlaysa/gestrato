import { useState } from 'react';
import { Modal } from '@/componentes/comuns/Modal';
import { CampoDeSelecao, CampoDeTexto } from '@/componentes/comuns/Campo';
import { AvisoDeErro } from '@/componentes/comuns/Estados';
import { useAcao } from '@/ganchos/useAcao';
import { cobrarAgora } from '@/lib/api/parcelas';
import { rotuloDoCanal } from '@/lib/rotulos';
import { formatarData } from '@/lib/formato';
import { nomeDoCliente, numeroDoContrato } from '@/lib/parcela';
import { CANAIS } from '@/tipos/cobranca';
import type { ParcelaDeCobranca } from '@/tipos/parcela';

interface Props {
  parcela: ParcelaDeCobranca;
  aoFechar: () => void;
  aoConcluir: () => void;
}

const OPCOES_DE_CANAL = CANAIS.map((canal) => ({ valor: canal, texto: rotuloDoCanal(canal) }));

export function ModalDeCobranca({ parcela, aoFechar, aoConcluir }: Props) {
  const [canal, definirCanal] = useState('');
  const [modelo, definirModelo] = useState('');
  const acao = useAcao();

  async function enviar() {
    const sucesso = await acao.executar(() => cobrarAgora(parcela.id, canal, modelo.trim()));
    if (sucesso) aoConcluir();
  }

  return (
    <Modal
      titulo="Enviar cobrança"
      descricao={`Parcela ${parcela.numero} · Contrato ${numeroDoContrato(parcela)} · vence em ${formatarData(parcela.vencimento)}`}
      aoFechar={aoFechar}
      rodape={
        <>
          <button type="button" className="botao" onClick={aoFechar} disabled={acao.emAndamento}>
            Cancelar
          </button>
          <button
            type="button"
            className="botao botao--primario"
            onClick={enviar}
            disabled={acao.emAndamento}
          >
            {acao.emAndamento ? 'Enviando…' : 'Enviar agora'}
          </button>
        </>
      }
    >
      <AvisoDeErro mensagem={acao.erro} />
      <div className="aviso aviso--info">
        Destinatário: <strong>{nomeDoCliente(parcela)}</strong>. Sem canal informado, a API usa o
        canal padrão do cliente.
      </div>
      <CampoDeSelecao
        rotulo="Canal"
        valor={canal}
        opcoes={OPCOES_DE_CANAL}
        aoMudar={definirCanal}
        textoVazio="Padrão do cliente"
      />
      <CampoDeTexto
        rotulo="Modelo de mensagem"
        valor={modelo}
        aoMudar={definirModelo}
        espacoReservado="Chave do modelo (opcional)"
        dica="Deixe em branco para usar o modelo padrão da situação da parcela."
      />
    </Modal>
  );
}
