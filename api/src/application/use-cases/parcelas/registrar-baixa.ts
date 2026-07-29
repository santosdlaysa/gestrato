import { Pagamento, ORIGEM_MANUAL } from '../../../domain/contratos/pagamento.js';
import type { Baixa } from '../../../domain/contratos/parcela.js';
import type { FormaPagamento } from '../../../domain/contratos/tipos.js';
import { ErroNaoEncontrado } from '../../../domain/shared/errors.js';
import { Identificador } from '../../../domain/shared/identificador.js';
import type { DataCivil } from '../../../domain/value-objects/data-civil.js';
import { Dinheiro } from '../../../domain/value-objects/dinheiro.js';
import type { GeradorDeIdentificador } from '../../ports/comuns.js';
import type { Repositorios, UnidadeDeTrabalho } from '../../ports/repositorios.js';

export interface EntradaDeBaixa {
  readonly parcelaId: string;
  readonly valorPrincipal: Dinheiro;
  readonly valorJuros: Dinheiro;
  readonly valorMulta: Dinheiro;
  readonly valorDesconto: Dinheiro;
  readonly pagoEm: DataCivil;
  readonly formaPagamento: FormaPagamento;
  readonly observacoes: string | null;
  readonly registradoPor: string | null;
  /** "MANUAL" ou o nome do provedor, quando a baixa vem da conciliacao bancaria. */
  readonly origem?: string;
  readonly documentoId?: string | null;
}

export interface SaidaDeBaixa {
  readonly parcelaId: string;
  readonly statusDaParcela: string;
  readonly saldoRestante: Dinheiro;
  readonly totalRecebido: Dinheiro;
  readonly contratoQuitado: boolean;
}

/**
 * Baixa de parcela — manual ou vinda do banco.
 *
 * Aceita pagamento parcial de proposito: em loteamento e comum o cliente pagar
 * "o que da" no mes. Enquanto sobrar saldo, a parcela continua em aberto e
 * segue na regua de cobranca pelo valor restante.
 *
 * Se esta era a ultima parcela em aberto, o contrato se quita sozinho — quitar
 * e consequencia do recebimento, nunca um botao a parte.
 */
export class RegistrarBaixa {
  constructor(
    private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
    private readonly geradorDeIdentificador: GeradorDeIdentificador,
  ) {}

  async executar(entrada: EntradaDeBaixa): Promise<SaidaDeBaixa> {
    return this.unidadeDeTrabalho.executar(async (repositorios) => {
      const parcela = await repositorios.parcelas.porId(entrada.parcelaId);
      if (!parcela) throw new ErroNaoEncontrado('Parcela', entrada.parcelaId);

      const contratoId = parcela.contratoId.paraString();
      const contrato = await repositorios.contratos.porId(contratoId);
      if (!contrato) throw new ErroNaoEncontrado('Contrato', contratoId);

      contrato.garantirQuePodeReceberCobranca();

      const baixa: Baixa = {
        valorPrincipal: entrada.valorPrincipal,
        valorJuros: entrada.valorJuros,
        valorMulta: entrada.valorMulta,
        valorDesconto: entrada.valorDesconto,
        pagoEm: entrada.pagoEm,
        formaPagamento: entrada.formaPagamento,
      };
      parcela.registrarBaixa(baixa);

      const pagamento = Pagamento.registrar({
        id: Identificador.de(this.geradorDeIdentificador.gerar()),
        contratoId: parcela.contratoId,
        parcelaId: parcela.id,
        baixa,
        origem: entrada.origem ?? ORIGEM_MANUAL,
        documentoId: entrada.documentoId ? Identificador.de(entrada.documentoId) : null,
        registradoPor: entrada.registradoPor,
        observacoes: entrada.observacoes,
      });

      await repositorios.parcelas.salvar(parcela);
      await repositorios.pagamentos.registrar(pagamento);

      if (parcela.estaQuitada()) {
        await this.baixarDocumentoVigente(repositorios, entrada.parcelaId);
      }

      const parcelasDoContrato = await repositorios.parcelas.porContrato(contratoId);
      const contratoQuitado = contrato.quitarSeTotalmenteRecebido(parcelasDoContrato);
      if (contratoQuitado) {
        await repositorios.contratos.salvar(contrato);
      }

      return {
        parcelaId: parcela.id.paraString(),
        statusDaParcela: parcela.status,
        saldoRestante: parcela.saldoPrincipal(),
        totalRecebido: parcela.totalRecebido,
        contratoQuitado,
      };
    });
  }

  /** Boleto/Pix da parcela quitada deixa de ser pagavel — evita pagamento em duplicidade. */
  private async baixarDocumentoVigente(repositorios: Repositorios, parcelaId: string): Promise<void> {
    const documento = await repositorios.documentos.vigenteDaParcela(parcelaId);
    if (!documento) return;
    documento.registrarPagamento();
    await repositorios.documentos.salvar(documento);
  }
}
