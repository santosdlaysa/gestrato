import type { IndiceReajuste } from '../../../domain/contratos/tipos.js';
import { ErroDeRegraDeNegocio, ErroNaoEncontrado } from '../../../domain/shared/errors.js';
import type { DataCivil } from '../../../domain/value-objects/data-civil.js';
import { Dinheiro } from '../../../domain/value-objects/dinheiro.js';
import { Percentual } from '../../../domain/value-objects/percentual.js';
import type { GeradorDeIdentificador } from '../../ports/comuns.js';
import type { UnidadeDeTrabalho } from '../../ports/repositorios.js';

export interface EntradaDeReajuste {
  readonly contratoId: string;
  readonly indice: IndiceReajuste;
  readonly percentual: number;
  readonly aplicadoAPartirDe: DataCivil;
  readonly registradoPor: string | null;
}

export interface SaidaDeReajuste {
  readonly contratoId: string;
  readonly parcelasAfetadas: number;
  readonly acrescimoTotal: Dinheiro;
}

/**
 * Aplica o reajuste anual (IGPM, IPCA, INCC...) nas parcelas futuras.
 *
 * O percentual e informado por quem opera, nao buscado de API: o indice do mes
 * e uma decisao contratual (qual indice, qual acumulado, qual data-base) que
 * varia por contrato e precisa de conferencia humana.
 *
 * So mexe em parcela PENDENTE com vencimento a partir da data-base. Parcela ja
 * paga ou parcialmente paga nao e tocada — reajustar o passado seria cobrar de
 * novo algo ja quitado.
 */
export class AplicarReajuste {
  constructor(
    private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
    private readonly geradorDeIdentificador: GeradorDeIdentificador,
  ) {}

  async executar(entrada: EntradaDeReajuste): Promise<SaidaDeReajuste> {
    const percentual = Percentual.de(entrada.percentual);
    if (percentual.ehZero()) {
      throw new ErroDeRegraDeNegocio('Percentual de reajuste deve ser maior que zero.');
    }

    return this.unidadeDeTrabalho.executar(async (repositorios) => {
      const contrato = await repositorios.contratos.porId(entrada.contratoId);
      if (!contrato) throw new ErroNaoEncontrado('Contrato', entrada.contratoId);
      contrato.garantirQuePodeReceberCobranca();

      const fator = contrato.fatorDeReajuste(percentual);
      const parcelas = await repositorios.parcelas.porContrato(entrada.contratoId);

      const alvos = parcelas.filter(
        (parcela) =>
          parcela.status === 'PENDENTE' && !parcela.vencimento.anteriorA(entrada.aplicadoAPartirDe),
      );
      if (alvos.length === 0) {
        throw new ErroDeRegraDeNegocio(
          `Nenhuma parcela pendente vence a partir de ${entrada.aplicadoAPartirDe.formatarBr()}.`,
        );
      }

      const valoresAntes = alvos.map((parcela) => parcela.valorOriginal);
      for (const parcela of alvos) {
        parcela.aplicarReajuste(fator);
      }
      await repositorios.parcelas.salvarVarias(alvos);

      await repositorios.reajustes.registrar({
        id: this.geradorDeIdentificador.gerar(),
        contratoId: entrada.contratoId,
        indice: entrada.indice,
        percentual: percentual.valor,
        aplicadoAPartirDe: entrada.aplicadoAPartirDe,
        parcelasAfetadas: alvos.length,
        registradoPor: entrada.registradoPor,
      });

      return {
        contratoId: entrada.contratoId,
        parcelasAfetadas: alvos.length,
        acrescimoTotal: Dinheiro.somaDe(alvos.map((parcela) => parcela.valorOriginal)).subtrair(
          Dinheiro.somaDe(valoresAntes),
        ),
      };
    });
  }
}
