import { Parcela } from '../../../domain/contratos/parcela.js';
import { Renegociacao, type ApuracaoDoAcordo } from '../../../domain/contratos/renegociacao.js';
import type { Periodicidade } from '../../../domain/contratos/tipos.js';
import { ErroDeRegraDeNegocio, ErroNaoEncontrado } from '../../../domain/shared/errors.js';
import { Identificador } from '../../../domain/shared/identificador.js';
import type { DataCivil } from '../../../domain/value-objects/data-civil.js';
import type { Dinheiro } from '../../../domain/value-objects/dinheiro.js';
import type { GeradorDeIdentificador, Relogio } from '../../ports/comuns.js';
import type { Repositorios, UnidadeDeTrabalho } from '../../ports/repositorios.js';

export interface EntradaDeRenegociacao {
  readonly contratoId: string;
  readonly parcelaIds: readonly string[];
  readonly incluirEncargos: boolean;
  readonly desconto: Dinheiro;
  readonly entradaDoAcordo: Dinheiro;
  readonly dataDaEntrada: DataCivil | null;
  readonly quantidadeDeParcelas: number;
  readonly primeiroVencimento: DataCivil;
  readonly periodicidade: Periodicidade;
  readonly acordadoEm: DataCivil;
  readonly motivo: string | null;
  readonly registradoPor: string | null;
}

export interface SaidaDeRenegociacao {
  readonly renegociacaoId: string;
  readonly apuracao: ApuracaoDoAcordo;
  readonly parcelasSubstituidas: number;
  readonly parcelasGeradas: number;
}

/**
 * Substitui parcelas em aberto por um novo plano acordado com o cliente.
 *
 * As parcelas antigas viram RENEGOCIADA em vez de sumir: o extrato precisa
 * mostrar o que virou o que, ou ninguem consegue auditar o acordo depois. As
 * novas continuam a numeracao do contrato, para nao colidir com as originais.
 */
export class RenegociarContrato {
  constructor(
    private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
    private readonly geradorDeIdentificador: GeradorDeIdentificador,
    private readonly relogio: Relogio,
  ) {}

  /** Previa do acordo, sem gravar — o operador confere o valor antes de fechar. */
  async apurar(
    repositorios: Repositorios,
    entrada: Pick<EntradaDeRenegociacao, 'contratoId' | 'parcelaIds' | 'incluirEncargos' | 'desconto'> & {
      dataDeApuracao?: DataCivil;
    },
  ): Promise<ApuracaoDoAcordo> {
    const contrato = await repositorios.contratos.porId(entrada.contratoId);
    if (!contrato) throw new ErroNaoEncontrado('Contrato', entrada.contratoId);

    const parcelas = await this.carregarParcelas(repositorios, entrada.contratoId, entrada.parcelaIds);

    return Renegociacao.apurar({
      parcelas,
      politica: contrato.politicaDeEncargos,
      dataDeApuracao: entrada.dataDeApuracao ?? this.relogio.hoje(),
      incluirEncargos: entrada.incluirEncargos,
      desconto: entrada.desconto,
    });
  }

  async executar(entrada: EntradaDeRenegociacao): Promise<SaidaDeRenegociacao> {
    return this.unidadeDeTrabalho.executar(async (repositorios) => {
      const contrato = await repositorios.contratos.porId(entrada.contratoId);
      if (!contrato) throw new ErroNaoEncontrado('Contrato', entrada.contratoId);
      contrato.garantirQuePodeReceberCobranca();

      const parcelas = await this.carregarParcelas(repositorios, entrada.contratoId, entrada.parcelaIds);

      const renegociacao = Renegociacao.nova({
        id: Identificador.de(this.geradorDeIdentificador.gerar()),
        contratoId: contrato.id,
        parcelas,
        politica: contrato.politicaDeEncargos,
        incluirEncargos: entrada.incluirEncargos,
        desconto: entrada.desconto,
        entradaDoAcordo: entrada.entradaDoAcordo,
        dataDaEntrada: entrada.dataDaEntrada,
        quantidadeDeParcelas: entrada.quantidadeDeParcelas,
        primeiroVencimento: entrada.primeiroVencimento,
        periodicidade: entrada.periodicidade,
        acordadoEm: entrada.acordadoEm,
        motivo: entrada.motivo,
        registradoPor: entrada.registradoPor,
      });

      const maiorNumero = await repositorios.contratos.maiorNumeroDeParcela(entrada.contratoId);
      const novasParcelas = renegociacao.gerarParcelas(maiorNumero).map((especificacao) =>
        Parcela.nova({
          id: Identificador.de(this.geradorDeIdentificador.gerar()),
          contratoId: contrato.id,
          numero: especificacao.numero,
          tipo: especificacao.tipo,
          valorOriginal: especificacao.valor,
          vencimento: especificacao.vencimento,
          descricao: especificacao.descricao,
        }),
      );

      for (const parcela of parcelas) {
        parcela.marcarComoRenegociada();
      }

      await repositorios.renegociacoes.salvar(renegociacao);
      await repositorios.parcelas.salvarVarias(parcelas);
      await repositorios.parcelas.criarVarias(novasParcelas);

      return {
        renegociacaoId: renegociacao.id.paraString(),
        apuracao: renegociacao.apuracao,
        parcelasSubstituidas: parcelas.length,
        parcelasGeradas: novasParcelas.length,
      };
    });
  }

  private async carregarParcelas(
    repositorios: Repositorios,
    contratoId: string,
    parcelaIds: readonly string[],
  ): Promise<Parcela[]> {
    const parcelas = await repositorios.parcelas.porIds(parcelaIds);

    if (parcelas.length !== parcelaIds.length) {
      throw new ErroNaoEncontrado('Parcela', 'uma ou mais parcelas informadas nao existem');
    }
    // Trocar o id de uma parcela de outro contrato nao pode virar acordo aqui.
    const deOutroContrato = parcelas.filter((parcela) => parcela.contratoId.paraString() !== contratoId);
    if (deOutroContrato.length > 0) {
      throw new ErroDeRegraDeNegocio('Ha parcelas de outro contrato na selecao da renegociacao.');
    }
    return parcelas;
  }
}
