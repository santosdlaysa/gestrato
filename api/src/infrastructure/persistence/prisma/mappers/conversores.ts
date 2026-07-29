import { DataCivil } from '../../../../domain/value-objects/data-civil.js';
import { Dinheiro } from '../../../../domain/value-objects/dinheiro.js';
import { Identificador } from '../../../../domain/shared/identificador.js';

/**
 * Conversores entre as colunas do Postgres e os value objects do dominio.
 *
 * Concentrar aqui evita o erro mais caro desta base: tratar centavos como reais
 * ou deixar o fuso do servidor mover um vencimento em um dia.
 */

export function paraDinheiro(centavos: number): Dinheiro {
  return Dinheiro.deCentavos(centavos);
}

export function paraDinheiroOpcional(centavos: number | null): Dinheiro | null {
  return centavos === null ? null : Dinheiro.deCentavos(centavos);
}

export function deDinheiro(valor: Dinheiro): number {
  return valor.centavos;
}

export function deDinheiroOpcional(valor: Dinheiro | null): number | null {
  return valor === null ? null : valor.centavos;
}

/** Coluna `@db.Date` chega como Date em meia-noite UTC — lemos so os campos UTC. */
export function paraDataCivil(data: Date): DataCivil {
  return DataCivil.deDate(data);
}

export function paraDataCivilOpcional(data: Date | null): DataCivil | null {
  return data === null ? null : DataCivil.deDate(data);
}

export function deDataCivil(data: DataCivil): Date {
  return data.paraDateUtc();
}

export function deDataCivilOpcional(data: DataCivil | null): Date | null {
  return data === null ? null : data.paraDateUtc();
}

export function paraIdentificador(id: string): Identificador {
  return Identificador.de(id);
}

export function paraIdentificadorOpcional(id: string | null): Identificador | null {
  return id === null ? null : Identificador.de(id);
}

export function deIdentificador(id: Identificador): string {
  return id.paraString();
}

export function deIdentificadorOpcional(id: Identificador | null): string | null {
  return id === null ? null : id.paraString();
}
