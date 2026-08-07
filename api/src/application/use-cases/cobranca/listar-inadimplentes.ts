import type { SituacaoDeAtraso } from '../../../domain/contratos/politica-de-inadimplencia.js';
import type { DataCivil } from '../../../domain/value-objects/data-civil.js';
import { Dinheiro } from '../../../domain/value-objects/dinheiro.js';
import type { Pagina, ParametrosDePaginacao, Relogio } from '../../ports/comuns.js';
import { montarPagina } from '../../ports/comuns.js';
import type { ConsultaDeInadimplencia } from '../../ports/consulta-de-inadimplencia.js';
import type { Repositorios } from '../../ports/repositorios.js';

/** Como ordenar a lista de devedores. Valor devido, no topo, e o padrao. */
export type OrdemDeInadimplencia = 'VALOR' | 'ATRASO' | 'NOME';

export interface FiltroDeInadimplentes extends ParametrosDePaginacao {
  readonly loteamentoId?: string;
  readonly clienteId?: string;
  readonly busca?: string;
  /** Degrau minimo da escala; sem ele, todo cliente com atraso aparece. */
  readonly risco?: SituacaoDeAtraso;
  readonly ordenarPor?: OrdemDeInadimplencia;
  readonly dataDeReferencia?: DataCivil;
}

export interface UnidadeDoCliente {
  readonly loteamento: string;
  readonly quadra: string;
  readonly lote: string;
}

/** Uma linha da consulta: o retrato do que um cliente deve, hoje. */
export interface Inadimplente {
  readonly clienteId: string;
  readonly clienteNome: string;
  readonly clienteDocumento: string;
  readonly clienteEmail: string | null;
  readonly clienteTelefone: string | null;
  readonly clienteWhatsApp: string | null;

  readonly totalEmAtrasoCentavos: number;
  readonly principalCentavos: number;
  readonly encargosCentavos: number;

  readonly parcelasVencidas: number;
  readonly contratosEmAtraso: number;
  readonly diasDeAtrasoMaximo: number;
  readonly vencimentoMaisAntigo: string;
  readonly diasAteARetomada: number;
  readonly risco: SituacaoDeAtraso;

  readonly unidadePrincipal: UnidadeDoCliente;
  readonly contratoIds: readonly string[];
}

/** Totais do conjunto filtrado — alimentam os cartoes no topo da tela. */
export interface ResumoDaInadimplencia {
  readonly clientes: number;
  readonly totalEmAtrasoCentavos: number;
  readonly principalCentavos: number;
  readonly encargosCentavos: number;
  readonly parcelasVencidas: number;
  readonly porRisco: Record<SituacaoDeAtraso, number>;
}

export interface RelatorioDeInadimplencia {
  readonly pagina: Pagina<Inadimplente>;
  readonly resumo: ResumoDaInadimplencia;
}

/** Acumulador mutavel usado enquanto agrupamos as parcelas por cliente. */
interface Acumulador {
  clienteId: string;
  clienteNome: string;
  clienteDocumento: string;
  clienteEmail: string | null;
  clienteTelefone: string | null;
  clienteWhatsApp: string | null;
  totalEmAtrasoCentavos: number;
  principalCentavos: number;
  encargosCentavos: number;
  parcelasVencidas: number;
  diasDeAtrasoMaximo: number;
  vencimentoMaisAntigo: DataCivil;
  contratoIds: Set<string>;
  unidadePrincipal: UnidadeDoCliente;
}

/**
 * A consulta de inadimplencia, agrupada por cliente.
 *
 * A inadimplencia nao e uma coluna: e o estado das parcelas vencidas de um
 * cliente confrontado com a escala da loteadora (8 dias -> inadimplente, 90 ->
 * sujeito a retomada). Somamos a mora parcela a parcela pela politica de cada
 * contrato e classificamos o cliente pelo pior atraso — quem tem uma parcela de
 * 100 dias esta sujeito a retomada mesmo que as outras estejam quase em dia.
 */
export class ListarInadimplentes {
  constructor(
    private readonly repositorios: Repositorios,
    private readonly consulta: ConsultaDeInadimplencia,
    private readonly relogio: Relogio,
  ) {}

  async executar(filtro: FiltroDeInadimplentes): Promise<RelatorioDeInadimplencia> {
    const referencia = filtro.dataDeReferencia ?? this.relogio.hoje();
    const politica = await this.repositorios.politicaDeInadimplencia.obter();

    const parcelas = await this.consulta.parcelasVencidas({
      ate: referencia,
      loteamentoId: filtro.loteamentoId,
      clienteId: filtro.clienteId,
      busca: filtro.busca,
    });

    if (parcelas.length === 0) {
      return { pagina: montarPagina<Inadimplente>([], 0, filtro), resumo: resumoVazio() };
    }

    // A mora depende da politica de encargos de cada contrato; carregamos todos
    // os contratos envolvidos de uma vez para nao ir ao banco por parcela.
    const contratoIds = [...new Set(parcelas.map((p) => p.contratoId))];
    const contratos = await this.repositorios.contratos.porIds(contratoIds);

    const porCliente = new Map<string, Acumulador>();

    // As parcelas vem ordenadas por vencimento asc: a primeira de cada cliente e
    // a mais antiga (maior atraso), e vira a "unidade principal" da linha.
    for (const item of parcelas) {
      const contrato = contratos.get(item.contratoId);
      const demonstrativo = contrato
        ? item.parcela.demonstrativoEm(contrato.politicaDeEncargos, referencia)
        : {
            saldoPrincipal: item.parcela.saldoPrincipal(),
            multa: Dinheiro.ZERO,
            juros: Dinheiro.ZERO,
            total: item.parcela.saldoPrincipal(),
            diasDeAtraso: item.parcela.diasDeAtrasoEm(referencia),
          };

      const encargosCentavos = demonstrativo.multa.centavos + demonstrativo.juros.centavos;
      let acumulador = porCliente.get(item.clienteId);
      if (!acumulador) {
        acumulador = {
          clienteId: item.clienteId,
          clienteNome: item.clienteNome,
          clienteDocumento: item.clienteDocumento,
          clienteEmail: item.clienteEmail,
          clienteTelefone: item.clienteTelefone,
          clienteWhatsApp: item.clienteWhatsApp,
          totalEmAtrasoCentavos: 0,
          principalCentavos: 0,
          encargosCentavos: 0,
          parcelasVencidas: 0,
          diasDeAtrasoMaximo: 0,
          vencimentoMaisAntigo: item.parcela.vencimento,
          contratoIds: new Set<string>(),
          unidadePrincipal: {
            loteamento: item.loteamento,
            quadra: item.quadra,
            lote: item.lote,
          },
        };
        porCliente.set(item.clienteId, acumulador);
      }

      acumulador.totalEmAtrasoCentavos += demonstrativo.total.centavos;
      acumulador.principalCentavos += demonstrativo.saldoPrincipal.centavos;
      acumulador.encargosCentavos += encargosCentavos;
      acumulador.parcelasVencidas += 1;
      acumulador.contratoIds.add(item.contratoId);
      acumulador.diasDeAtrasoMaximo = Math.max(acumulador.diasDeAtrasoMaximo, demonstrativo.diasDeAtraso);
      if (item.parcela.vencimento.anteriorA(acumulador.vencimentoMaisAntigo)) {
        acumulador.vencimentoMaisAntigo = item.parcela.vencimento;
      }
    }

    let linhas: Inadimplente[] = [...porCliente.values()].map((acumulador) => ({
      clienteId: acumulador.clienteId,
      clienteNome: acumulador.clienteNome,
      clienteDocumento: acumulador.clienteDocumento,
      clienteEmail: acumulador.clienteEmail,
      clienteTelefone: acumulador.clienteTelefone,
      clienteWhatsApp: acumulador.clienteWhatsApp,
      totalEmAtrasoCentavos: acumulador.totalEmAtrasoCentavos,
      principalCentavos: acumulador.principalCentavos,
      encargosCentavos: acumulador.encargosCentavos,
      parcelasVencidas: acumulador.parcelasVencidas,
      contratosEmAtraso: acumulador.contratoIds.size,
      diasDeAtrasoMaximo: acumulador.diasDeAtrasoMaximo,
      vencimentoMaisAntigo: acumulador.vencimentoMaisAntigo.paraIso(),
      diasAteARetomada: politica.diasAteARetomada(acumulador.diasDeAtrasoMaximo),
      risco: politica.classificar(acumulador.diasDeAtrasoMaximo),
      unidadePrincipal: acumulador.unidadePrincipal,
      contratoIds: [...acumulador.contratoIds],
    }));

    // O risco e derivado do pior atraso, entao so da para filtrar depois de
    // classificar cada cliente. Isso mantem os totais coerentes com a lista.
    if (filtro.risco) {
      linhas = linhas.filter((linha) => atendeAoRisco(linha.risco, filtro.risco!));
    }

    const resumo = resumir(linhas);
    ordenar(linhas, filtro.ordenarPor ?? 'VALOR');

    const inicio = (filtro.pagina - 1) * filtro.porPagina;
    const itens = linhas.slice(inicio, inicio + filtro.porPagina);

    return { pagina: montarPagina(itens, linhas.length, filtro), resumo };
  }
}

/** Ordem da escala: quanto maior, pior. Usada para o filtro "risco minimo". */
const NIVEL: Record<SituacaoDeAtraso, number> = {
  EM_DIA: 0,
  EM_ATRASO: 1,
  INADIMPLENTE: 2,
  SUJEITO_A_RETOMADA: 3,
};

function atendeAoRisco(risco: SituacaoDeAtraso, minimo: SituacaoDeAtraso): boolean {
  return NIVEL[risco] >= NIVEL[minimo];
}

function ordenar(linhas: Inadimplente[], ordem: OrdemDeInadimplencia): void {
  const porNome = (a: Inadimplente, b: Inadimplente) =>
    a.clienteNome.localeCompare(b.clienteNome, 'pt-BR');
  switch (ordem) {
    case 'NOME':
      linhas.sort(porNome);
      return;
    case 'ATRASO':
      linhas.sort((a, b) => b.diasDeAtrasoMaximo - a.diasDeAtrasoMaximo || porNome(a, b));
      return;
    default:
      linhas.sort((a, b) => b.totalEmAtrasoCentavos - a.totalEmAtrasoCentavos || porNome(a, b));
  }
}

function resumir(linhas: readonly Inadimplente[]): ResumoDaInadimplencia {
  const porRisco: Record<SituacaoDeAtraso, number> = {
    EM_DIA: 0,
    EM_ATRASO: 0,
    INADIMPLENTE: 0,
    SUJEITO_A_RETOMADA: 0,
  };
  let totalEmAtrasoCentavos = 0;
  let principalCentavos = 0;
  let encargosCentavos = 0;
  let parcelasVencidas = 0;
  for (const linha of linhas) {
    totalEmAtrasoCentavos += linha.totalEmAtrasoCentavos;
    principalCentavos += linha.principalCentavos;
    encargosCentavos += linha.encargosCentavos;
    parcelasVencidas += linha.parcelasVencidas;
    porRisco[linha.risco] += 1;
  }
  return {
    clientes: linhas.length,
    totalEmAtrasoCentavos,
    principalCentavos,
    encargosCentavos,
    parcelasVencidas,
    porRisco,
  };
}

function resumoVazio(): ResumoDaInadimplencia {
  return {
    clientes: 0,
    totalEmAtrasoCentavos: 0,
    principalCentavos: 0,
    encargosCentavos: 0,
    parcelasVencidas: 0,
    porRisco: { EM_DIA: 0, EM_ATRASO: 0, INADIMPLENTE: 0, SUJEITO_A_RETOMADA: 0 },
  };
}
