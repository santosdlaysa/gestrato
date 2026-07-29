export interface BlocoDeParcelas {
  quantidade: number;
  valorCentavos: number;
}

export interface FaixaDeAging {
  faixa: string;
  quantidade: number;
  valorCentavos: number;
}

export interface RecebimentoPorMes {
  competencia: string;
  valorCentavos: number;
  quantidade?: number;
}

import type { PoliticaDeInadimplencia } from './politica';

export interface LotesARetomar {
  quantidade: number;
  valorVencidoCentavos: number;
}

export interface CobrancasEnviadas {
  hoje: number;
  ultimos30Dias: number;
  falhasUltimos30Dias: number;
}

export interface Dashboard {
  data: string;
  contratosAtivos: number;
  contratosQuitados: number;
  contratosInadimplentes: number;
  clientesInadimplentes: number;
  totalAReceberCentavos: number;
  totalRecebidoNoMesCentavos: number;
  totalVencidoCentavos: number;
  percentualDeInadimplencia: number;
  parcelasQueVencemHoje: BlocoDeParcelas;
  parcelasVencidas: BlocoDeParcelas;
  proximos7Dias: BlocoDeParcelas;
  recebimentosPorMes: RecebimentoPorMes[];
  aging: FaixaDeAging[];
  // Opcionais: a API pode ainda não ter subido com estes campos.
  cobrancasEnviadas?: CobrancasEnviadas;
  taxaDeRecuperacao?: number;
  contratosEmAtraso?: number;
  contratosSujeitosARetomada?: number;
  lotesARetomar?: LotesARetomar;
  politicaDeInadimplencia?: PoliticaDeInadimplencia;
}
