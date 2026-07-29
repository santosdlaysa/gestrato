import type { DocumentoDeCobranca } from '../../domain/cobranca/documento-de-cobranca.js';
import type { TipoDocumento } from '../../domain/cobranca/tipos.js';
import type { Contrato } from '../../domain/contratos/contrato.js';
import type { Parcela } from '../../domain/contratos/parcela.js';
import type { DataCivil } from '../../domain/value-objects/data-civil.js';
import type { RepositorioDeDocumentos } from '../ports/repositorios.js';
import type { EmitirDocumento } from '../use-cases/cobranca/emitir-documento.js';

/**
 * Garante que a parcela tenha um boleto/Pix valendo o valor de hoje.
 *
 * Sem isto, a cobranca automatica saia com `{{linhaDigitavel}}` e `{{pix}}`
 * vazios sempre que ninguem tivesse emitido o documento manualmente — ou seja,
 * o cliente recebia a mensagem sem como pagar.
 *
 * A comparacao e por VALOR, nao por existencia. Uma parcela vencida muda de
 * valor todo dia (juros pro rata die), entao um documento emitido na semana
 * passada cobra a menos. Como a regua so dispara em dias especificos, a
 * reemissao acontece nesses marcos e nao diariamente.
 */
export class ServicoDeDocumentoAtualizado {
  constructor(
    private readonly documentos: RepositorioDeDocumentos,
    private readonly emitirDocumento: EmitirDocumento,
  ) {}

  async garantir(entrada: {
    parcela: Parcela;
    contrato: Contrato;
    tipo: TipoDocumento;
    dataDeReferencia: DataCivil;
    documentoVigente?: DocumentoDeCobranca | null;
  }): Promise<DocumentoDeCobranca | null> {
    const parcelaId = entrada.parcela.id.paraString();

    const vigente =
      entrada.documentoVigente !== undefined
        ? entrada.documentoVigente
        : await this.documentos.vigenteDaParcela(parcelaId);

    const valorAtual = entrada.parcela.demonstrativoEm(
      entrada.contrato.politicaDeEncargos,
      entrada.dataDeReferencia,
    ).total;

    if (vigente && vigente.valor.igualA(valorAtual) && vigente.tipo === entrada.tipo) {
      return vigente;
    }

    try {
      return await this.emitirDocumento.executar({
        parcelaId,
        tipo: entrada.tipo,
        reemitir: vigente !== null,
        dataDeReferencia: entrada.dataDeReferencia,
      });
    } catch (erro) {
      // Falha na emissao nao pode cancelar a cobranca: e melhor mandar a
      // mensagem sem o boleto do que nao avisar o cliente do vencimento.
      console.warn(
        `[documento-atualizado] falha ao emitir para a parcela ${parcelaId}:`,
        erro instanceof Error ? erro.message : erro,
      );
      return vigente;
    }
  }
}
