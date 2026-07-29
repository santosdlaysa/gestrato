import { EstadoVazio } from '@/componentes/comuns/Estados';
import { Selo } from '@/componentes/comuns/Selo';
import { rotuloDoCanal, rotuloDoGatilho, rotuloDoTipoDeDocumento } from '@/lib/rotulos';
import type { EventoDaRegua } from '@/tipos/cobranca';

function rotuloDoDocumento(evento: EventoDaRegua): string {
  if (!evento.emitirDocumento) return 'sem documento';
  return `com ${rotuloDoTipoDeDocumento(evento.tipoDeDocumento)}`;
}

const ORDEM: Record<string, number> = {
  ANTES_DO_VENCIMENTO: 0,
  NO_VENCIMENTO: 1,
  APOS_O_VENCIMENTO: 2,
};

function ordenar(eventos: EventoDaRegua[]): EventoDaRegua[] {
  return [...eventos].sort((a, b) => {
    const diferenca = (ORDEM[a.gatilho] ?? 9) - (ORDEM[b.gatilho] ?? 9);
    if (diferenca !== 0) return diferenca;
    return a.gatilho === 'ANTES_DO_VENCIMENTO' ? b.dias - a.dias : a.dias - b.dias;
  });
}

export function LinhaDoTempoDaRegua({ eventos }: { eventos: EventoDaRegua[] }) {
  if (eventos.length === 0) {
    return (
      <EstadoVazio
        titulo="Régua vazia"
        descricao="Adicione etapas para que a cobrança automática comece a rodar."
      />
    );
  }

  return (
    <div className="linha-do-tempo">
      {ordenar(eventos).map((evento, indice) => (
        <div
          key={`${evento.gatilho}-${evento.dias}-${indice}`}
          className={
            evento.ativo ? 'linha-do-tempo__item' : 'linha-do-tempo__item linha-do-tempo__item--inativo'
          }
        >
          <span className="linha-do-tempo__quando">
            {rotuloDoGatilho(evento.gatilho, evento.dias)}
          </span>
          <span className="texto-suave">
            → {evento.canais.map(rotuloDoCanal).join(', ') || 'sem canal'}
            {` · ${rotuloDoDocumento(evento)}`}
            {evento.modelo ? ` · modelo "${evento.modelo}"` : ''}
          </span>
          {!evento.ativo && <Selo texto="Inativa" tom="neutro" />}
        </div>
      ))}
    </div>
  );
}
