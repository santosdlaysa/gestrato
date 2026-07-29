import { Modal } from './Modal';
import { AvisoDeErro } from './Estados';

interface Props {
  titulo: string;
  mensagem: string;
  textoDeConfirmacao?: string;
  perigo?: boolean;
  emAndamento?: boolean;
  erro?: string | null;
  aoFechar: () => void;
  aoConfirmar: () => void;
}

export function ModalDeConfirmacao({
  titulo,
  mensagem,
  textoDeConfirmacao = 'Confirmar',
  perigo = false,
  emAndamento = false,
  erro = null,
  aoFechar,
  aoConfirmar,
}: Props) {
  return (
    <Modal
      titulo={titulo}
      aoFechar={aoFechar}
      rodape={
        <>
          <button type="button" className="botao" onClick={aoFechar} disabled={emAndamento}>
            Cancelar
          </button>
          <button
            type="button"
            className={perigo ? 'botao botao--perigo' : 'botao botao--primario'}
            onClick={aoConfirmar}
            disabled={emAndamento}
          >
            {emAndamento ? 'Processando…' : textoDeConfirmacao}
          </button>
        </>
      }
    >
      <AvisoDeErro mensagem={erro} />
      <p>{mensagem}</p>
    </Modal>
  );
}
