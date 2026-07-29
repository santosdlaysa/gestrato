import type { NotificacaoDePagamento } from '../../ports/gateway-de-cobranca.js';
import type { GatewayDeCobranca } from '../../ports/gateway-de-cobranca.js';
import type { GeradorDeIdentificador, Relogio } from '../../ports/comuns.js';
import type { Repositorios } from '../../ports/repositorios.js';
import type { RegistrarBaixa } from '../parcelas/registrar-baixa.js';
import { Dinheiro } from '../../../domain/value-objects/dinheiro.js';

export interface ResultadoDoWebhook {
  readonly recebido: true;
  readonly situacao: 'PROCESSADO' | 'IGNORADO' | 'DUPLICADO' | 'ERRO';
  readonly detalhe: string;
}

/**
 * Conciliacao automatica: baixa a parcela quando o provedor confirma o pagamento.
 *
 * Regras que evitam os erros classicos de webhook:
 *
 * - **Grava antes de processar.** O evento cru fica salvo mesmo se a baixa
 *   falhar, entao dinheiro recebido nunca some por causa de um bug nosso.
 * - **Idempotente.** Provedor reenvia ate receber 200; o mesmo evento chegando
 *   duas vezes nao gera duas baixas.
 * - **Responde 200 quase sempre.** Devolver erro faz o provedor entrar em
 *   retry infinito. Falha nossa fica registrada para reprocessamento manual.
 */
export class ProcessarWebhookDeCobranca {
  constructor(
    private readonly repositorios: Repositorios,
    private readonly gateway: GatewayDeCobranca,
    private readonly registrarBaixa: RegistrarBaixa,
    private readonly geradorDeIdentificador: GeradorDeIdentificador,
    private readonly relogio: Relogio,
  ) {}

  async executar(corpo: unknown, cabecalhos: Record<string, string>): Promise<ResultadoDoWebhook> {
    const notificacao = this.gateway.interpretarWebhook(corpo, cabecalhos);
    if (!notificacao || notificacao.tipo === 'DESCONHECIDO') {
      return { recebido: true, situacao: 'IGNORADO', detalhe: 'Evento sem interesse para a cobranca.' };
    }

    const jaProcessado = await this.repositorios.eventosDeWebhook.jaRecebido(
      this.gateway.nome,
      notificacao.identificadorExterno,
      notificacao.tipo,
    );
    if (jaProcessado) {
      return { recebido: true, situacao: 'DUPLICADO', detalhe: 'Evento ja processado anteriormente.' };
    }

    const eventoId = this.geradorDeIdentificador.gerar();
    await this.repositorios.eventosDeWebhook.registrar({
      id: eventoId,
      provedor: this.gateway.nome,
      identificadorExterno: notificacao.identificadorExterno,
      tipo: notificacao.tipo,
      cargaUtil: corpo,
    });

    try {
      const detalhe = await this.aplicar(notificacao);
      await this.repositorios.eventosDeWebhook.marcarComoProcessado(eventoId);
      return { recebido: true, situacao: 'PROCESSADO', detalhe };
    } catch (erro) {
      const motivo = erro instanceof Error ? erro.message : String(erro);
      await this.repositorios.eventosDeWebhook.marcarComoProcessado(eventoId, motivo);
      console.error('[webhook-cobranca] falha ao conciliar:', motivo);
      return { recebido: true, situacao: 'ERRO', detalhe: motivo };
    }
  }

  private async aplicar(notificacao: NotificacaoDePagamento): Promise<string> {
    const documento = await this.repositorios.documentos.porIdentificadorExterno(
      this.gateway.nome,
      notificacao.identificadorExterno,
    );
    if (!documento) {
      return `Documento ${notificacao.identificadorExterno} nao encontrado; evento guardado para conferencia.`;
    }

    switch (notificacao.tipo) {
      case 'PAGAMENTO_CONFIRMADO':
        return this.darBaixa(documento.parcelaId.paraString(), documento.id.paraString(), notificacao);
      case 'DOCUMENTO_CANCELADO':
        documento.cancelar();
        await this.repositorios.documentos.salvar(documento);
        return 'Documento cancelado no provedor.';
      case 'PAGAMENTO_ESTORNADO':
        // Estorno automatico e deliberadamente NAO aplicado: desfazer uma baixa
        // sem conferencia humana pode reabrir contrato quitado por engano.
        return 'Estorno recebido. Confira e estorne manualmente pelo extrato do contrato.';
      default:
        return 'Evento sem acao.';
    }
  }

  private async darBaixa(
    parcelaId: string,
    documentoId: string,
    notificacao: NotificacaoDePagamento,
  ): Promise<string> {
    const parcela = await this.repositorios.parcelas.porId(parcelaId);
    if (!parcela) return `Parcela ${parcelaId} nao encontrada.`;
    if (!parcela.estaEmAberto()) {
      return `Parcela ${parcela.numero} ja estava ${parcela.status.toLowerCase()}; nada a fazer.`;
    }

    const contrato = await this.repositorios.contratos.porId(parcela.contratoId.paraString());
    if (!contrato) return 'Contrato da parcela nao encontrado.';

    const pagoEm = notificacao.pagoEm ?? this.relogio.hoje();
    const demonstrativo = parcela.demonstrativoEm(contrato.politicaDeEncargos, pagoEm);
    const valorPago = notificacao.valorPago ?? demonstrativo.total;

    // O provedor informa o total pago; separamos em principal, multa e juros
    // usando o demonstrativo do dia. O principal nunca ultrapassa o saldo:
    // o que exceder e mora recebida, nao amortizacao.
    const principal = valorPago.menorQue(demonstrativo.saldoPrincipal)
      ? valorPago
      : demonstrativo.saldoPrincipal;
    const excedente = valorPago.subtrair(principal).naoNegativo();
    const multa = excedente.menorQue(demonstrativo.multa) ? excedente : demonstrativo.multa;
    const juros = excedente.subtrair(multa).naoNegativo();

    await this.registrarBaixa.executar({
      parcelaId,
      valorPrincipal: principal,
      valorJuros: juros,
      valorMulta: multa,
      valorDesconto: Dinheiro.ZERO,
      pagoEm,
      formaPagamento: 'BOLETO',
      observacoes: `Baixa automatica via ${this.gateway.nome}.`,
      registradoPor: null,
      origem: this.gateway.nome,
      documentoId,
    });

    return `Parcela ${parcela.numero} baixada em ${valorPago.formatar()}.`;
  }
}
