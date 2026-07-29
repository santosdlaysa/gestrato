import { DocumentoDeCobranca } from '../../../domain/cobranca/documento-de-cobranca.js';
import type { TipoDocumento } from '../../../domain/cobranca/tipos.js';
import { ErroDeRegraDeNegocio, ErroNaoEncontrado } from '../../../domain/shared/errors.js';
import { Identificador } from '../../../domain/shared/identificador.js';
import type { DataCivil } from '../../../domain/value-objects/data-civil.js';
import type { ConsultaDeContextoDeCobranca, ContextoDeCobranca } from '../../ports/consulta-de-contexto.js';
import type { GeradorDeIdentificador, Relogio } from '../../ports/comuns.js';
import type { GatewayDeCobranca, PedidoDeEmissao } from '../../ports/gateway-de-cobranca.js';
import type { Repositorios } from '../../ports/repositorios.js';

export interface EntradaDeEmissao {
  readonly parcelaId: string;
  readonly tipo: TipoDocumento;
  /** Cancela o documento vigente e emite outro com o valor atualizado. */
  readonly reemitir: boolean;
  readonly dataDeReferencia?: DataCivil;
}

/**
 * Emite boleto/Pix para uma parcela.
 *
 * O valor emitido e sempre o ATUALIZADO na data — principal em aberto mais
 * multa e juros. Emitir pelo valor original de uma parcela vencida seria
 * perdoar a mora silenciosamente.
 *
 * Reemitir nunca edita o documento anterior: cancela e cria outro. O historico
 * precisa mostrar qual documento o cliente tinha em maos em cada momento, para
 * conciliar quando alguem paga um boleto antigo.
 */
export class EmitirDocumento {
  constructor(
    private readonly repositorios: Repositorios,
    private readonly consultaDeContexto: ConsultaDeContextoDeCobranca,
    private readonly gateway: GatewayDeCobranca,
    private readonly geradorDeIdentificador: GeradorDeIdentificador,
    private readonly relogio: Relogio,
  ) {}

  async executar(entrada: EntradaDeEmissao): Promise<DocumentoDeCobranca> {
    const referencia = entrada.dataDeReferencia ?? this.relogio.hoje();

    const parcela = await this.repositorios.parcelas.porId(entrada.parcelaId);
    if (!parcela) throw new ErroNaoEncontrado('Parcela', entrada.parcelaId);
    if (!parcela.estaEmAberto()) {
      throw new ErroDeRegraDeNegocio(
        `Parcela ${parcela.numero} esta ${parcela.status.toLowerCase()}; nao ha o que cobrar.`,
      );
    }

    const contrato = await this.repositorios.contratos.porId(parcela.contratoId.paraString());
    if (!contrato) throw new ErroNaoEncontrado('Contrato', parcela.contratoId.paraString());
    contrato.garantirQuePodeReceberCobranca();

    const vigente = await this.repositorios.documentos.vigenteDaParcela(entrada.parcelaId);
    if (vigente && !entrada.reemitir) {
      return vigente;
    }

    const contexto = (await this.consultaDeContexto.porParcelas([entrada.parcelaId])).get(entrada.parcelaId);
    if (!contexto) throw new ErroNaoEncontrado('Contexto de cobranca da parcela', entrada.parcelaId);

    if (vigente) {
      await this.cancelarVigente(vigente);
    }

    const demonstrativo = parcela.demonstrativoEm(contrato.politicaDeEncargos, referencia);
    // Boleto vencido nao e pagavel: quando a parcela ja passou, o documento sai
    // com vencimento na data da emissao, ja com a mora embutida no valor.
    const vencimentoDoDocumento = parcela.vencimento.anteriorA(referencia) ? referencia : parcela.vencimento;

    const pedido: PedidoDeEmissao = {
      tipo: entrada.tipo,
      referencia: `Contrato ${contexto.contratoNumero} - parcela ${parcela.numero}`,
      descricao: parcela.descricao ?? `Parcela ${parcela.numero}`,
      valor: demonstrativo.total,
      vencimento: vencimentoDoDocumento,
      pagador: montarPagador(contexto),
      multaPercentual: contrato.politicaDeEncargos.multaPorAtraso.valor,
      jurosAoMesPercentual: contrato.politicaDeEncargos.jurosAoMes.valor,
      // Inclui a data para que a reemissao do dia seguinte seja um documento
      // novo no provedor, e nao um retry da emissao anterior.
      chaveDeIdempotencia: `${entrada.parcelaId}:${entrada.tipo}:${referencia.paraIso()}:${demonstrativo.total.centavos}`,
    };

    const emitido = await this.gateway.emitir(pedido);

    const documento = DocumentoDeCobranca.novo({
      id: Identificador.de(this.geradorDeIdentificador.gerar()),
      contratoId: contrato.id,
      parcelaId: parcela.id,
      tipo: entrada.tipo,
      provedor: this.gateway.nome,
      identificadorExterno: emitido.identificadorExterno,
      nossoNumero: emitido.nossoNumero,
      linhaDigitavel: emitido.linhaDigitavel,
      codigoDeBarras: emitido.codigoDeBarras,
      pixCopiaECola: emitido.pixCopiaECola,
      pixQrCodeBase64: emitido.pixQrCodeBase64,
      urlDoDocumento: emitido.urlDoDocumento,
      valor: demonstrativo.total,
      vencimento: vencimentoDoDocumento,
      emitidoEm: this.relogio.agora(),
    });

    await this.repositorios.documentos.salvar(documento);
    return documento;
  }

  /**
   * Se o provedor recusar o cancelamento, seguimos com a nova emissao: ficar
   * sem documento novo e pior que ter um antigo pendurado la fora — e o antigo
   * ja fica marcado como cancelado do nosso lado.
   */
  private async cancelarVigente(vigente: DocumentoDeCobranca): Promise<void> {
    try {
      await this.gateway.cancelar(vigente.identificadorExterno);
    } catch (erro) {
      console.warn(
        `[emitir-documento] provedor recusou cancelar ${vigente.identificadorExterno}:`,
        erro instanceof Error ? erro.message : erro,
      );
    }
    vigente.cancelar();
    await this.repositorios.documentos.salvar(vigente);
  }
}

function montarPagador(contexto: ContextoDeCobranca) {
  return {
    nome: contexto.clienteNome,
    documento: contexto.clienteDocumento,
    email: contexto.clienteEmail,
    telefone: contexto.clienteWhatsApp ?? contexto.clienteTelefone,
    logradouro: contexto.logradouro,
    numero: contexto.numeroDoEndereco,
    complemento: contexto.complemento,
    bairro: contexto.bairro,
    cidade: contexto.cidade,
    uf: contexto.uf,
    cep: contexto.cep,
  };
}
