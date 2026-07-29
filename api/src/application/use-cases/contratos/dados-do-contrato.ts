import { PoliticaDeEncargos } from '../../../domain/contratos/politica-de-encargos.js';
import { TermosDoFinanciamento } from '../../../domain/contratos/termos-do-financiamento.js';
import type { FormaPagamento, IndiceReajuste, Periodicidade } from '../../../domain/contratos/tipos.js';
import type { DataCivil } from '../../../domain/value-objects/data-civil.js';
import type { Dinheiro } from '../../../domain/value-objects/dinheiro.js';
import { Percentual } from '../../../domain/value-objects/percentual.js';

/**
 * Condicoes comerciais recebidas da borda, ja convertidas em value objects.
 *
 * Compartilhada entre simular e criar contrato: a previa que o vendedor ve na
 * tela e gerada pelo MESMO codigo que gera as parcelas de verdade. Se fossem
 * dois caminhos, mais cedo ou mais tarde divergiriam.
 */
export interface CondicoesComerciais {
  readonly valorTotal: Dinheiro;
  readonly valorEntrada: Dinheiro;
  readonly dataEntrada: DataCivil | null;
  readonly formaPagamentoEntrada: FormaPagamento | null;
  readonly quantidadeDeParcelas: number;
  readonly valorDaParcela: Dinheiro | null;
  readonly primeiroVencimento: DataCivil | null;
  readonly periodicidade: Periodicidade;
  readonly multaPorAtrasoPercentual: number;
  readonly jurosAoMesPercentual: number;
  readonly diasDeCarencia: number;
  readonly indiceReajuste: IndiceReajuste;
}

export function montarTermos(condicoes: CondicoesComerciais): TermosDoFinanciamento {
  return TermosDoFinanciamento.de({
    valorTotal: condicoes.valorTotal,
    valorEntrada: condicoes.valorEntrada,
    dataEntrada: condicoes.dataEntrada,
    formaPagamentoEntrada: condicoes.formaPagamentoEntrada,
    quantidadeDeParcelas: condicoes.quantidadeDeParcelas,
    valorDaParcela: condicoes.valorDaParcela,
    primeiroVencimento: condicoes.primeiroVencimento,
    periodicidade: condicoes.periodicidade,
  });
}

export function montarPolitica(condicoes: CondicoesComerciais): PoliticaDeEncargos {
  return PoliticaDeEncargos.de({
    multaPorAtraso: Percentual.de(condicoes.multaPorAtrasoPercentual),
    jurosAoMes: Percentual.de(condicoes.jurosAoMesPercentual),
    diasDeCarencia: condicoes.diasDeCarencia,
  });
}
