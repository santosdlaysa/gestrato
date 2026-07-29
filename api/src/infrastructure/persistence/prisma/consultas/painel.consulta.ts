import { Prisma } from '@prisma/client';
import type {
  CobrancasEnviadasNoPainel,
  ConsultasDePainel,
  FaixaDeAging,
  ResumoDoPainel,
  TotalDeParcelas,
  TotalPorCompetencia,
  TotalPorFaixaDeAging,
} from '../../../../application/ports/consultas-de-painel.js';
import { FAIXAS_DE_AGING } from '../../../../application/ports/consultas-de-painel.js';
import type { PoliticaDeInadimplencia } from '../../../../domain/contratos/politica-de-inadimplencia.js';
import { DataCivil } from '../../../../domain/value-objects/data-civil.js';
import type { ClientePrisma } from '../cliente-prisma.js';
import { RepositorioDaPoliticaDeInadimplenciaPrisma } from '../repositorios/politica-de-inadimplencia.repositorio.js';

/**
 * Consultas agregadas do painel.
 *
 * Tudo e resolvido em SQL de proposito. Um painel de loteadora media percorre
 * centenas de contratos e dezenas de milhares de parcelas; trazer essas linhas
 * para o Node so para somar custaria memoria e tempo sem nenhum ganho de
 * expressividade — nao ha decisao de negocio aqui, so agregacao.
 *
 * Toda interpolacao usa a template tag `$queryRaw`, entao os valores viram
 * parametros do driver e nao texto concatenado (sem espaco para SQL injection).
 */

const MESES_NO_HISTORICO_DE_RECEBIMENTOS = 12;

/**
 * Tamanho da janela movel dos indicadores de cobranca, em dias.
 *
 * A janela e fechada nas duas pontas e termina na data de referencia, entao
 * trinta dias significam `[D-29, D]` — trinta datas, nao trinta e uma.
 */
const DIAS_DA_JANELA_DE_COBRANCA = 30;

// --------------------------------------------------------- pecas de SQL

/** Parcela viva: CANCELADA e RENEGOCIADA nunca entram em posicao. */
const PARCELA_EM_ABERTO = Prisma.sql`p.status IN ('PENDENTE', 'PAGA_PARCIAL')`;

/** Contrato que ainda gera direito de receber. */
const CONTRATO_VIGENTE = Prisma.sql`c.status NOT IN ('CANCELADO', 'DISTRATADO')`;

/**
 * Uma linha por parcela em aberto, com saldo, atraso e encargos ja calculados
 * na data de referencia.
 *
 * A formula abaixo e a traducao literal de `PoliticaDeEncargos.calcular`
 * (src/domain/contratos/politica-de-encargos.ts), que e a fonte de verdade:
 *
 *   saldo         = valorOriginal - valorPago - descontoConcedido  (nunca < 0)
 *   diasDeAtraso  = referencia - vencimento
 *   diasCobrados  = MAX(0, diasDeAtraso - diasDeCarencia)
 *   multa         = saldo * multaPorAtrasoPercentual/100           (uma unica vez)
 *   juros         = saldo * (jurosAoMesPercentual/100/30) * diasCobrados
 *
 * Sem dias cobrados nao ha encargo nenhum — e o que faz a carencia funcionar.
 * O arredondamento usa `FLOOR(x + 0.5)` sobre ponto flutuante para reproduzir
 * exatamente o half-up de `Dinheiro.multiplicarPor` (Math.round no JS); usar
 * `ROUND(numeric)` daria resultado quase sempre igual, mas "quase" nao serve
 * quando o numero vai para uma cobranca.
 */
export function posicoesDeParcelasEmAberto(referencia: DataCivil): Prisma.Sql {
  const data = dataParaSql(referencia);
  return Prisma.sql`
    SELECT
      p.id              AS parcela_id,
      p."vencimento"    AS vencimento,
      c.id              AS contrato_id,
      c.status::text    AS contrato_status,
      c."clienteId"     AS cliente_id,
      c."loteId"        AS lote_id,
      base.saldo        AS saldo,
      base.dias_de_atraso,
      carencia.dias_cobrados,
      encargos.multa,
      encargos.juros
    FROM parcelas p
    JOIN contratos c ON c.id = p."contratoId"
    CROSS JOIN LATERAL (
      SELECT
        GREATEST(p."valorOriginalCentavos" - p."valorPagoCentavos" - p."descontoConcedidoCentavos", 0) AS saldo,
        (${data} - p."vencimento") AS dias_de_atraso
    ) base
    CROSS JOIN LATERAL (
      SELECT GREATEST(0, base.dias_de_atraso - c."diasDeCarencia") AS dias_cobrados
    ) carencia
    CROSS JOIN LATERAL (
      SELECT
        CASE WHEN carencia.dias_cobrados > 0
          THEN FLOOR(base.saldo * (c."multaPorAtrasoPercentual" / 100.0) + 0.5)
          ELSE 0 END AS multa,
        CASE WHEN carencia.dias_cobrados > 0
          THEN FLOOR(base.saldo * ((c."jurosAoMesPercentual" / 100.0 / 30.0) * carencia.dias_cobrados) + 0.5)
          ELSE 0 END AS juros
    ) encargos
    WHERE ${PARCELA_EM_ABERTO} AND ${CONTRATO_VIGENTE}
  `;
}

/**
 * Maior atraso e vencido de cada contrato ATIVO, a partir do CTE `posicoes`.
 *
 * A escala classifica o contrato pelo pior caso entre suas parcelas — um
 * contrato com uma parcela de 100 dias e outra de 2 esta sujeito a retomada.
 * Por isso a agregacao e por contrato antes de classificar, nunca por parcela.
 * Contratos QUITADO nao aparecem porque nao tem parcela em aberto; o filtro
 * explicito por ATIVO deixa a intencao visivel e protege de dado inconsistente.
 */
export const ATRASO_MAXIMO_POR_CONTRATO = Prisma.sql`
  SELECT
    po.contrato_id,
    po.cliente_id,
    po.lote_id,
    MAX(po.dias_de_atraso)                                                            AS dias_de_atraso_maximo,
    COALESCE(SUM(po.saldo + po.multa + po.juros) FILTER (WHERE po.dias_de_atraso > 0), 0) AS valor_vencido,
    COALESCE(SUM(po.saldo), 0)                                                        AS saldo_devedor
  FROM posicoes po
  WHERE po.contrato_status = 'ATIVO'
  GROUP BY po.contrato_id, po.cliente_id, po.lote_id
`;

/**
 * Traducao da escala de `PoliticaDeInadimplencia.classificar` para SQL.
 * Os limiares entram como parametro para que a fonte de verdade continue sendo
 * a tabela, e nao um numero repetido dentro da consulta.
 */
export function classificacaoDeAtraso(politica: PoliticaDeInadimplencia): Prisma.Sql {
  return Prisma.sql`
    CASE
      WHEN dias_de_atraso_maximo <= 0                                    THEN 'EM_DIA'
      WHEN dias_de_atraso_maximo >= ${politica.diasParaRetomadaDoLote}   THEN 'SUJEITO_A_RETOMADA'
      WHEN dias_de_atraso_maximo >= ${politica.diasParaInadimplencia}    THEN 'INADIMPLENTE'
      ELSE 'EM_ATRASO'
    END
  `;
}

/** Expressao CASE que classifica os dias de atraso nas faixas do painel. */
export const CLASSIFICACAO_DE_AGING = Prisma.sql`
  CASE
    WHEN dias_de_atraso BETWEEN 1 AND 5   THEN '1-5'
    WHEN dias_de_atraso BETWEEN 6 AND 15  THEN '6-15'
    WHEN dias_de_atraso BETWEEN 16 AND 30 THEN '16-30'
    WHEN dias_de_atraso BETWEEN 31 AND 60 THEN '31-60'
    WHEN dias_de_atraso BETWEEN 61 AND 90 THEN '61-90'
    ELSE '90+'
  END
`;

/** Datas de negocio viajam como texto e sao convertidas pelo proprio Postgres. */
export function dataParaSql(data: DataCivil): Prisma.Sql {
  return Prisma.sql`${data.paraIso()}::date`;
}

/**
 * Agregados do Postgres chegam como `bigint`, `Decimal` ou `number` conforme o
 * tipo da coluna. Normaliza tudo para inteiro em centavos.
 */
export function inteiro(valor: unknown): number {
  if (valor === null || valor === undefined) return 0;
  if (typeof valor === 'bigint') return Number(valor);
  if (typeof valor === 'number') return Number.isFinite(valor) ? Math.round(valor) : 0;
  const numero = Number(String(valor));
  return Number.isFinite(numero) ? Math.round(numero) : 0;
}

/** Completa faixas sem parcela nenhuma — o painel sempre mostra as seis. */
export function montarAging(
  totais: ReadonlyMap<string, { quantidade: number; valorCentavos: number }>,
): TotalPorFaixaDeAging[] {
  return FAIXAS_DE_AGING.map((faixa: FaixaDeAging) => ({
    faixa,
    quantidade: totais.get(faixa)?.quantidade ?? 0,
    valorCentavos: totais.get(faixa)?.valorCentavos ?? 0,
  }));
}

export function somarAging(faixas: readonly TotalPorFaixaDeAging[][]): TotalPorFaixaDeAging[] {
  const acumulado = new Map<string, { quantidade: number; valorCentavos: number }>();
  for (const grupo of faixas) {
    for (const item of grupo) {
      const atual = acumulado.get(item.faixa) ?? { quantidade: 0, valorCentavos: 0 };
      acumulado.set(item.faixa, {
        quantidade: atual.quantidade + item.quantidade,
        valorCentavos: atual.valorCentavos + item.valorCentavos,
      });
    }
  }
  return montarAging(acumulado);
}

/** Sequencia de competencias "AAAA-MM" comecando no mes de `inicio`. */
export function competenciasSeguidas(inicio: DataCivil, quantidade: number): string[] {
  const primeiro = inicio.primeiroDiaDoMes();
  return Array.from({ length: quantidade }, (_, indice) => primeiro.somarMeses(indice).competencia());
}

// ------------------------------------------------------------- linhas cruas

interface LinhaDeContagemDeContratos {
  ativos: unknown;
  quitados: unknown;
}

interface LinhaDaEscalaDeAtraso {
  em_atraso: unknown;
  inadimplentes: unknown;
  sujeitos_a_retomada: unknown;
  clientes_inadimplentes: unknown;
  lotes_a_retomar: unknown;
  valor_a_retomar: unknown;
}

interface LinhaDeTotaisEmAberto {
  total_a_receber: unknown;
  total_vencido: unknown;
  principal_vencido: unknown;
  vencidas_quantidade: unknown;
  vencem_hoje_quantidade: unknown;
  vencem_hoje_valor: unknown;
  proximos_7_quantidade: unknown;
  proximos_7_valor: unknown;
}

interface LinhaDeAging {
  faixa: string;
  quantidade: unknown;
  valor: unknown;
}

interface LinhaDeRecebimentoMensal {
  competencia: string;
  valor: unknown;
}

interface LinhaDeCobrancasDaJanela {
  hoje: unknown;
  enviadas: unknown;
  falhas: unknown;
}

interface LinhaDeRecuperacao {
  recebido: unknown;
  original: unknown;
}

// ------------------------------------------------------------------ consulta

export class ConsultasDePainelPrisma implements ConsultasDePainel {
  private readonly politicas: RepositorioDaPoliticaDeInadimplenciaPrisma;

  constructor(private readonly prisma: ClientePrisma) {
    this.politicas = new RepositorioDaPoliticaDeInadimplenciaPrisma(prisma);
  }

  async resumo(data: DataCivil): Promise<ResumoDoPainel> {
    // A escala e lida a cada consulta, e nao guardada na instancia: mudar o
    // limiar tem que refletir no painel seguinte, sem reiniciar o processo.
    const politica = await this.politicas.obter();

    const [contratos, escala, totais, aging, recebimentos, cobrancasEnviadas, taxaDeRecuperacao] =
      await Promise.all([
        this.contarContratosPorStatus(),
        this.classificarContratosPelaEscalaDeAtraso(data, politica),
        this.somarPosicaoDasParcelasEmAberto(data),
        this.somarParcelasVencidasPorFaixaDeAtraso(data),
        this.somarRecebimentosDosUltimosMeses(data, MESES_NO_HISTORICO_DE_RECEBIMENTOS),
        this.contarCobrancasDaJanela(data),
        this.calcularTaxaDeRecuperacaoDaJanela(data),
      ]);

    const competenciaAtual = data.competencia();
    const totalRecebidoNoMesCentavos =
      recebimentos.find((mes) => mes.competencia === competenciaAtual)?.valorCentavos ?? 0;

    return {
      data: data.paraIso(),
      contratosAtivos: contratos.ativos,
      contratosQuitados: contratos.quitados,
      contratosEmAtraso: escala.contratosEmAtraso,
      contratosInadimplentes: escala.contratosInadimplentes,
      contratosSujeitosARetomada: escala.contratosSujeitosARetomada,
      clientesInadimplentes: escala.clientesInadimplentes,
      lotesARetomar: escala.lotesARetomar,
      politicaDeInadimplencia: politica.paraEstado(),
      totalAReceberCentavos: totais.totalAReceberCentavos,
      totalRecebidoNoMesCentavos,
      totalVencidoCentavos: totais.totalVencidoCentavos,
      percentualDeInadimplencia: calcularPercentualDeInadimplencia(
        totais.principalVencidoCentavos,
        totais.totalAReceberCentavos,
      ),
      taxaDeRecuperacao,
      parcelasQueVencemHoje: totais.parcelasQueVencemHoje,
      parcelasVencidas: totais.parcelasVencidas,
      proximos7Dias: totais.proximos7Dias,
      cobrancasEnviadas,
      recebimentosPorMes: recebimentos,
      aging,
    };
  }

  /** Quantos contratos em cada estado persistido — nao depende da data. */
  private async contarContratosPorStatus(): Promise<{ ativos: number; quitados: number }> {
    const linhas = await this.prisma.$queryRaw<LinhaDeContagemDeContratos[]>(Prisma.sql`
      SELECT
        COUNT(*) FILTER (WHERE c.status = 'ATIVO')   AS ativos,
        COUNT(*) FILTER (WHERE c.status = 'QUITADO') AS quitados
      FROM contratos c
    `);
    const linha = linhas.at(0);
    return { ativos: inteiro(linha?.ativos), quitados: inteiro(linha?.quitados) };
  }

  /**
   * Inadimplencia e derivada, nunca gravada — e agora escalonada.
   *
   * Um contrato so entra em `contratosInadimplentes` quando o maior atraso
   * entre suas parcelas alcanca `diasParaInadimplencia`. Quem esqueceu o boleto
   * por tres dias fica em `contratosEmAtraso` e nao polui a lista de cobranca.
   * `clientesInadimplentes` segue o mesmo limiar.
   */
  private async classificarContratosPelaEscalaDeAtraso(
    data: DataCivil,
    politica: PoliticaDeInadimplencia,
  ): Promise<{
    contratosEmAtraso: number;
    contratosInadimplentes: number;
    contratosSujeitosARetomada: number;
    clientesInadimplentes: number;
    lotesARetomar: { quantidade: number; valorVencidoCentavos: number };
  }> {
    const linhas = await this.prisma.$queryRaw<LinhaDaEscalaDeAtraso[]>(Prisma.sql`
      WITH posicoes AS (${posicoesDeParcelasEmAberto(data)}),
           atrasos AS (${ATRASO_MAXIMO_POR_CONTRATO}),
           classificados AS (
             SELECT
               contrato_id,
               cliente_id,
               lote_id,
               valor_vencido,
               ${classificacaoDeAtraso(politica)} AS situacao
             FROM atrasos
           )
      SELECT
        COUNT(*) FILTER (WHERE situacao = 'EM_ATRASO')                     AS em_atraso,
        COUNT(*) FILTER (WHERE situacao IN ('INADIMPLENTE', 'SUJEITO_A_RETOMADA')) AS inadimplentes,
        COUNT(*) FILTER (WHERE situacao = 'SUJEITO_A_RETOMADA')            AS sujeitos_a_retomada,
        COUNT(DISTINCT cliente_id) FILTER (WHERE situacao IN ('INADIMPLENTE', 'SUJEITO_A_RETOMADA'))
                                                                           AS clientes_inadimplentes,
        COUNT(DISTINCT lote_id) FILTER (WHERE situacao = 'SUJEITO_A_RETOMADA') AS lotes_a_retomar,
        COALESCE(SUM(valor_vencido) FILTER (WHERE situacao = 'SUJEITO_A_RETOMADA'), 0) AS valor_a_retomar
      FROM classificados
    `);
    const linha = linhas.at(0);
    return {
      contratosEmAtraso: inteiro(linha?.em_atraso),
      contratosInadimplentes: inteiro(linha?.inadimplentes),
      contratosSujeitosARetomada: inteiro(linha?.sujeitos_a_retomada),
      clientesInadimplentes: inteiro(linha?.clientes_inadimplentes),
      lotesARetomar: {
        quantidade: inteiro(linha?.lotes_a_retomar),
        valorVencidoCentavos: inteiro(linha?.valor_a_retomar),
      },
    };
  }

  /**
   * Totais de carteira: a receber, vencido, vence hoje e proximos sete dias.
   *
   * `total_vencido` sai com mora embutida — e o numero que o financeiro cobra.
   * `principal_vencido` sai sem mora, porque o indicador de inadimplencia
   * compara principal com principal (ver `calcularPercentualDeInadimplencia`).
   */
  private async somarPosicaoDasParcelasEmAberto(data: DataCivil): Promise<{
    totalAReceberCentavos: number;
    totalVencidoCentavos: number;
    principalVencidoCentavos: number;
    parcelasVencidas: TotalDeParcelas;
    parcelasQueVencemHoje: TotalDeParcelas;
    proximos7Dias: TotalDeParcelas;
  }> {
    const linhas = await this.prisma.$queryRaw<LinhaDeTotaisEmAberto[]>(Prisma.sql`
      WITH posicoes AS (${posicoesDeParcelasEmAberto(data)})
      SELECT
        COALESCE(SUM(saldo), 0)                                                             AS total_a_receber,
        COALESCE(SUM(saldo + multa + juros) FILTER (WHERE dias_de_atraso > 0), 0)           AS total_vencido,
        COALESCE(SUM(saldo) FILTER (WHERE dias_de_atraso > 0), 0)                           AS principal_vencido,
        COUNT(*) FILTER (WHERE dias_de_atraso > 0)                                          AS vencidas_quantidade,
        COUNT(*) FILTER (WHERE dias_de_atraso = 0)                                          AS vencem_hoje_quantidade,
        COALESCE(SUM(saldo) FILTER (WHERE dias_de_atraso = 0), 0)                           AS vencem_hoje_valor,
        COUNT(*) FILTER (WHERE dias_de_atraso BETWEEN -7 AND -1)                            AS proximos_7_quantidade,
        COALESCE(SUM(saldo) FILTER (WHERE dias_de_atraso BETWEEN -7 AND -1), 0)             AS proximos_7_valor
      FROM posicoes
    `);
    const linha = linhas.at(0);
    const totalVencidoCentavos = inteiro(linha?.total_vencido);
    return {
      totalAReceberCentavos: inteiro(linha?.total_a_receber),
      totalVencidoCentavos,
      principalVencidoCentavos: inteiro(linha?.principal_vencido),
      parcelasVencidas: {
        quantidade: inteiro(linha?.vencidas_quantidade),
        valorCentavos: totalVencidoCentavos,
      },
      parcelasQueVencemHoje: {
        quantidade: inteiro(linha?.vencem_hoje_quantidade),
        valorCentavos: inteiro(linha?.vencem_hoje_valor),
      },
      proximos7Dias: {
        quantidade: inteiro(linha?.proximos_7_quantidade),
        valorCentavos: inteiro(linha?.proximos_7_valor),
      },
    };
  }

  /** Vencido distribuido nas faixas de dias de atraso (o "aging" da carteira). */
  private async somarParcelasVencidasPorFaixaDeAtraso(data: DataCivil): Promise<TotalPorFaixaDeAging[]> {
    const linhas = await this.prisma.$queryRaw<LinhaDeAging[]>(Prisma.sql`
      WITH posicoes AS (${posicoesDeParcelasEmAberto(data)})
      SELECT
        ${CLASSIFICACAO_DE_AGING}          AS faixa,
        COUNT(*)                           AS quantidade,
        COALESCE(SUM(saldo + multa + juros), 0) AS valor
      FROM posicoes
      WHERE dias_de_atraso > 0
      GROUP BY 1
    `);
    return montarAging(indexarAging(linhas));
  }

  /**
   * Serie de recebimentos por competencia. Meses sem pagamento tem que aparecer
   * zerados, senao o grafico do painel "pula" o mes e engana quem olha.
   */
  private async somarRecebimentosDosUltimosMeses(
    data: DataCivil,
    meses: number,
  ): Promise<TotalPorCompetencia[]> {
    const inicio = data.primeiroDiaDoMes().somarMeses(-(meses - 1));
    const fim = data.ultimoDiaDoMes();

    const linhas = await this.prisma.$queryRaw<LinhaDeRecebimentoMensal[]>(Prisma.sql`
      SELECT
        to_char(pg."pagoEm", 'YYYY-MM')             AS competencia,
        COALESCE(SUM(pg."valorTotalCentavos"), 0)   AS valor
      FROM pagamentos pg
      WHERE pg.estornado = false
        AND pg."pagoEm" >= ${dataParaSql(inicio)}
        AND pg."pagoEm" <= ${dataParaSql(fim)}
      GROUP BY 1
    `);

    const porCompetencia = new Map(linhas.map((linha) => [linha.competencia, inteiro(linha.valor)]));
    return competenciasSeguidas(inicio, meses).map((competencia) => ({
      competencia,
      valorCentavos: porCompetencia.get(competencia) ?? 0,
    }));
  }

  /**
   * Volume da regua na janela movel. Como a data de referencia esta dentro da
   * janela, os tres numeros saem de uma varredura so.
   */
  private async contarCobrancasDaJanela(data: DataCivil): Promise<CobrancasEnviadasNoPainel> {
    const inicio = inicioDaJanelaDeCobranca(data);
    const linhas = await this.prisma.$queryRaw<LinhaDeCobrancasDaJanela[]>(Prisma.sql`
      SELECT
        COUNT(*) FILTER (
          WHERE cb.status = 'ENVIADA' AND cb."dataDeReferencia" = ${dataParaSql(data)}
        )                                        AS hoje,
        COUNT(*) FILTER (WHERE cb.status = 'ENVIADA') AS enviadas,
        COUNT(*) FILTER (WHERE cb.status = 'FALHA')   AS falhas
      FROM cobrancas cb
      WHERE cb."dataDeReferencia" >= ${dataParaSql(inicio)}
        AND cb."dataDeReferencia" <= ${dataParaSql(data)}
    `);
    const linha = linhas.at(0);
    return {
      hoje: inteiro(linha?.hoje),
      ultimos30Dias: inteiro(linha?.enviadas),
      falhasUltimos30Dias: inteiro(linha?.falhas),
    };
  }

  /**
   * Coorte fechada: as parcelas que venceram na janela, comparando o que foi
   * pago de principal com o que era devido de principal. Ver o docblock de
   * `taxaDeRecuperacao` em application/ports/consultas-de-painel.ts.
   */
  private async calcularTaxaDeRecuperacaoDaJanela(data: DataCivil): Promise<number> {
    const inicio = inicioDaJanelaDeCobranca(data);
    const linhas = await this.prisma.$queryRaw<LinhaDeRecuperacao[]>(Prisma.sql`
      SELECT
        COALESCE(SUM(p."valorPagoCentavos"), 0)      AS recebido,
        COALESCE(SUM(p."valorOriginalCentavos"), 0)  AS original
      FROM parcelas p
      JOIN contratos c ON c.id = p."contratoId"
      WHERE p.status NOT IN ('CANCELADA', 'RENEGOCIADA')
        AND ${CONTRATO_VIGENTE}
        AND p."vencimento" >= ${dataParaSql(inicio)}
        AND p."vencimento" <= ${dataParaSql(data)}
    `);
    const linha = linhas.at(0);
    return calcularTaxaDeRecuperacao(inteiro(linha?.recebido), inteiro(linha?.original));
  }
}

/** Primeiro dia da janela fechada de 30 dias que termina na data de referencia. */
export function inicioDaJanelaDeCobranca(data: DataCivil): DataCivil {
  return data.somarDias(-(DIAS_DA_JANELA_DE_COBRANCA - 1));
}

/** Agrupa linhas cruas de aging por faixa, prontas para `montarAging`. */
export function indexarAging(
  linhas: readonly { faixa: string; quantidade: unknown; valor: unknown }[],
): Map<string, { quantidade: number; valorCentavos: number }> {
  return new Map(
    linhas.map((linha) => [
      linha.faixa,
      { quantidade: inteiro(linha.quantidade), valorCentavos: inteiro(linha.valor) },
    ]),
  );
}

/**
 * Fatia da carteira em aberto que esta vencida, com uma casa decimal.
 *
 * Principal contra principal: multa e juros ficam de fora dos dois lados. Se o
 * numerador levasse mora e o denominador nao, o indicador subiria sozinho a
 * cada dia de atraso mesmo sem nenhuma parcela nova vencer — inflaria o numero
 * em vez de medir a carteira. O denominador e a carteira inteira em aberto
 * (vencido + a vencer), entao o resultado fica sempre entre 0 e 100.
 *
 * Carteira vazia devolve zero em vez de dividir por zero.
 */
export function calcularPercentualDeInadimplencia(
  principalVencidoCentavos: number,
  principalEmAbertoCentavos: number,
): number {
  if (principalEmAbertoCentavos <= 0) return 0;
  return Math.round((principalVencidoCentavos / principalEmAbertoCentavos) * 1000) / 10;
}

/**
 * Quanto da coorte de parcelas vencidas na janela ja foi recebido, com uma
 * casa decimal. So principal dos dois lados, pelo mesmo motivo do percentual
 * de inadimplencia: mora no numerador mediria encargo, nao recuperacao.
 *
 * Nenhuma parcela vencendo na janela devolve zero em vez de dividir por zero.
 */
export function calcularTaxaDeRecuperacao(
  recebidoCentavos: number,
  originalCentavos: number,
): number {
  if (originalCentavos <= 0) return 0;
  return Math.round((recebidoCentavos / originalCentavos) * 1000) / 10;
}
