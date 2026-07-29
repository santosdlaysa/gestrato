import { ErroNaoEncontrado } from '../../../domain/shared/errors.js';
import type { UnidadeDeTrabalho } from '../../ports/repositorios.js';

export interface SaidaDeEstorno {
  readonly parcelaId: string;
  readonly statusDaParcela: string;
  readonly contratoReaberto: boolean;
}

/**
 * Desfaz as baixas de uma parcela.
 *
 * Os lancamentos de pagamento nao sao apagados: ficam marcados como estornados,
 * para o relatorio de caixa continuar contando a historia completa.
 *
 * Se o contrato havia se quitado por causa desta parcela, ele volta a ativo —
 * senao ficaria um contrato "quitado" com parcela em aberto, e a regua deixaria
 * de cobrar exatamente quem voltou a dever.
 */
export class EstornarBaixa {
  constructor(private readonly unidadeDeTrabalho: UnidadeDeTrabalho) {}

  async executar(parcelaId: string): Promise<SaidaDeEstorno> {
    return this.unidadeDeTrabalho.executar(async (repositorios) => {
      const parcela = await repositorios.parcelas.porId(parcelaId);
      if (!parcela) throw new ErroNaoEncontrado('Parcela', parcelaId);

      const contratoId = parcela.contratoId.paraString();
      const contrato = await repositorios.contratos.porId(contratoId);
      if (!contrato) throw new ErroNaoEncontrado('Contrato', contratoId);

      parcela.estornarBaixas();
      await repositorios.parcelas.salvar(parcela);
      await repositorios.pagamentos.estornarDaParcela(parcelaId);

      const documento = await repositorios.documentos.vigenteDaParcela(parcelaId);
      if (documento) {
        documento.cancelar();
        await repositorios.documentos.salvar(documento);
      }

      const contratoReaberto = contrato.status === 'QUITADO';
      if (contratoReaberto) {
        contrato.reabrir();
        await repositorios.contratos.salvar(contrato);
      }

      return { parcelaId, statusDaParcela: parcela.status, contratoReaberto };
    });
  }
}
