import type { Repositorios } from '../../ports/repositorios.js';

export interface ContratoSemParcelas {
  readonly contratoId: string;
  readonly numero: string;
  readonly clienteNome: string;
  readonly quantidadeDeParcelas: number;
  readonly valorTotalCentavos: number;
}

/**
 * Contratos ativos que ficaram SEM parcelas — tipicamente importados de outro
 * sistema/planilha, onde só o cabeçalho do contrato veio. São exatamente os que
 * a régua nunca cobraria (sem parcela, nada a cobrar), então precisam do plano
 * gerado antes de entrar no ciclo.
 */
export class ListarContratosSemParcelas {
  constructor(private readonly repositorios: Repositorios) {}

  async executar(): Promise<ContratoSemParcelas[]> {
    const contratos = await this.repositorios.contratos.ativos();
    if (contratos.length === 0) return [];

    const ids = contratos.map((contrato) => contrato.id.paraString());
    const parcelasPorContrato = await this.repositorios.parcelas.porContratos(ids);

    const semParcelas = contratos.filter((contrato) => {
      const parcelas = parcelasPorContrato.get(contrato.id.paraString());
      return !parcelas || parcelas.length === 0;
    });

    const clienteIds = [...new Set(semParcelas.map((contrato) => contrato.clienteId.paraString()))];
    const clientes = await this.repositorios.clientes.porIds(clienteIds);

    return semParcelas.map((contrato) => ({
      contratoId: contrato.id.paraString(),
      numero: contrato.numero,
      clienteNome: clientes.get(contrato.clienteId.paraString())?.nome ?? '—',
      quantidadeDeParcelas: contrato.termos.quantidadeDeParcelas,
      valorTotalCentavos: contrato.termos.valorTotal.centavos,
    }));
  }
}
