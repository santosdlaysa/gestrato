import { Cobranca } from '../../domain/cobranca/cobranca.js';
import type { DocumentoDeCobranca } from '../../domain/cobranca/documento-de-cobranca.js';
import {
  RedatorDeMensagens,
  type DadosDaMensagem,
  type ModeloDeMensagem,
} from '../../domain/cobranca/redator-de-mensagens.js';
import type { Canal, Gatilho } from '../../domain/cobranca/tipos.js';
import type { Contrato } from '../../domain/contratos/contrato.js';
import type { Parcela } from '../../domain/contratos/parcela.js';
import { ErroDeRegraDeNegocio } from '../../domain/shared/errors.js';
import { Identificador } from '../../domain/shared/identificador.js';
import { Telefone } from '../../domain/value-objects/contato.js';
import type { DataCivil } from '../../domain/value-objects/data-civil.js';
import type { GeradorDeIdentificador, Relogio } from '../ports/comuns.js';
import type { ContextoDeCobranca } from '../ports/consulta-de-contexto.js';
import type { Mensageria } from '../ports/mensageria.js';
import type { RepositorioDeCobrancas } from '../ports/repositorios.js';

export interface PedidoDeCobranca {
  readonly parcela: Parcela;
  readonly contrato: Contrato;
  readonly contexto: ContextoDeCobranca;
  readonly documento: DocumentoDeCobranca | null;
  readonly gatilho: Gatilho;
  readonly dias: number;
  readonly canaisPreferidos: readonly Canal[];
  readonly modelo: ModeloDeMensagem;
  readonly chaveDeIdempotencia: string;
  readonly dataDeReferencia: DataCivil;
}

export type ResultadoDaCobranca =
  | { readonly situacao: 'ENVIADA'; readonly cobranca: Cobranca }
  | { readonly situacao: 'FALHA'; readonly cobranca: Cobranca; readonly motivo: string }
  | { readonly situacao: 'SEM_CANAL'; readonly motivo: string };

/**
 * Monta e envia uma comunicacao de cobranca, gravando o historico.
 *
 * Usado tanto pela regua automatica quanto pela cobranca avulsa disparada na
 * tela — assim o texto, a escolha de canal e o registro sao identicos nos dois
 * caminhos. O registro e criado ANTES do envio: se o provedor cair no meio,
 * fica a linha com o erro em vez de sumir o rastro da tentativa.
 */
export class ServicoDeEnvioDeCobranca {
  constructor(
    private readonly cobrancas: RepositorioDeCobrancas,
    private readonly mensageria: Mensageria,
    private readonly geradorDeIdentificador: GeradorDeIdentificador,
    private readonly relogio: Relogio,
    private readonly nomeDaEmpresa: string,
    private readonly urlPublica: string,
  ) {}

  async enviar(pedido: PedidoDeCobranca): Promise<ResultadoDaCobranca> {
    const escolha = this.escolherCanal(pedido.canaisPreferidos, pedido.contexto);
    if (!escolha) {
      return {
        situacao: 'SEM_CANAL',
        motivo: `Cliente ${pedido.contexto.clienteNome} nao tem contato para ${pedido.canaisPreferidos.join('/')}.`,
      };
    }

    const demonstrativo = pedido.parcela.demonstrativoEm(
      pedido.contrato.politicaDeEncargos,
      pedido.dataDeReferencia,
    );
    const mensagem = RedatorDeMensagens.redigir(pedido.modelo, this.montarDados(pedido, demonstrativo));

    const cobranca = Cobranca.nova({
      id: Identificador.de(this.geradorDeIdentificador.gerar()),
      contratoId: pedido.contrato.id,
      parcelaId: pedido.parcela.id,
      clienteId: Identificador.de(pedido.contexto.clienteId),
      chaveDeIdempotencia: pedido.chaveDeIdempotencia,
      gatilho: pedido.gatilho,
      dias: pedido.dias,
      canal: escolha.canal,
      destino: escolha.destino,
      assunto: mensagem.assunto,
      mensagem: mensagem.corpo,
      valorCobrado: demonstrativo.total,
      dataDeReferencia: pedido.dataDeReferencia,
      criadaEm: this.relogio.agora(),
    });
    await this.cobrancas.salvar(cobranca);

    const resultado = await this.mensageria.enviar({
      canal: escolha.canal,
      destino: escolha.destino,
      assunto: mensagem.assunto,
      corpo: mensagem.corpo,
    });

    if (resultado.sucesso) {
      cobranca.registrarEnvio(resultado.identificadorNoProvedor, this.relogio.agora());
      await this.cobrancas.salvar(cobranca);
      return { situacao: 'ENVIADA', cobranca };
    }

    const motivo = resultado.erro ?? 'Falha desconhecida no provedor de mensagens.';
    cobranca.registrarFalha(motivo);
    await this.cobrancas.salvar(cobranca);
    return { situacao: 'FALHA', cobranca, motivo };
  }

  /**
   * Primeiro canal preferido para o qual o cliente tem contato.
   *
   * SMS exige celular: mandar SMS para telefone fixo e desperdicio garantido.
   */
  private escolherCanal(
    preferidos: readonly Canal[],
    contexto: ContextoDeCobranca,
  ): { canal: Canal; destino: string } | null {
    const suportados = new Set(this.mensageria.canaisSuportados());

    for (const canal of preferidos) {
      if (!suportados.has(canal)) continue;
      const destino = this.destinoPara(canal, contexto);
      if (destino) return { canal, destino };
    }
    return null;
  }

  private destinoPara(canal: Canal, contexto: ContextoDeCobranca): string | null {
    switch (canal) {
      case 'WHATSAPP':
        return numeroParaEnvio(contexto.clienteWhatsApp);
      case 'SMS':
        return numeroParaEnvio(contexto.clienteWhatsApp ?? contexto.clienteTelefone);
      case 'EMAIL':
        return contexto.clienteEmail;
    }
  }

  private montarDados(
    pedido: PedidoDeCobranca,
    demonstrativo: ReturnType<Parcela['demonstrativoEm']>,
  ): DadosDaMensagem {
    const { contexto, parcela, documento } = pedido;
    return {
      cliente: contexto.clienteNome,
      contrato: contexto.contratoNumero,
      loteamento: contexto.loteamento,
      quadra: contexto.quadra,
      lote: contexto.lote,
      parcela: parcela.numero,
      totalDeParcelas: contexto.totalDeParcelas,
      vencimento: parcela.vencimento,
      diasDeAtraso: demonstrativo.diasDeAtraso,
      valor: parcela.valorOriginal,
      valorAtualizado: demonstrativo.total,
      multa: demonstrativo.multa,
      juros: demonstrativo.juros,
      linhaDigitavel: documento?.linhaDigitavel ?? null,
      pix: documento?.pixCopiaECola ?? null,
      link: documento?.urlDoDocumento ?? `${this.urlPublica}/parcelas/${parcela.id.paraString()}`,
      empresa: this.nomeDaEmpresa,
    };
  }

  /** Exposto para teste: a conversao do numero e a parte que mais engana. */
  static numeroParaEnvio(bruto: string | null): string | null {
    return numeroParaEnvio(bruto);
  }

  /** Modelo ausente e erro de configuracao, nao motivo para mandar texto quebrado. */
  static garantirModelo(modelos: Map<string, ModeloDeMensagem>, chave: string): ModeloDeMensagem {
    const modelo = modelos.get(chave);
    if (!modelo) {
      throw new ErroDeRegraDeNegocio(
        `Modelo de mensagem "${chave}" nao esta cadastrado. Configure-o em Regua de cobranca.`,
      );
    }
    return modelo;
  }
}

/**
 * Converte o numero guardado no cadastro para o formato que os provedores de
 * WhatsApp e SMS exigem: codigo do pais + DDD + numero (5595991371313).
 *
 * O banco guarda apenas DDD + numero (11 digitos), que e como a operacao digita
 * e confere. Mandar assim para o provedor faz a mensagem ser recusada ou
 * roteada para outro pais — falta o codigo de discagem.
 *
 * WhatsApp e SMS so funcionam em celular, entao telefone fixo e descartado aqui
 * em vez de virar credito gasto a toa. Numero invalido no cadastro nao derruba
 * o ciclo: devolve `null`, a cobranca conta como "sem canal" e a equipe recebe
 * essa lista no resumo do dia.
 */
function numeroParaEnvio(bruto: string | null): string | null {
  if (!bruto) return null;
  try {
    const telefone = Telefone.de(bruto);
    return telefone.ehCelular() ? telefone.paraFormatoInternacional() : null;
  } catch {
    return null;
  }
}
