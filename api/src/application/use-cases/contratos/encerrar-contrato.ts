import { ErroNaoEncontrado } from '../../../domain/shared/errors.js';
import type { UnidadeDeTrabalho } from '../../ports/repositorios.js';

export type MotivoDeEncerramento = 'QUITACAO' | 'CANCELAMENTO' | 'DISTRATO';

export interface SaidaDeEncerramento {
  readonly contratoId: string;
  readonly status: string;
  readonly loteLiberado: boolean;
  readonly parcelasCanceladas: number;
}

/**
 * Encerra o contrato por quitacao, cancelamento ou distrato.
 *
 * Cancelamento e distrato devolvem o lote ao estoque e cancelam as parcelas em
 * aberto — sem isso a regua continuaria cobrando um contrato desfeito, que e o
 * tipo de erro que gera reclamacao no Procon.
 */
export class EncerrarContrato {
  constructor(private readonly unidadeDeTrabalho: UnidadeDeTrabalho) {}

  async executar(contratoId: string, motivo: MotivoDeEncerramento): Promise<SaidaDeEncerramento> {
    return this.unidadeDeTrabalho.executar(async (repositorios) => {
      const contrato = await repositorios.contratos.porId(contratoId);
      if (!contrato) throw new ErroNaoEncontrado('Contrato', contratoId);

      const parcelas = await repositorios.parcelas.porContrato(contratoId);

      if (motivo === 'QUITACAO') {
        contrato.quitar(parcelas);
        await repositorios.contratos.salvar(contrato);
        return { contratoId, status: contrato.status, loteLiberado: false, parcelasCanceladas: 0 };
      }

      if (motivo === 'CANCELAMENTO') {
        contrato.cancelar();
      } else {
        contrato.distratar();
      }

      const emAberto = parcelas.filter((parcela) => parcela.estaEmAberto());
      for (const parcela of emAberto) {
        parcela.cancelar();
      }
      await repositorios.parcelas.salvarVarias(emAberto);

      const lote = await repositorios.lotes.porId(contrato.loteId.paraString());
      if (lote) {
        lote.liberar();
        await repositorios.lotes.salvar(lote);
      }

      await repositorios.contratos.salvar(contrato);

      return {
        contratoId,
        status: contrato.status,
        loteLiberado: lote !== null,
        parcelasCanceladas: emAberto.length,
      };
    });
  }
}
