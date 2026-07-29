import { ErroDeValidacao } from '../shared/errors.js';
import type { DataCivil } from '../value-objects/data-civil.js';
import type { Parcela } from '../contratos/parcela.js';
import { CANAIS, TIPOS_DOCUMENTO, type Canal, type Gatilho, type TipoDocumento } from './tipos.js';

interface EntradaDoEvento {
  gatilho: Gatilho;
  /** Distancia em dias ate o vencimento. Ignorado em NO_VENCIMENTO. */
  dias: number;
  /** Ordem de preferencia: usa o primeiro canal que o cliente tem cadastrado. */
  canais: readonly Canal[];
  modelo: string;
  /**
   * Garante um documento com o valor atualizado antes de mandar a mensagem.
   *
   * Ligado, `{{linhaDigitavel}}` e `{{pix}}` chegam preenchidos; desligado, a
   * cobranca sai sem meio de pagamento — o que na pratica e pedir para o
   * cliente ligar perguntando como pagar.
   */
  emitirDocumento: boolean;
  tipoDeDocumento: TipoDocumento;
  ativo: boolean;
}

/**
 * Uma etapa da regua: "3 dias antes do vencimento, avise por WhatsApp".
 *
 * A chave (`ANTES_DO_VENCIMENTO:3`) e o que torna a regua idempotente — o
 * registro de cobranca guarda essa chave, entao rodar o job duas vezes no mesmo
 * dia, ou reprocessar um periodo, nunca manda a mesma mensagem de novo.
 */
export class EventoDaRegua {
  private constructor(private readonly entrada: EntradaDoEvento) {}

  static de(entrada: {
    gatilho: Gatilho;
    dias?: number;
    canais: readonly Canal[];
    modelo: string;
    emitirDocumento?: boolean;
    tipoDeDocumento?: TipoDocumento;
    ativo?: boolean;
  }): EventoDaRegua {
    const dias = entrada.gatilho === 'NO_VENCIMENTO' ? 0 : (entrada.dias ?? 0);

    if (!Number.isInteger(dias) || dias < 0) {
      throw new ErroDeValidacao('Dias do evento deve ser inteiro nao negativo.');
    }
    if (entrada.gatilho !== 'NO_VENCIMENTO' && dias === 0) {
      throw new ErroDeValidacao(
        `Evento ${entrada.gatilho} exige dias maior que zero; use NO_VENCIMENTO para o dia exato.`,
      );
    }
    if (dias > 3650) {
      throw new ErroDeValidacao('Dias do evento nao pode passar de 3650.');
    }
    if (entrada.canais.length === 0) {
      throw new ErroDeValidacao('Evento da regua precisa de ao menos um canal.');
    }
    const canaisInvalidos = entrada.canais.filter((canal) => !CANAIS.includes(canal));
    if (canaisInvalidos.length > 0) {
      throw new ErroDeValidacao(`Canais invalidos: ${canaisInvalidos.join(', ')}.`);
    }
    if (!entrada.modelo?.trim()) {
      throw new ErroDeValidacao('Evento da regua precisa de um modelo de mensagem.');
    }
    const tipoDeDocumento = entrada.tipoDeDocumento ?? 'BOLETO_COM_PIX';
    if (!TIPOS_DOCUMENTO.includes(tipoDeDocumento)) {
      throw new ErroDeValidacao(`Tipo de documento invalido: ${tipoDeDocumento}.`);
    }

    return new EventoDaRegua({
      gatilho: entrada.gatilho,
      dias,
      canais: [...entrada.canais],
      modelo: entrada.modelo.trim(),
      emitirDocumento: entrada.emitirDocumento ?? true,
      tipoDeDocumento,
      ativo: entrada.ativo ?? true,
    });
  }

  get gatilho(): Gatilho {
    return this.entrada.gatilho;
  }

  get dias(): number {
    return this.entrada.dias;
  }

  get canais(): readonly Canal[] {
    return this.entrada.canais;
  }

  get modelo(): string {
    return this.entrada.modelo;
  }

  get emitirDocumento(): boolean {
    return this.entrada.emitirDocumento;
  }

  get tipoDeDocumento(): TipoDocumento {
    return this.entrada.tipoDeDocumento;
  }

  get ativo(): boolean {
    return this.entrada.ativo;
  }

  /** Identidade estavel do evento — chave de idempotencia do envio. */
  get chave(): string {
    return `${this.entrada.gatilho}:${this.entrada.dias}`;
  }

  get descricao(): string {
    switch (this.entrada.gatilho) {
      case 'ANTES_DO_VENCIMENTO':
        return `${this.entrada.dias} dia(s) antes do vencimento`;
      case 'NO_VENCIMENTO':
        return 'No dia do vencimento';
      case 'APOS_O_VENCIMENTO':
        return `${this.entrada.dias} dia(s) apos o vencimento`;
    }
  }

  /** Data em que este evento deve disparar para um dado vencimento. */
  dataDeDisparo(vencimento: DataCivil): DataCivil {
    switch (this.entrada.gatilho) {
      case 'ANTES_DO_VENCIMENTO':
        return vencimento.somarDias(-this.entrada.dias);
      case 'NO_VENCIMENTO':
        return vencimento;
      case 'APOS_O_VENCIMENTO':
        return vencimento.somarDias(this.entrada.dias);
    }
  }

  deveDispararEm(vencimento: DataCivil, dataReferencia: DataCivil): boolean {
    return this.entrada.ativo && this.dataDeDisparo(vencimento).igualA(dataReferencia);
  }

  paraEstado(): Readonly<EntradaDoEvento> {
    return { ...this.entrada, canais: [...this.entrada.canais] };
  }
}

/** Evento que deve virar mensagem, ja casado com a parcela que o disparou. */
export interface DisparoProgramado {
  readonly parcela: Parcela;
  readonly evento: EventoDaRegua;
  readonly chaveDeIdempotencia: string;
}

/**
 * A politica de comunicacao da loteadora: quando avisar, por onde e com que texto.
 *
 * Fica no dominio (e nao no job) porque "cobrar 5 dias depois do vencimento" e
 * decisao de negocio; o job so pergunta a regua o que fazer hoje.
 */
export class ReguaDeCobranca {
  private constructor(readonly eventos: readonly EventoDaRegua[]) {}

  /** Regua sugerida quando a loteadora ainda nao configurou a dela. */
  static padrao(): ReguaDeCobranca {
    return ReguaDeCobranca.de([
      EventoDaRegua.de({ gatilho: 'ANTES_DO_VENCIMENTO', dias: 5, canais: ['WHATSAPP', 'EMAIL'], modelo: 'lembrete' }),
      EventoDaRegua.de({ gatilho: 'ANTES_DO_VENCIMENTO', dias: 1, canais: ['WHATSAPP', 'SMS'], modelo: 'lembrete' }),
      EventoDaRegua.de({ gatilho: 'NO_VENCIMENTO', canais: ['WHATSAPP', 'EMAIL'], modelo: 'vencimento' }),
      EventoDaRegua.de({ gatilho: 'APOS_O_VENCIMENTO', dias: 1, canais: ['WHATSAPP', 'SMS'], modelo: 'atraso' }),
      EventoDaRegua.de({ gatilho: 'APOS_O_VENCIMENTO', dias: 5, canais: ['WHATSAPP', 'EMAIL'], modelo: 'atraso' }),
      // Ultimo aviso antes de o contrato passar a contar como inadimplente.
      EventoDaRegua.de({ gatilho: 'APOS_O_VENCIMENTO', dias: 7, canais: ['WHATSAPP', 'EMAIL'], modelo: 'atraso' }),
      EventoDaRegua.de({ gatilho: 'APOS_O_VENCIMENTO', dias: 10, canais: ['WHATSAPP', 'EMAIL'], modelo: 'atraso' }),
      EventoDaRegua.de({ gatilho: 'APOS_O_VENCIMENTO', dias: 30, canais: ['WHATSAPP', 'EMAIL'], modelo: 'atraso_grave' }),
    ]);
  }

  static de(eventos: readonly EventoDaRegua[]): ReguaDeCobranca {
    const chaves = new Set<string>();
    for (const evento of eventos) {
      if (chaves.has(evento.chave)) {
        throw new ErroDeValidacao(`Evento duplicado na regua: ${evento.descricao}.`);
      }
      chaves.add(evento.chave);
    }
    return new ReguaDeCobranca([...eventos].sort(compararEventos));
  }

  get eventosAtivos(): readonly EventoDaRegua[] {
    return this.eventos.filter((evento) => evento.ativo);
  }

  /** Ultimo dia em que a regua ainda tem algo a dizer sobre um vencimento. */
  get maiorAtrasoConfigurado(): number {
    return Math.max(
      0,
      ...this.eventosAtivos
        .filter((evento) => evento.gatilho === 'APOS_O_VENCIMENTO')
        .map((evento) => evento.dias),
    );
  }

  get maiorAntecedenciaConfigurada(): number {
    return Math.max(
      0,
      ...this.eventosAtivos
        .filter((evento) => evento.gatilho === 'ANTES_DO_VENCIMENTO')
        .map((evento) => evento.dias),
    );
  }

  /**
   * O que cobrar hoje. Parcela encerrada nao entra: quem ja pagou nao recebe
   * cobranca, mesmo que o job reprocesse um dia antigo.
   */
  avaliar(parcelas: readonly Parcela[], dataReferencia: DataCivil): DisparoProgramado[] {
    const disparos: DisparoProgramado[] = [];
    for (const parcela of parcelas) {
      if (!parcela.estaEmAberto()) continue;
      for (const evento of this.eventosAtivos) {
        if (evento.deveDispararEm(parcela.vencimento, dataReferencia)) {
          disparos.push({
            parcela,
            evento,
            chaveDeIdempotencia: `${parcela.id.paraString()}:${evento.chave}`,
          });
        }
      }
    }
    return disparos;
  }
}

const PESO_DO_GATILHO: Record<Gatilho, number> = {
  ANTES_DO_VENCIMENTO: 0,
  NO_VENCIMENTO: 1,
  APOS_O_VENCIMENTO: 2,
};

function compararEventos(a: EventoDaRegua, b: EventoDaRegua): number {
  const porGatilho = PESO_DO_GATILHO[a.gatilho] - PESO_DO_GATILHO[b.gatilho];
  if (porGatilho !== 0) return porGatilho;
  // Antes do vencimento: do mais distante para o mais proximo (5 dias, depois 1).
  return a.gatilho === 'ANTES_DO_VENCIMENTO' ? b.dias - a.dias : a.dias - b.dias;
}
