import { CampoDeSelecao, CampoDeTexto } from '@/componentes/comuns/Campo';
import { rotuloDoCanal, rotuloDoTipoDeDocumento } from '@/lib/rotulos';
import { CANAIS, GATILHOS } from '@/tipos/cobranca';
import type { Canal, EventoDaRegua, GatilhoDaRegua } from '@/tipos/cobranca';
import { TIPOS_DE_DOCUMENTO } from '@/tipos/parcela';
import type { TipoDeDocumento } from '@/tipos/parcela';

const OPCOES_DE_DOCUMENTO = TIPOS_DE_DOCUMENTO.map((tipo) => ({
  valor: tipo,
  texto: rotuloDoTipoDeDocumento(tipo),
}));

const OPCOES_DE_GATILHO = GATILHOS.map((gatilho) => ({
  valor: gatilho,
  texto:
    gatilho === 'ANTES_DO_VENCIMENTO'
      ? 'Antes do vencimento'
      : gatilho === 'NO_VENCIMENTO'
        ? 'No vencimento'
        : 'Após o vencimento',
}));

interface Props {
  evento: EventoDaRegua;
  somenteLeitura: boolean;
  aoMudar: (evento: EventoDaRegua) => void;
  aoRemover: () => void;
}

export function EtapaDaRegua({ evento, somenteLeitura, aoMudar, aoRemover }: Props) {
  function alternarCanal(canal: Canal) {
    const ativos = evento.canais.includes(canal)
      ? evento.canais.filter((atual) => atual !== canal)
      : [...evento.canais, canal];
    aoMudar({ ...evento, canais: ativos });
  }

  return (
    <div className="painel" style={{ padding: 12 }}>
      <div className="grade grade--4" style={{ alignItems: 'end' }}>
        <CampoDeSelecao
          rotulo="Gatilho"
          valor={evento.gatilho}
          opcoes={OPCOES_DE_GATILHO}
          aoMudar={(valor) => aoMudar({ ...evento, gatilho: valor as GatilhoDaRegua })}
          textoVazio="Selecione"
          desabilitado={somenteLeitura}
        />
        <CampoDeTexto
          rotulo="Dias"
          tipo="number"
          valor={String(evento.dias)}
          aoMudar={(valor) => aoMudar({ ...evento, dias: Number(valor) || 0 })}
          desabilitado={somenteLeitura || evento.gatilho === 'NO_VENCIMENTO'}
        />
        <CampoDeTexto
          rotulo="Modelo"
          valor={evento.modelo}
          aoMudar={(valor) => aoMudar({ ...evento, modelo: valor })}
          espacoReservado="chave-do-modelo"
          desabilitado={somenteLeitura}
        />
        <div className="campo">
          <span className="campo__rotulo">Canais</span>
          <div className="linha">
            {CANAIS.map((canal) => (
              <label key={canal} className="linha" style={{ gap: 4 }}>
                <input
                  type="checkbox"
                  checked={evento.canais.includes(canal)}
                  disabled={somenteLeitura}
                  onChange={() => alternarCanal(canal)}
                />
                {rotuloDoCanal(canal)}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="grade grade--2" style={{ marginTop: 10, alignItems: 'end' }}>
        <label className="linha" style={{ gap: 6 }}>
          <input
            type="checkbox"
            checked={evento.emitirDocumento}
            disabled={somenteLeitura}
            onChange={() => aoMudar({ ...evento, emitirDocumento: !evento.emitirDocumento })}
          />
          Emitir boleto/Pix junto
        </label>
        <CampoDeSelecao
          rotulo="Tipo do documento"
          valor={evento.tipoDeDocumento}
          opcoes={OPCOES_DE_DOCUMENTO}
          aoMudar={(valor) => aoMudar({ ...evento, tipoDeDocumento: valor as TipoDeDocumento })}
          textoVazio="Selecione"
          desabilitado={somenteLeitura || !evento.emitirDocumento}
        />
      </div>

      <div className="linha linha--entre" style={{ marginTop: 10 }}>
        <label className="linha" style={{ gap: 6 }}>
          <input
            type="checkbox"
            checked={evento.ativo}
            disabled={somenteLeitura}
            onChange={() => aoMudar({ ...evento, ativo: !evento.ativo })}
          />
          Etapa ativa
        </label>
        {!somenteLeitura && (
          <button type="button" className="botao botao--pequeno" onClick={aoRemover}>
            Remover etapa
          </button>
        )}
      </div>
    </div>
  );
}
