import { Parcela } from '../../../domain/contratos/parcela.js';
import { Identificador } from '../../../domain/shared/identificador.js';
import type { GeradorDeIdentificador } from '../../ports/comuns.js';
import type { UnidadeDeTrabalho } from '../../ports/repositorios.js';

export interface EntradaDaGeracaoEmLote {
  readonly contratoIds: readonly string[];
}

export type ResultadoDaGeracao = 'GERADAS' | 'JA_TINHA' | 'NAO_ENCONTRADO' | 'FALHA';

export interface ItemDaGeracao {
  readonly contratoId: string;
  readonly numero: string;
  readonly resultado: ResultadoDaGeracao;
  readonly parcelasGeradas: number;
  readonly motivo?: string;
}

export interface SaidaDaGeracaoEmLote {
  readonly processados: number;
  readonly totalGeradas: number;
  readonly itens: readonly ItemDaGeracao[];
}

/**
 * Gera o plano de parcelas para contratos que estão sem nenhuma.
 *
 * Cada contrato é processado em sua própria transação: uma falha (ou um contrato
 * que já tinha parcelas) não impede os demais. Contrato com parcelas é pulado de
 * propósito — gerar de novo duplicaria a cobrança.
 */
export class GerarParcelasEmLote {
  constructor(
    private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
    private readonly geradorDeIdentificador: GeradorDeIdentificador,
  ) {}

  async executar(entrada: EntradaDaGeracaoEmLote): Promise<SaidaDaGeracaoEmLote> {
    const itens: ItemDaGeracao[] = [];
    for (const contratoId of entrada.contratoIds) {
      itens.push(await this.gerarUm(contratoId));
    }
    return {
      processados: itens.length,
      totalGeradas: itens.reduce((soma, item) => soma + item.parcelasGeradas, 0),
      itens,
    };
  }

  private async gerarUm(contratoId: string): Promise<ItemDaGeracao> {
    try {
      return await this.unidadeDeTrabalho.executar(async (repositorios) => {
        const contrato = await repositorios.contratos.porId(contratoId);
        if (!contrato) {
          return { contratoId, numero: '—', resultado: 'NAO_ENCONTRADO', parcelasGeradas: 0 };
        }

        const existentes = await repositorios.parcelas.porContrato(contratoId);
        if (existentes.length > 0) {
          return { contratoId, numero: contrato.numero, resultado: 'JA_TINHA', parcelasGeradas: 0 };
        }

        const parcelas = contrato.gerarPlanoDeParcelas().map((especificacao) =>
          Parcela.nova({
            id: Identificador.de(this.geradorDeIdentificador.gerar()),
            contratoId: contrato.id,
            numero: especificacao.numero,
            tipo: especificacao.tipo,
            valorOriginal: especificacao.valor,
            vencimento: especificacao.vencimento,
            descricao: especificacao.descricao,
          }),
        );
        await repositorios.parcelas.criarVarias(parcelas);

        return {
          contratoId,
          numero: contrato.numero,
          resultado: 'GERADAS',
          parcelasGeradas: parcelas.length,
        };
      });
    } catch (erro) {
      return {
        contratoId,
        numero: '—',
        resultado: 'FALHA',
        parcelasGeradas: 0,
        motivo: erro instanceof Error ? erro.message : String(erro),
      };
    }
  }
}
