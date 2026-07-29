import { Contrato } from '../../../domain/contratos/contrato.js';
import { Parcela } from '../../../domain/contratos/parcela.js';
import { ErroDeConflito, ErroDeRegraDeNegocio, ErroNaoEncontrado } from '../../../domain/shared/errors.js';
import { Identificador } from '../../../domain/shared/identificador.js';
import type { DataCivil } from '../../../domain/value-objects/data-civil.js';
import type { GeradorDeIdentificador } from '../../ports/comuns.js';
import type { UnidadeDeTrabalho } from '../../ports/repositorios.js';
import { montarPolitica, montarTermos, type CondicoesComerciais } from './dados-do-contrato.js';

export interface EntradaDeCriacaoDeContrato extends CondicoesComerciais {
  readonly numero: string;
  readonly clienteId: string;
  readonly loteId: string;
  readonly corretorId: string | null;
  readonly dataAssinatura: DataCivil;
  readonly observacoes: string | null;
}

export interface SaidaDeCriacaoDeContrato {
  readonly contratoId: string;
  readonly numero: string;
  readonly parcelasGeradas: number;
}

/**
 * Cria o contrato e materializa TODAS as parcelas na mesma transacao.
 *
 * Gerar as parcelas junto e o ponto central do sistema: e delas que sai toda
 * cobranca. Um contrato salvo sem parcelas seria um contrato invisivel para a
 * regua — o cliente simplesmente nunca seria cobrado. Por isso e tudo ou nada.
 */
export class CriarContrato {
  constructor(
    private readonly unidadeDeTrabalho: UnidadeDeTrabalho,
    private readonly geradorDeIdentificador: GeradorDeIdentificador,
  ) {}

  async executar(entrada: EntradaDeCriacaoDeContrato): Promise<SaidaDeCriacaoDeContrato> {
    const termos = montarTermos(entrada);
    const politica = montarPolitica(entrada);

    return this.unidadeDeTrabalho.executar(async (repositorios) => {
      if (await repositorios.contratos.porNumero(entrada.numero.trim())) {
        throw new ErroDeConflito(`Ja existe contrato com o numero ${entrada.numero}.`);
      }

      const cliente = await repositorios.clientes.porId(entrada.clienteId);
      if (!cliente) throw new ErroNaoEncontrado('Cliente', entrada.clienteId);

      const lote = await repositorios.lotes.porId(entrada.loteId);
      if (!lote) throw new ErroNaoEncontrado('Lote', entrada.loteId);
      if (!lote.estaDisponivelParaVenda()) {
        throw new ErroDeRegraDeNegocio(
          `Lote ${lote.numero} esta ${lote.situacao.toLowerCase()} e nao pode ser vendido.`,
        );
      }

      const contrato = Contrato.novo({
        id: Identificador.de(this.geradorDeIdentificador.gerar()),
        numero: entrada.numero,
        clienteId: cliente.id,
        loteId: lote.id,
        corretorId: entrada.corretorId ? Identificador.de(entrada.corretorId) : null,
        termos,
        politicaDeEncargos: politica,
        indiceReajuste: entrada.indiceReajuste,
        dataAssinatura: entrada.dataAssinatura,
        observacoes: entrada.observacoes,
      });

      const parcelas = contrato.gerarPlanoDeParcelas().map((especificacao) =>
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

      lote.vender();

      await repositorios.contratos.salvar(contrato);
      await repositorios.parcelas.criarVarias(parcelas);
      await repositorios.lotes.salvar(lote);

      return {
        contratoId: contrato.id.paraString(),
        numero: contrato.numero,
        parcelasGeradas: parcelas.length,
      };
    });
  }
}
