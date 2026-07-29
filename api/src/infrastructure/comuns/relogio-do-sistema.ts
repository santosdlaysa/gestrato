import { randomUUID } from 'node:crypto';
import type { GeradorDeIdentificador, Relogio } from '../../application/ports/comuns.js';
import { DataCivil } from '../../domain/value-objects/data-civil.js';
import { ambiente } from '../config/ambiente.js';

/**
 * Relogio real. "Hoje" e sempre no fuso do negocio (America/Sao_Paulo por
 * padrao), nao no fuso do servidor: um job que roda 23h30 em Sao Paulo nao pode
 * achar que ja e o dia seguinte so porque a maquina esta em UTC.
 */
export class RelogioDoSistema implements Relogio {
  constructor(private readonly fuso: string = ambiente.fusoHorario) {}

  hoje(): DataCivil {
    return DataCivil.hoje(this.fuso);
  }

  agora(): Date {
    return new Date();
  }
}

/** Relogio congelado, para testes e para a simulacao da regua numa data passada. */
export class RelogioFixo implements Relogio {
  constructor(
    private readonly data: DataCivil,
    private readonly instante: Date = data.paraDateUtc(),
  ) {}

  hoje(): DataCivil {
    return this.data;
  }

  agora(): Date {
    return this.instante;
  }
}

export class GeradorDeUuid implements GeradorDeIdentificador {
  gerar(): string {
    return randomUUID();
  }
}
