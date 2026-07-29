import type { Canal, TipoDocumento } from '../../../domain/cobranca/tipos.js';
import { ErroDeRegraDeNegocio, ErroNaoEncontrado } from '../../../domain/shared/errors.js';
import type { DataCivil } from '../../../domain/value-objects/data-civil.js';
import type { Relogio } from '../../ports/comuns.js';
import type { ConsultaDeContextoDeCobranca } from '../../ports/consulta-de-contexto.js';
import type { Repositorios } from '../../ports/repositorios.js';
import { ServicoDeEnvioDeCobranca, type ResultadoDaCobranca } from '../../servicos/servico-de-envio-de-cobranca.js';
import { ServicoDeDocumentoAtualizado } from '../../servicos/servico-de-documento-atualizado.js';

export interface EntradaDeCobrancaAvulsa {
  readonly parcelaId: string;
  /** Sem canal informado, usa a ordem de preferencia padrao. */
  readonly canais?: readonly Canal[];
  readonly modelo?: string;
  readonly dataDeReferencia?: DataCivil;
  /** Padrao: emite/reemite o documento para a mensagem sair com boleto e Pix. */
  readonly emitirDocumento?: boolean;
  readonly tipoDeDocumento?: TipoDocumento;
}

const CANAIS_PADRAO: readonly Canal[] = ['WHATSAPP', 'EMAIL', 'SMS'];

/**
 * Cobranca disparada na hora pelo operador, fora da regua.
 *
 * Diferente do ciclo automatico, aqui a chave de idempotencia inclui o instante
 * do disparo: se o financeiro clicar em "cobrar" tres vezes, sao tres cobrancas
 * no historico — foi uma decisao humana consciente, nao repeticao acidental do
 * job. O modelo escolhido depende do estado da parcela, para nao mandar
 * "lembrete de vencimento" para quem esta 40 dias atrasado.
 */
export class EnviarCobrancaAvulsa {
  constructor(
    private readonly repositorios: Repositorios,
    private readonly consultaDeContexto: ConsultaDeContextoDeCobranca,
    private readonly servicoDeEnvio: ServicoDeEnvioDeCobranca,
    private readonly servicoDeDocumento: ServicoDeDocumentoAtualizado,
    private readonly relogio: Relogio,
  ) {}

  async executar(entrada: EntradaDeCobrancaAvulsa): Promise<ResultadoDaCobranca> {
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

    const contexto = (await this.consultaDeContexto.porParcelas([entrada.parcelaId])).get(entrada.parcelaId);
    if (!contexto) throw new ErroNaoEncontrado('Contexto de cobranca da parcela', entrada.parcelaId);

    const modelos = await this.repositorios.modelos.mapa();
    const chaveDoModelo = entrada.modelo ?? this.escolherModelo(parcela.diasDeAtrasoEm(referencia), parcela.vencimento, referencia);
    const modelo = ServicoDeEnvioDeCobranca.garantirModelo(modelos, chaveDoModelo);

    // Mesma garantia da regua: cobranca avulsa tambem sai com meio de pagamento.
    const vigente = await this.repositorios.documentos.vigenteDaParcela(entrada.parcelaId);
    const documento = (entrada.emitirDocumento ?? true)
      ? await this.servicoDeDocumento.garantir({
          parcela,
          contrato,
          tipo: entrada.tipoDeDocumento ?? 'BOLETO_COM_PIX',
          dataDeReferencia: referencia,
          documentoVigente: vigente,
        })
      : vigente;

    const diasDeAtraso = parcela.diasDeAtrasoEm(referencia);

    return this.servicoDeEnvio.enviar({
      parcela,
      contrato,
      contexto,
      documento,
      gatilho: diasDeAtraso > 0 ? 'APOS_O_VENCIMENTO' : 'ANTES_DO_VENCIMENTO',
      dias: diasDeAtraso,
      canaisPreferidos: entrada.canais?.length ? entrada.canais : CANAIS_PADRAO,
      modelo,
      chaveDeIdempotencia: `${entrada.parcelaId}:AVULSA:${this.relogio.agora().toISOString()}`,
      dataDeReferencia: referencia,
    });
  }

  private escolherModelo(diasDeAtraso: number, vencimento: DataCivil, referencia: DataCivil): string {
    if (diasDeAtraso >= 30) return 'atraso_grave';
    if (diasDeAtraso > 0) return 'atraso';
    return vencimento.igualA(referencia) ? 'vencimento' : 'lembrete';
  }
}
