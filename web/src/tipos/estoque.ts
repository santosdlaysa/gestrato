import type { RespostaPaginada } from './comum';

export interface SaldoEstoque {
  id: string;
  nome: string;
  simbolo: string | null;
  saldo: number;
  valorCentavos: number;
}

export type RespostaDeSaldosDeEstoque = RespostaPaginada<SaldoEstoque>;
