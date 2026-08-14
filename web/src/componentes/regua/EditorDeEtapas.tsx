import { EtapaDaRegua } from './EtapaDaRegua';
import { EstadoVazio } from '@/componentes/comuns/Estados';
import type { EventoDaRegua, ModeloDeMensagem } from '@/tipos/cobranca';

interface Props {
  eventos: EventoDaRegua[];
  modelos: ModeloDeMensagem[];
  somenteLeitura: boolean;
  aoMudar: (eventos: EventoDaRegua[]) => void;
}

const ETAPA_NOVA: EventoDaRegua = {
  gatilho: 'ANTES_DO_VENCIMENTO',
  dias: 3,
  canais: ['WHATSAPP'],
  modelo: '',
  ativo: true,
  emitirDocumento: true,
  tipoDeDocumento: 'BOLETO_COM_PIX',
};

export const EXPLICACAO_DO_DOCUMENTO =
  'Com "Emitir boleto/Pix junto" ligado, a régua garante que exista um documento com o valor ' +
  'atualizado antes de mandar a mensagem — é o que faz {{linhaDigitavel}} e {{pix}} chegarem ' +
  'preenchidos ao cliente. Desligada, a mensagem sai sem meio de pagamento.';

export function EditorDeEtapas({ eventos, modelos, somenteLeitura, aoMudar }: Props) {
  function substituir(indice: number, evento: EventoDaRegua) {
    aoMudar(eventos.map((atual, posicao) => (posicao === indice ? evento : atual)));
  }

  function remover(indice: number) {
    aoMudar(eventos.filter((_, posicao) => posicao !== indice));
  }

  return (
    <div className="pilha" style={{ gap: 10 }}>
      {eventos.length === 0 && (
        <EstadoVazio
          titulo="Nenhuma etapa"
          descricao="Adicione a primeira etapa da régua de cobrança."
        />
      )}

      {eventos.map((evento, indice) => (
        <EtapaDaRegua
          key={indice}
          evento={evento}
          modelos={modelos}
          somenteLeitura={somenteLeitura}
          aoMudar={(atualizado) => substituir(indice, atualizado)}
          aoRemover={() => remover(indice)}
        />
      ))}

      {!somenteLeitura && (
        <div>
          <button
            type="button"
            className="botao"
            onClick={() => aoMudar([...eventos, { ...ETAPA_NOVA }])}
          >
            + Adicionar etapa
          </button>
        </div>
      )}
    </div>
  );
}
