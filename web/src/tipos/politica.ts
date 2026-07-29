/**
 * Limiares configuráveis da escala de atraso. Nunca assuma valores fixos no
 * código: eles são definidos pela loteadora e chegam sempre da API.
 */
export interface PoliticaDeInadimplencia {
  diasParaInadimplencia: number;
  diasParaRetomadaDoLote: number;
}
