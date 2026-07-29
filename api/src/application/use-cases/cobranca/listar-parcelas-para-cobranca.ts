import type { DocumentoDeCobranca } from '../../../domain/cobranca/documento-de-cobranca.js';
import type { DemonstrativoDeDebito, Parcela } from '../../../domain/contratos/parcela.js';
import type { SituacaoParcela } from '../../../domain/contratos/tipos.js';
import type { DataCivil } from '../../../domain/value-objects/data-civil.js';
import { Dinheiro } from '../../../domain/value-objects/dinheiro.js';
import type { Pagina, ParametrosDePaginacao, Relogio } from '../../ports/comuns.js';
import { montarPagina } from '../../ports/comuns.js';
import type { ConsultaDeContextoDeCobranca, ContextoDeCobranca } from '../../ports/consulta-de-contexto.js';
import type { FiltroDeParcelas, Repositorios } from '../../ports/repositorios.js';

export interface FiltroDaTelaDeCobranca extends ParametrosDePaginacao {
  readonly situacao?: SituacaoParcela;
  readonly de?: DataCivil;
  readonly ate?: DataCivil;
  readonly contratoId?: string;
  readonly clienteId?: string;
  readonly loteamentoId?: string;
  readonly dataDeReferencia?: DataCivil;
}

export interface LinhaDeCobranca {
  readonly parcela: Parcela;
  readonly contexto: ContextoDeCobranca | null;
  readonly situacao: SituacaoParcela;
  readonly demonstrativo: DemonstrativoDeDebito;
  readonly documentoVigente: DocumentoDeCobranca | null;
}

/**
 * A tela de cobranca: quem deve o que, hoje.
 *
 * "Vencida", "vence hoje" e "a vencer" nao sao colunas — sao janelas de data
 * sobre as parcelas em aberto. Traduzimos a situacao pedida em intervalo de
 * vencimento e deixamos o indice `(status, vencimento)` fazer o trabalho.
 */
export class ListarParcelasParaCobranca {
  constructor(
    private readonly repositorios: Repositorios,
    private readonly consultaDeContexto: ConsultaDeContextoDeCobranca,
    private readonly relogio: Relogio,
  ) {}

  async executar(filtro: FiltroDaTelaDeCobranca): Promise<Pagina<LinhaDeCobranca>> {
    const referencia = filtro.dataDeReferencia ?? this.relogio.hoje();
    const pagina = await this.repositorios.parcelas.listar(this.traduzirFiltro(filtro, referencia));

    if (pagina.itens.length === 0) return montarPagina<LinhaDeCobranca>([], pagina.total, filtro);

    const parcelaIds = pagina.itens.map((parcela) => parcela.id.paraString());
    const contratoIds = [...new Set(pagina.itens.map((parcela) => parcela.contratoId.paraString()))];

    const [contextos, documentos, contratos] = await Promise.all([
      this.consultaDeContexto.porParcelas(parcelaIds),
      this.repositorios.documentos.vigentesDasParcelas(parcelaIds),
      this.repositorios.contratos.porIds(contratoIds),
    ]);

    const linhas = pagina.itens.map((parcela) => {
      const contrato = contratos.get(parcela.contratoId.paraString());
      return {
        parcela,
        contexto: contextos.get(parcela.id.paraString()) ?? null,
        situacao: parcela.situacaoEm(referencia),
        // Sem o contrato nao ha politica de mora; o saldo puro ainda e util na tela.
        demonstrativo: contrato
          ? parcela.demonstrativoEm(contrato.politicaDeEncargos, referencia)
          : {
              saldoPrincipal: parcela.saldoPrincipal(),
              multa: Dinheiro.ZERO,
              juros: Dinheiro.ZERO,
              total: parcela.saldoPrincipal(),
              diasDeAtraso: parcela.diasDeAtrasoEm(referencia),
              diasCobrados: 0,
            },
        documentoVigente: documentos.get(parcela.id.paraString()) ?? null,
      };
    });

    return montarPagina(linhas, pagina.total, filtro);
  }

  private traduzirFiltro(filtro: FiltroDaTelaDeCobranca, referencia: DataCivil): FiltroDeParcelas {
    const base = {
      pagina: filtro.pagina,
      porPagina: filtro.porPagina,
      contratoId: filtro.contratoId,
      clienteId: filtro.clienteId,
      loteamentoId: filtro.loteamentoId,
    };

    switch (filtro.situacao) {
      case 'VENCIDA':
        return { ...base, somenteEmAberto: true, vencendoDe: filtro.de, vencendoAte: referencia.somarDias(-1) };
      case 'VENCE_HOJE':
        return { ...base, somenteEmAberto: true, vencendoDe: referencia, vencendoAte: referencia };
      case 'A_VENCER':
        return { ...base, somenteEmAberto: true, vencendoDe: referencia.somarDias(1), vencendoAte: filtro.ate };
      case 'PAGA':
        return { ...base, status: ['PAGA'], vencendoDe: filtro.de, vencendoAte: filtro.ate };
      case 'PAGA_PARCIAL':
        return { ...base, status: ['PAGA_PARCIAL'], vencendoDe: filtro.de, vencendoAte: filtro.ate };
      case 'CANCELADA':
        return { ...base, status: ['CANCELADA'], vencendoDe: filtro.de, vencendoAte: filtro.ate };
      case 'RENEGOCIADA':
        return { ...base, status: ['RENEGOCIADA'], vencendoDe: filtro.de, vencendoAte: filtro.ate };
      default:
        return { ...base, vencendoDe: filtro.de, vencendoAte: filtro.ate };
    }
  }
}
