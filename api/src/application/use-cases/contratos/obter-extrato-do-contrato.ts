import type { Cliente } from '../../../domain/cadastros/cliente.js';
import type { DocumentoDeCobranca } from '../../../domain/cobranca/documento-de-cobranca.js';
import type { Contrato, PosicaoFinanceira } from '../../../domain/contratos/contrato.js';
import type { DemonstrativoDeDebito, Parcela } from '../../../domain/contratos/parcela.js';
import type { SituacaoParcela } from '../../../domain/contratos/tipos.js';
import { ErroNaoEncontrado } from '../../../domain/shared/errors.js';
import type { DataCivil } from '../../../domain/value-objects/data-civil.js';
import type { Relogio } from '../../ports/comuns.js';
import type { Repositorios } from '../../ports/repositorios.js';

export interface LinhaDoExtrato {
  readonly parcela: Parcela;
  readonly situacao: SituacaoParcela;
  readonly demonstrativo: DemonstrativoDeDebito;
  readonly documentoVigente: DocumentoDeCobranca | null;
}

export interface Extrato {
  readonly contrato: Contrato;
  readonly cliente: Cliente | null;
  readonly dataDeReferencia: DataCivil;
  readonly posicao: PosicaoFinanceira;
  readonly linhas: readonly LinhaDoExtrato[];
}

/**
 * Extrato completo do contrato numa data.
 *
 * Os valores atualizados sao calculados no momento da consulta, nunca lidos de
 * coluna: multa e juros mudam todo dia, e valor de mora gravado no banco fica
 * errado no instante seguinte.
 */
export class ObterExtratoDoContrato {
  constructor(
    private readonly repositorios: Repositorios,
    private readonly relogio: Relogio,
  ) {}

  async executar(contratoId: string, dataDeReferencia?: DataCivil): Promise<Extrato> {
    const contrato = await this.repositorios.contratos.porId(contratoId);
    if (!contrato) throw new ErroNaoEncontrado('Contrato', contratoId);

    const referencia = dataDeReferencia ?? this.relogio.hoje();
    const parcelas = await this.repositorios.parcelas.porContrato(contratoId);
    const politica = await this.repositorios.politicaDeInadimplencia.obter();

    const documentos = await this.repositorios.documentos.vigentesDasParcelas(
      parcelas.filter((parcela) => parcela.estaEmAberto()).map((parcela) => parcela.id.paraString()),
    );

    return {
      contrato,
      cliente: await this.repositorios.clientes.porId(contrato.clienteId.paraString()),
      dataDeReferencia: referencia,
      posicao: contrato.posicaoEm(parcelas, referencia, politica),
      linhas: parcelas.map((parcela) => ({
        parcela,
        situacao: parcela.situacaoEm(referencia),
        demonstrativo: parcela.demonstrativoEm(contrato.politicaDeEncargos, referencia),
        documentoVigente: documentos.get(parcela.id.paraString()) ?? null,
      })),
    };
  }
}
