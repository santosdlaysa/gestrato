import { Dinheiro } from '../../../domain/value-objects/dinheiro.js';
import type { EspecificacaoDeParcela } from '../../../domain/contratos/termos-do-financiamento.js';
import { montarTermos, type CondicoesComerciais } from './dados-do-contrato.js';

export interface ResumoDaSimulacao {
  readonly valorTotal: Dinheiro;
  readonly valorEntrada: Dinheiro;
  readonly valorFinanciado: Dinheiro;
  readonly quantidadeDeParcelas: number;
  readonly primeiraParcela: Dinheiro | null;
  readonly ultimaParcela: Dinheiro | null;
  readonly somaDoPlano: Dinheiro;
  readonly primeiroVencimento: string | null;
  readonly ultimoVencimento: string | null;
}

export interface SaidaDaSimulacao {
  readonly resumo: ResumoDaSimulacao;
  readonly parcelas: readonly EspecificacaoDeParcela[];
}

/**
 * Previa do plano de pagamento, sem gravar nada.
 *
 * E o que o vendedor ve antes de fechar o contrato. Roda o mesmo gerador usado
 * na criacao, entao o que aparece na tela e exatamente o que sera cobrado.
 */
export class SimularContrato {
  executar(condicoes: CondicoesComerciais): SaidaDaSimulacao {
    const termos = montarTermos(condicoes);
    const parcelas = termos.gerarPlanoDeParcelas();
    const doFinanciamento = parcelas.filter((parcela) => parcela.tipo === 'FINANCIAMENTO');

    return {
      resumo: {
        valorTotal: termos.valorTotal,
        valorEntrada: termos.valorEntrada,
        valorFinanciado: termos.valorFinanciado,
        quantidadeDeParcelas: doFinanciamento.length,
        primeiraParcela: doFinanciamento[0]?.valor ?? null,
        ultimaParcela: doFinanciamento.at(-1)?.valor ?? null,
        somaDoPlano: Dinheiro.somaDe(parcelas.map((parcela) => parcela.valor)),
        primeiroVencimento: doFinanciamento[0]?.vencimento.paraIso() ?? null,
        ultimoVencimento: doFinanciamento.at(-1)?.vencimento.paraIso() ?? null,
      },
      parcelas,
    };
  }
}
