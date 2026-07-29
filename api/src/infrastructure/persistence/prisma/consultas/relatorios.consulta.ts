import { Prisma } from '@prisma/client';
import type {
  ConsultasDeRelatorio,
  FiltroDeClientesEmAtraso,
  FiltroDeCobrancasDoRelatorio,
  FiltroDeContratosDoRelatorio,
  FiltroDeFluxoPrevisto,
  FiltroDeInadimplencia,
  FiltroDeLotesARetomar,
  LimiaresDeInadimplencia,
  LinhaDeClienteEmAtraso,
  LinhaDeCobranca,
  LinhaDeCobrancaPorCanal,
  LinhaDeCobrancaPorEvento,
  LinhaDeComissao,
  LinhaDeContratoDoRelatorio,
  LinhaDeFluxoPrevisto,
  LinhaDeInadimplenciaPorLoteamento,
  LinhaDeLoteARetomar,
  LinhaDeRecebimentoPorCompetencia,
  LinhaDeRecebimentoPorFormaDePagamento,
  PeriodoDoRelatorio,
  PosicaoDeInadimplencia,
  RelatorioDeClientesEmAtraso,
  RelatorioDeCobrancas,
  RelatorioDeComissoes,
  RelatorioDeContratos,
  RelatorioDeFluxoPrevisto,
  RelatorioDeInadimplencia,
  RelatorioDeLotesARetomar,
  RelatorioDeRecebimentos,
  ResumoDeCobrancas,
  TotalPorSituacaoDeAtraso,
} from '../../../../application/ports/consultas-de-painel.js';
import { SITUACOES_EM_ATRASO } from '../../../../application/ports/consultas-de-painel.js';
import type {
  PoliticaDeInadimplencia,
  SituacaoDeAtraso,
} from '../../../../domain/contratos/politica-de-inadimplencia.js';
import { CANAIS, garantirCanal, garantirGatilho, garantirStatusCobranca } from '../../../../domain/cobranca/tipos.js';
import type { SituacaoContrato, StatusContrato } from '../../../../domain/contratos/tipos.js';
import { garantirStatusContrato } from '../../../../domain/contratos/tipos.js';
import { DataCivil } from '../../../../domain/value-objects/data-civil.js';
import { Dinheiro } from '../../../../domain/value-objects/dinheiro.js';
import type { ClientePrisma } from '../cliente-prisma.js';
import {
  ATRASO_MAXIMO_POR_CONTRATO,
  CLASSIFICACAO_DE_AGING,
  classificacaoDeAtraso,
  competenciasSeguidas,
  dataParaSql,
  indexarAging,
  inteiro,
  montarAging,
  posicoesDeParcelasEmAberto,
  somarAging,
} from './painel.consulta.js';
import { RepositorioDaPoliticaDeInadimplenciaPrisma } from '../repositorios/politica-de-inadimplencia.repositorio.js';

/**
 * Consultas dos relatorios gerenciais.
 *
 * Mesma premissa do painel: agregacao pesada mora no banco. Todas as consultas
 * de posicao reaproveitam `posicoesDeParcelasEmAberto`, de forma que multa e
 * juros saem iguais no painel, no extrato e em qualquer relatorio — se a
 * formula mudar, muda num lugar so.
 */

// ------------------------------------------------------------- linhas cruas

interface LinhaDeInadimplenciaCrua {
  loteamento_id: string;
  loteamento: string;
  cidade: string;
  uf: string;
  parcelas: unknown;
  valor: unknown;
}

interface LinhaDeContratosPorSituacaoCrua {
  /** Nulo na linha de total do `GROUPING SETS`. */
  loteamento_id: string | null;
  situacao: string;
  contratos: unknown;
  clientes: unknown;
  valor: unknown;
}

interface LinhaDeInadimplentesPorLoteamentoCrua {
  loteamento_id: string | null;
  contratos: unknown;
  clientes: unknown;
}

interface LinhaDeLoteARetomarCrua {
  contrato_id: string;
  numero: string;
  data_assinatura: Date;
  cliente_id: string;
  cliente: string;
  documento: string;
  email: string | null;
  telefone: string | null;
  whatsapp: string | null;
  loteamento_id: string;
  loteamento: string;
  quadra: string;
  lote: string;
  dias_de_atraso_maximo: unknown;
  valor_vencido: unknown;
  saldo_devedor: unknown;
}

interface LinhaDeAgingPorLoteamento {
  loteamento_id: string;
  faixa: string;
  quantidade: unknown;
  valor: unknown;
}

interface LinhaDeRecebimentoCrua {
  competencia: string;
  quantidade: unknown;
  principal: unknown;
  juros: unknown;
  multa: unknown;
  desconto: unknown;
  total: unknown;
}

interface LinhaDeFormaDePagamentoCrua {
  forma_pagamento: string;
  quantidade: unknown;
  total: unknown;
}

interface LinhaDeFluxoCrua {
  competencia: string;
  quantidade: unknown;
  valor: unknown;
}

interface LinhaDeClienteEmAtrasoCrua {
  cliente_id: string;
  cliente: string;
  documento: string;
  email: string | null;
  telefone: string | null;
  whatsapp: string | null;
  contratos: unknown;
  parcelas: unknown;
  valor: unknown;
  maior_atraso: unknown;
}

interface LinhaDeContratoCrua {
  contrato_id: string;
  numero: string;
  data_assinatura: Date;
  status: string;
  valor_total: unknown;
  cliente_id: string;
  cliente: string;
  documento: string;
  loteamento: string;
  quadra: string;
  lote: string;
  total_recebido: unknown;
  saldo_devedor: unknown;
  parcelas_em_aberto: unknown;
  parcelas_vencidas: unknown;
  dias_de_atraso_maximo: unknown;
}

interface LinhaDeResumoDeCobrancasCrua {
  envios: unknown;
  enviadas: unknown;
  falhas: unknown;
  canceladas: unknown;
  valor: unknown;
  clientes: unknown;
}

interface LinhaDeCobrancaPorCanalCrua {
  canal: string;
  enviadas: unknown;
  falhas: unknown;
  valor: unknown;
}

interface LinhaDeCobrancaPorEventoCrua {
  gatilho: string;
  dias: unknown;
  enviadas: unknown;
  falhas: unknown;
  valor: unknown;
}

interface LinhaDeCobrancaCrua {
  cobranca_id: string;
  data_de_referencia: Date;
  enviada_em: Date | null;
  cliente_id: string;
  cliente: string;
  contrato_id: string;
  contrato: string;
  parcela_id: string;
  parcela: unknown;
  canal: string;
  destino: string;
  gatilho: string;
  dias: unknown;
  status: string;
  valor_cobrado: unknown;
  ultimo_erro: string | null;
}

interface LinhaDeComissaoCrua {
  corretor_id: string;
  corretor: string;
  documento: string | null;
  percentual: unknown;
  contratos: unknown;
  valor_vendido: unknown;
}

// ------------------------------------------------------------------ consulta

export class ConsultasDeRelatorioPrisma implements ConsultasDeRelatorio {
  private readonly politicas: RepositorioDaPoliticaDeInadimplenciaPrisma;

  constructor(private readonly prisma: ClientePrisma) {
    this.politicas = new RepositorioDaPoliticaDeInadimplenciaPrisma(prisma);
  }

  // ------------------------------------------------------- inadimplencia

  async inadimplencia(filtro: FiltroDeInadimplencia): Promise<RelatorioDeInadimplencia> {
    const politica = await this.politicas.obter();
    const [linhas, aging, porSituacao, inadimplentes] = await Promise.all([
      this.somarVencidoPorLoteamento(filtro),
      this.somarVencidoPorLoteamentoEFaixaDeAtraso(filtro),
      this.contarContratosPorLoteamentoESituacao(filtro, politica),
      this.contarInadimplentesPorLoteamento(filtro, politica),
    ]);

    const itens: LinhaDeInadimplenciaPorLoteamento[] = linhas.map((linha) => ({
      loteamentoId: linha.loteamento_id,
      loteamento: linha.loteamento,
      cidade: linha.cidade,
      uf: linha.uf,
      contratosInadimplentes: inadimplentes.get(linha.loteamento_id)?.contratos ?? 0,
      clientesInadimplentes: inadimplentes.get(linha.loteamento_id)?.clientes ?? 0,
      parcelasVencidas: inteiro(linha.parcelas),
      valorVencidoCentavos: inteiro(linha.valor),
      aging: montarAging(indexarAging(aging.get(linha.loteamento_id) ?? [])),
      porSituacao: porSituacao.get(linha.loteamento_id) ?? montarPorSituacao(new Map()),
    }));

    // Parcelas, valor e aging somam entre loteamentos porque sao grandezas de
    // parcela. Contratos e clientes nao: o mesmo cliente pode estar inadimplente
    // em dois loteamentos e seria contado duas vezes. Por isso as contagens
    // distintas — e a quebra por situacao — vem prontas do banco.
    const total: PosicaoDeInadimplencia = {
      contratosInadimplentes: inadimplentes.get(TOTAL_GERAL)?.contratos ?? 0,
      clientesInadimplentes: inadimplentes.get(TOTAL_GERAL)?.clientes ?? 0,
      parcelasVencidas: itens.reduce((soma, item) => soma + item.parcelasVencidas, 0),
      valorVencidoCentavos: itens.reduce((soma, item) => soma + item.valorVencidoCentavos, 0),
      aging: somarAging(itens.map((item) => item.aging)),
      porSituacao: porSituacao.get(TOTAL_GERAL) ?? montarPorSituacao(new Map()),
    };

    return {
      data: filtro.data.paraIso(),
      politicaDeInadimplencia: politica.paraEstado(),
      itens,
      total,
    };
  }

  private async somarVencidoPorLoteamento(
    filtro: FiltroDeInadimplencia,
  ): Promise<LinhaDeInadimplenciaCrua[]> {
    return this.prisma.$queryRaw<LinhaDeInadimplenciaCrua[]>(Prisma.sql`
      WITH posicoes AS (${posicoesDeParcelasEmAberto(filtro.data)})
      SELECT
        lo.id     AS loteamento_id,
        lo.nome   AS loteamento,
        lo.cidade AS cidade,
        lo.uf     AS uf,
        COUNT(*)                                                AS parcelas,
        COALESCE(SUM(po.saldo + po.multa + po.juros), 0)        AS valor
      FROM posicoes po
      ${JUNCAO_ATE_O_LOTEAMENTO}
      WHERE po.dias_de_atraso > 0 ${filtroDeLoteamento(filtro.loteamentoId)}
      GROUP BY lo.id, lo.nome, lo.cidade, lo.uf
      ORDER BY valor DESC
    `);
  }

  /**
   * Contratos, clientes distintos e vencido em cada degrau da escala, por
   * loteamento e no total geral na mesma varredura.
   *
   * `GROUPING SETS` evita uma segunda consulta so para o rodape: a linha de
   * total vem com `loteamento_id` nulo. Somar os loteamentos no Node daria
   * contrato certo e cliente errado — quem tem lote em dois loteamentos
   * apareceria duas vezes.
   */
  private async contarContratosPorLoteamentoESituacao(
    filtro: FiltroDeInadimplencia,
    politica: PoliticaDeInadimplencia,
  ): Promise<Map<string, TotalPorSituacaoDeAtraso[]>> {
    const linhas = await this.prisma.$queryRaw<LinhaDeContratosPorSituacaoCrua[]>(Prisma.sql`
      WITH posicoes AS (${posicoesDeParcelasEmAberto(filtro.data)}),
           classificados AS (${contratosClassificados(filtro.loteamentoId, politica)})
      SELECT
        loteamento_id                    AS loteamento_id,
        situacao                         AS situacao,
        COUNT(*)                         AS contratos,
        COUNT(DISTINCT cliente_id)       AS clientes,
        COALESCE(SUM(valor_vencido), 0)  AS valor
      FROM classificados
      WHERE situacao <> 'EM_DIA'
      GROUP BY GROUPING SETS ((loteamento_id, situacao), (situacao))
    `);

    const porLoteamento = agruparPor(linhas, (linha) => linha.loteamento_id ?? TOTAL_GERAL);
    return new Map(
      Array.from(porLoteamento, ([chave, doGrupo]) => [chave, montarPorSituacao(indexarPorSituacao(doGrupo))]),
    );
  }

  /** Contratos e clientes que alcancaram o limiar de inadimplencia, por loteamento e no total. */
  private async contarInadimplentesPorLoteamento(
    filtro: FiltroDeInadimplencia,
    politica: PoliticaDeInadimplencia,
  ): Promise<Map<string, { contratos: number; clientes: number }>> {
    const linhas = await this.prisma.$queryRaw<LinhaDeInadimplentesPorLoteamentoCrua[]>(Prisma.sql`
      WITH posicoes AS (${posicoesDeParcelasEmAberto(filtro.data)}),
           classificados AS (${contratosClassificados(filtro.loteamentoId, politica)})
      SELECT
        loteamento_id               AS loteamento_id,
        COUNT(*)                    AS contratos,
        COUNT(DISTINCT cliente_id)  AS clientes
      FROM classificados
      WHERE situacao IN ('INADIMPLENTE', 'SUJEITO_A_RETOMADA')
      GROUP BY GROUPING SETS ((loteamento_id), ())
    `);

    return new Map(
      linhas.map((linha) => [
        linha.loteamento_id ?? TOTAL_GERAL,
        { contratos: inteiro(linha.contratos), clientes: inteiro(linha.clientes) },
      ]),
    );
  }

  // ----------------------------------------------------- lotes a retomar

  /**
   * Lista que o juridico usa: contratos cujo maior atraso ja passou do prazo de
   * retomada do lote. Ordenada pelo pior atraso primeiro.
   */
  async lotesARetomar(filtro: FiltroDeLotesARetomar): Promise<RelatorioDeLotesARetomar> {
    const politica = await this.politicas.obter();

    const linhas = await this.prisma.$queryRaw<LinhaDeLoteARetomarCrua[]>(Prisma.sql`
      WITH posicoes AS (${posicoesDeParcelasEmAberto(filtro.data)}),
           classificados AS (${contratosClassificados(filtro.loteamentoId, politica)})
      SELECT
        cs.contrato_id            AS contrato_id,
        c.numero                  AS numero,
        c."dataAssinatura"        AS data_assinatura,
        cl.id                     AS cliente_id,
        cl.nome                   AS cliente,
        cl.documento              AS documento,
        cl.email                  AS email,
        cl.telefone               AS telefone,
        cl.whatsapp               AS whatsapp,
        cs.loteamento_id          AS loteamento_id,
        cs.loteamento             AS loteamento,
        cs.quadra                 AS quadra,
        cs.lote                   AS lote,
        cs.dias_de_atraso_maximo  AS dias_de_atraso_maximo,
        cs.valor_vencido          AS valor_vencido,
        cs.saldo_devedor          AS saldo_devedor
      FROM classificados cs
      JOIN contratos c ON c.id = cs.contrato_id
      JOIN clientes cl ON cl.id = cs.cliente_id
      WHERE cs.situacao = 'SUJEITO_A_RETOMADA'
      ORDER BY cs.dias_de_atraso_maximo DESC, cs.valor_vencido DESC
    `);

    const itens: LinhaDeLoteARetomar[] = linhas.map((linha) => ({
      contratoId: linha.contrato_id,
      numero: linha.numero,
      dataAssinatura: DataCivil.deDate(linha.data_assinatura).paraIso(),
      clienteId: linha.cliente_id,
      cliente: linha.cliente,
      documento: linha.documento,
      email: linha.email,
      telefone: linha.telefone,
      whatsapp: linha.whatsapp,
      loteamentoId: linha.loteamento_id,
      loteamento: linha.loteamento,
      quadra: linha.quadra,
      lote: linha.lote,
      diasDeAtrasoMaximo: inteiro(linha.dias_de_atraso_maximo),
      valorVencidoCentavos: inteiro(linha.valor_vencido),
      saldoDevedorCentavos: inteiro(linha.saldo_devedor),
    }));

    return {
      data: filtro.data.paraIso(),
      politicaDeInadimplencia: politica.paraEstado(),
      itens,
      totalDeContratos: itens.length,
      valorVencidoCentavos: somar(itens, (item) => item.valorVencidoCentavos),
      saldoDevedorCentavos: somar(itens, (item) => item.saldoDevedorCentavos),
    };
  }

  private async somarVencidoPorLoteamentoEFaixaDeAtraso(
    filtro: FiltroDeInadimplencia,
  ): Promise<Map<string, LinhaDeAgingPorLoteamento[]>> {
    const linhas = await this.prisma.$queryRaw<LinhaDeAgingPorLoteamento[]>(Prisma.sql`
      WITH posicoes AS (${posicoesDeParcelasEmAberto(filtro.data)})
      SELECT
        lo.id                                             AS loteamento_id,
        ${CLASSIFICACAO_DE_AGING}                         AS faixa,
        COUNT(*)                                          AS quantidade,
        COALESCE(SUM(po.saldo + po.multa + po.juros), 0)  AS valor
      FROM posicoes po
      ${JUNCAO_ATE_O_LOTEAMENTO}
      WHERE po.dias_de_atraso > 0 ${filtroDeLoteamento(filtro.loteamentoId)}
      GROUP BY 1, 2
    `);
    return agruparPor(linhas, (linha) => linha.loteamento_id);
  }


  // --------------------------------------------------------- recebimentos

  async recebimentos(periodo: PeriodoDoRelatorio): Promise<RelatorioDeRecebimentos> {
    const [linhas, formas] = await Promise.all([
      this.somarPagamentosPorCompetencia(periodo),
      this.somarPagamentosPorFormaDePagamento(periodo),
    ]);

    const itens: LinhaDeRecebimentoPorCompetencia[] = linhas.map((linha) => ({
      competencia: linha.competencia,
      quantidade: inteiro(linha.quantidade),
      principalCentavos: inteiro(linha.principal),
      jurosCentavos: inteiro(linha.juros),
      multaCentavos: inteiro(linha.multa),
      descontoCentavos: inteiro(linha.desconto),
      totalCentavos: inteiro(linha.total),
    }));

    const porFormaDePagamento: LinhaDeRecebimentoPorFormaDePagamento[] = formas.map((linha) => ({
      formaPagamento: linha.forma_pagamento,
      quantidade: inteiro(linha.quantidade),
      totalCentavos: inteiro(linha.total),
    }));

    return {
      de: periodo.de.paraIso(),
      ate: periodo.ate.paraIso(),
      itens,
      porFormaDePagamento,
      total: {
        quantidade: somar(itens, (item) => item.quantidade),
        principalCentavos: somar(itens, (item) => item.principalCentavos),
        jurosCentavos: somar(itens, (item) => item.jurosCentavos),
        multaCentavos: somar(itens, (item) => item.multaCentavos),
        descontoCentavos: somar(itens, (item) => item.descontoCentavos),
        totalCentavos: somar(itens, (item) => item.totalCentavos),
      },
    };
  }

  private async somarPagamentosPorCompetencia(
    periodo: PeriodoDoRelatorio,
  ): Promise<LinhaDeRecebimentoCrua[]> {
    return this.prisma.$queryRaw<LinhaDeRecebimentoCrua[]>(Prisma.sql`
      SELECT
        to_char(pg."pagoEm", 'YYYY-MM')                     AS competencia,
        COUNT(*)                                            AS quantidade,
        COALESCE(SUM(pg."valorPrincipalCentavos"), 0)       AS principal,
        COALESCE(SUM(pg."valorJurosCentavos"), 0)           AS juros,
        COALESCE(SUM(pg."valorMultaCentavos"), 0)           AS multa,
        COALESCE(SUM(pg."valorDescontoCentavos"), 0)        AS desconto,
        COALESCE(SUM(pg."valorTotalCentavos"), 0)           AS total
      FROM pagamentos pg
      WHERE ${pagamentoLiquidadoNoPeriodo(periodo)}
      GROUP BY 1
      ORDER BY 1
    `);
  }

  private async somarPagamentosPorFormaDePagamento(
    periodo: PeriodoDoRelatorio,
  ): Promise<LinhaDeFormaDePagamentoCrua[]> {
    return this.prisma.$queryRaw<LinhaDeFormaDePagamentoCrua[]>(Prisma.sql`
      SELECT
        pg."formaPagamento"::text                  AS forma_pagamento,
        COUNT(*)                                   AS quantidade,
        COALESCE(SUM(pg."valorTotalCentavos"), 0)  AS total
      FROM pagamentos pg
      WHERE ${pagamentoLiquidadoNoPeriodo(periodo)}
      GROUP BY 1
      ORDER BY 3 DESC
    `);
  }

  // -------------------------------------------------------- fluxo previsto

  async fluxoPrevisto(filtro: FiltroDeFluxoPrevisto): Promise<RelatorioDeFluxoPrevisto> {
    const fim = filtro.data.primeiroDiaDoMes().somarMeses(filtro.meses - 1).ultimoDiaDoMes();

    const linhas = await this.prisma.$queryRaw<LinhaDeFluxoCrua[]>(Prisma.sql`
      WITH posicoes AS (${posicoesDeParcelasEmAberto(filtro.data)})
      SELECT
        to_char(po.vencimento, 'YYYY-MM') AS competencia,
        COUNT(*)                          AS quantidade,
        COALESCE(SUM(po.saldo), 0)        AS valor
      FROM posicoes po
      WHERE po.vencimento >= ${dataParaSql(filtro.data)}
        AND po.vencimento <= ${dataParaSql(fim)}
      GROUP BY 1
    `);

    const porCompetencia = new Map(linhas.map((linha) => [linha.competencia, linha]));
    const itens: LinhaDeFluxoPrevisto[] = competenciasSeguidas(filtro.data, filtro.meses).map(
      (competencia) => {
        const linha = porCompetencia.get(competencia);
        return {
          competencia,
          quantidade: inteiro(linha?.quantidade),
          valorCentavos: inteiro(linha?.valor),
        };
      },
    );

    return {
      de: filtro.data.paraIso(),
      meses: filtro.meses,
      itens,
      totalCentavos: somar(itens, (item) => item.valorCentavos),
    };
  }

  // ---------------------------------------------------- clientes em atraso

  async clientesEmAtraso(filtro: FiltroDeClientesEmAtraso): Promise<RelatorioDeClientesEmAtraso> {
    const linhas = await this.prisma.$queryRaw<LinhaDeClienteEmAtrasoCrua[]>(Prisma.sql`
      WITH posicoes AS (${posicoesDeParcelasEmAberto(filtro.data)})
      SELECT
        cl.id        AS cliente_id,
        cl.nome      AS cliente,
        cl.documento AS documento,
        cl.email     AS email,
        cl.telefone  AS telefone,
        cl.whatsapp  AS whatsapp,
        COUNT(DISTINCT po.contrato_id)                    AS contratos,
        COUNT(*)                                          AS parcelas,
        COALESCE(SUM(po.saldo + po.multa + po.juros), 0)  AS valor,
        MAX(po.dias_de_atraso)                            AS maior_atraso
      FROM posicoes po
      JOIN clientes cl ON cl.id = po.cliente_id
      WHERE po.dias_de_atraso >= ${filtro.diasMinimos}
      GROUP BY cl.id, cl.nome, cl.documento, cl.email, cl.telefone, cl.whatsapp
      ORDER BY valor DESC
    `);

    const itens: LinhaDeClienteEmAtraso[] = linhas.map((linha) => ({
      clienteId: linha.cliente_id,
      cliente: linha.cliente,
      documento: linha.documento,
      email: linha.email,
      telefone: linha.telefone,
      whatsapp: linha.whatsapp,
      contratos: inteiro(linha.contratos),
      parcelasVencidas: inteiro(linha.parcelas),
      valorVencidoCentavos: inteiro(linha.valor),
      maiorAtrasoEmDias: inteiro(linha.maior_atraso),
    }));

    return {
      data: filtro.data.paraIso(),
      diasMinimos: filtro.diasMinimos,
      itens,
      totalCentavos: somar(itens, (item) => item.valorVencidoCentavos),
    };
  }

  // -------------------------------------------------------------- contratos

  async contratos(filtro: FiltroDeContratosDoRelatorio): Promise<RelatorioDeContratos> {
    const politica = await this.politicas.obter();
    const data = dataParaSql(filtro.data);

    const linhas = await this.prisma.$queryRaw<LinhaDeContratoCrua[]>(Prisma.sql`
      SELECT
        c.id                    AS contrato_id,
        c.numero                AS numero,
        c."dataAssinatura"      AS data_assinatura,
        c.status::text          AS status,
        c."valorTotalCentavos"  AS valor_total,
        cl.id                   AS cliente_id,
        cl.nome                 AS cliente,
        cl.documento            AS documento,
        lo.nome                 AS loteamento,
        q.nome                  AS quadra,
        l.numero                AS lote,
        COALESCE(recebido.total, 0)      AS total_recebido,
        COALESCE(aberto.saldo, 0)        AS saldo_devedor,
        COALESCE(aberto.quantidade, 0)   AS parcelas_em_aberto,
        COALESCE(aberto.vencidas, 0)     AS parcelas_vencidas,
        COALESCE(aberto.dias_de_atraso_maximo, 0) AS dias_de_atraso_maximo
      FROM contratos c
      JOIN clientes cl    ON cl.id = c."clienteId"
      JOIN lotes l        ON l.id = c."loteId"
      JOIN quadras q      ON q.id = l."quadraId"
      JOIN loteamentos lo ON lo.id = q."loteamentoId"
      LEFT JOIN LATERAL (
        SELECT SUM(pg."valorTotalCentavos") AS total
        FROM pagamentos pg
        WHERE pg."contratoId" = c.id AND pg.estornado = false
      ) recebido ON true
      LEFT JOIN LATERAL (
        SELECT
          SUM(GREATEST(p."valorOriginalCentavos" - p."valorPagoCentavos" - p."descontoConcedidoCentavos", 0)) AS saldo,
          COUNT(*)                                          AS quantidade,
          COUNT(*) FILTER (WHERE p."vencimento" < ${data})  AS vencidas,
          GREATEST(0, COALESCE(MAX(${data} - p."vencimento"), 0)) AS dias_de_atraso_maximo
        FROM parcelas p
        WHERE p."contratoId" = c.id AND p.status IN ('PENDENTE', 'PAGA_PARCIAL')
      ) aberto ON true
      WHERE TRUE ${filtroDeStatusDoContrato(filtro.status)}
      ORDER BY c.numero
    `);

    const itens: LinhaDeContratoDoRelatorio[] = linhas.map((linha) => {
      const status = garantirStatusContrato(linha.status);
      const parcelasVencidas = inteiro(linha.parcelas_vencidas);
      const diasDeAtrasoMaximo = inteiro(linha.dias_de_atraso_maximo);
      return {
        contratoId: linha.contrato_id,
        numero: linha.numero,
        dataAssinatura: DataCivil.deDate(linha.data_assinatura).paraIso(),
        clienteId: linha.cliente_id,
        cliente: linha.cliente,
        documento: linha.documento,
        loteamento: linha.loteamento,
        quadra: linha.quadra,
        lote: linha.lote,
        valorTotalCentavos: inteiro(linha.valor_total),
        totalRecebidoCentavos: inteiro(linha.total_recebido),
        saldoDevedorCentavos: inteiro(linha.saldo_devedor),
        parcelasEmAberto: inteiro(linha.parcelas_em_aberto),
        parcelasVencidas,
        diasDeAtrasoMaximo,
        status,
        situacao: situacaoDoContrato(status, diasDeAtrasoMaximo, politica),
      };
    });

    return {
      data: filtro.data.paraIso(),
      status: filtro.status ?? null,
      itens,
      totalDeContratos: itens.length,
      valorTotalCentavos: somar(itens, (item) => item.valorTotalCentavos),
      saldoDevedorCentavos: somar(itens, (item) => item.saldoDevedorCentavos),
    };
  }

  // -------------------------------------------------------------- comissoes

  async comissoes(periodo: PeriodoDoRelatorio): Promise<RelatorioDeComissoes> {
    const linhas = await this.prisma.$queryRaw<LinhaDeComissaoCrua[]>(Prisma.sql`
      SELECT
        co.id                    AS corretor_id,
        co.nome                  AS corretor,
        co.documento             AS documento,
        co."percentualDeComissao" AS percentual,
        COUNT(c.id)                                 AS contratos,
        COALESCE(SUM(c."valorTotalCentavos"), 0)    AS valor_vendido
      FROM corretores co
      JOIN contratos c
        ON c."corretorId" = co.id
       AND c."dataAssinatura" >= ${dataParaSql(periodo.de)}
       AND c."dataAssinatura" <= ${dataParaSql(periodo.ate)}
       AND c.status NOT IN ('CANCELADO', 'DISTRATADO')
      GROUP BY co.id, co.nome, co.documento, co."percentualDeComissao"
      ORDER BY valor_vendido DESC
    `);

    const itens: LinhaDeComissao[] = linhas.map((linha) => {
      const valorVendidoCentavos = inteiro(linha.valor_vendido);
      const percentualDeComissao = Number(linha.percentual ?? 0);
      return {
        corretorId: linha.corretor_id,
        corretor: linha.corretor,
        documento: linha.documento,
        contratos: inteiro(linha.contratos),
        valorVendidoCentavos,
        percentualDeComissao,
        // Arredonda pelo mesmo caminho do resto do sistema (half-up em centavos).
        comissaoPrevistaCentavos: Dinheiro.deCentavos(valorVendidoCentavos).multiplicarPor(
          percentualDeComissao / 100,
        ).centavos,
      };
    });

    return {
      de: periodo.de.paraIso(),
      ate: periodo.ate.paraIso(),
      itens,
      valorVendidoCentavos: somar(itens, (item) => item.valorVendidoCentavos),
      comissaoPrevistaCentavos: somar(itens, (item) => item.comissaoPrevistaCentavos),
    };
  }

  // -------------------------------------------------------------- cobrancas

  /**
   * Historico de envios da regua. Os tres agregados sao calculados no banco;
   * o Node so recebe os itens detalhados, que sao o proprio conteudo do CSV.
   */
  async cobrancas(filtro: FiltroDeCobrancasDoRelatorio): Promise<RelatorioDeCobrancas> {
    const [resumo, porCanal, porEvento, itens] = await Promise.all([
      this.resumirCobrancas(filtro),
      this.contarCobrancasPorCanal(filtro),
      this.contarCobrancasPorEventoDaRegua(filtro),
      this.listarCobrancas(filtro),
    ]);

    return {
      de: filtro.de.paraIso(),
      ate: filtro.ate.paraIso(),
      canal: filtro.canal ?? null,
      status: filtro.status ?? null,
      resumo,
      porCanal,
      porEvento,
      itens,
    };
  }

  private async resumirCobrancas(filtro: FiltroDeCobrancasDoRelatorio): Promise<ResumoDeCobrancas> {
    const linhas = await this.prisma.$queryRaw<LinhaDeResumoDeCobrancasCrua[]>(Prisma.sql`
      SELECT
        COUNT(*)                                            AS envios,
        COUNT(*) FILTER (WHERE cb.status = 'ENVIADA')       AS enviadas,
        COUNT(*) FILTER (WHERE cb.status = 'FALHA')         AS falhas,
        COUNT(*) FILTER (WHERE cb.status = 'CANCELADA')     AS canceladas,
        COALESCE(SUM(cb."valorCobradoCentavos"), 0)         AS valor,
        COUNT(DISTINCT cb."clienteId")                      AS clientes
      FROM cobrancas cb
      WHERE ${cobrancaNoPeriodo(filtro)}
    `);
    const linha = linhas.at(0);
    return {
      envios: inteiro(linha?.envios),
      enviadas: inteiro(linha?.enviadas),
      falhas: inteiro(linha?.falhas),
      canceladas: inteiro(linha?.canceladas),
      valorCobradoCentavos: inteiro(linha?.valor),
      clientesAlcancados: inteiro(linha?.clientes),
    };
  }

  private async contarCobrancasPorCanal(
    filtro: FiltroDeCobrancasDoRelatorio,
  ): Promise<LinhaDeCobrancaPorCanal[]> {
    const linhas = await this.prisma.$queryRaw<LinhaDeCobrancaPorCanalCrua[]>(Prisma.sql`
      SELECT
        cb.canal::text                                  AS canal,
        COUNT(*) FILTER (WHERE cb.status = 'ENVIADA')   AS enviadas,
        COUNT(*) FILTER (WHERE cb.status = 'FALHA')     AS falhas,
        COALESCE(SUM(cb."valorCobradoCentavos"), 0)     AS valor
      FROM cobrancas cb
      WHERE ${cobrancaNoPeriodo(filtro)}
      GROUP BY 1
    `);

    const itens = linhas.map((linha) => ({
      canal: garantirCanal(linha.canal),
      enviadas: inteiro(linha.enviadas),
      falhas: inteiro(linha.falhas),
      valorCobradoCentavos: inteiro(linha.valor),
    }));
    // Ordem do dominio (WHATSAPP, SMS, EMAIL) em vez de alfabetica: e a ordem
    // em que a loteadora pensa nos canais, do mais usado ao menos usado.
    return itens.sort((um, outro) => CANAIS.indexOf(um.canal) - CANAIS.indexOf(outro.canal));
  }

  private async contarCobrancasPorEventoDaRegua(
    filtro: FiltroDeCobrancasDoRelatorio,
  ): Promise<LinhaDeCobrancaPorEvento[]> {
    const linhas = await this.prisma.$queryRaw<LinhaDeCobrancaPorEventoCrua[]>(Prisma.sql`
      SELECT
        cb.gatilho::text                                AS gatilho,
        cb.dias                                         AS dias,
        COUNT(*) FILTER (WHERE cb.status = 'ENVIADA')   AS enviadas,
        COUNT(*) FILTER (WHERE cb.status = 'FALHA')     AS falhas,
        COALESCE(SUM(cb."valorCobradoCentavos"), 0)     AS valor
      FROM cobrancas cb
      WHERE ${cobrancaNoPeriodo(filtro)}
      GROUP BY cb.gatilho, cb.dias
      ORDER BY cb.gatilho, cb.dias
    `);

    // Ordenar pela coluna enum (e nao pelo texto) faz o Postgres devolver os
    // eventos na ordem de declaracao do enum, que e a linha do tempo da regua:
    // antes do vencimento, no vencimento, depois do vencimento.
    return linhas.map((linha) => {
      const gatilho = garantirGatilho(linha.gatilho);
      const dias = inteiro(linha.dias);
      return {
        evento: nomeDoEvento(gatilho, dias),
        gatilho,
        dias,
        enviadas: inteiro(linha.enviadas),
        falhas: inteiro(linha.falhas),
        valorCobradoCentavos: inteiro(linha.valor),
      };
    });
  }

  private async listarCobrancas(filtro: FiltroDeCobrancasDoRelatorio): Promise<LinhaDeCobranca[]> {
    const linhas = await this.prisma.$queryRaw<LinhaDeCobrancaCrua[]>(Prisma.sql`
      SELECT
        cb.id                     AS cobranca_id,
        cb."dataDeReferencia"     AS data_de_referencia,
        cb."enviadaEm"            AS enviada_em,
        cl.id                     AS cliente_id,
        cl.nome                   AS cliente,
        c.id                      AS contrato_id,
        c.numero                  AS contrato,
        p.id                      AS parcela_id,
        p.numero                  AS parcela,
        cb.canal::text            AS canal,
        cb.destino                AS destino,
        cb.gatilho::text          AS gatilho,
        cb.dias                   AS dias,
        cb.status::text           AS status,
        cb."valorCobradoCentavos" AS valor_cobrado,
        cb."ultimoErro"           AS ultimo_erro
      FROM cobrancas cb
      JOIN clientes cl  ON cl.id = cb."clienteId"
      JOIN contratos c  ON c.id = cb."contratoId"
      JOIN parcelas p   ON p.id = cb."parcelaId"
      WHERE ${cobrancaNoPeriodo(filtro)}
      ORDER BY cb."dataDeReferencia" DESC, cb."criadaEm" DESC
    `);

    return linhas.map((linha) => ({
      cobrancaId: linha.cobranca_id,
      dataDeReferencia: DataCivil.deDate(linha.data_de_referencia).paraIso(),
      enviadaEm: linha.enviada_em ? linha.enviada_em.toISOString() : null,
      clienteId: linha.cliente_id,
      cliente: linha.cliente,
      contratoId: linha.contrato_id,
      contrato: linha.contrato,
      parcelaId: linha.parcela_id,
      parcela: inteiro(linha.parcela),
      canal: garantirCanal(linha.canal),
      destino: linha.destino,
      evento: nomeDoEvento(garantirGatilho(linha.gatilho), inteiro(linha.dias)),
      status: garantirStatusCobranca(linha.status),
      valorCobradoCentavos: inteiro(linha.valor_cobrado),
      ultimoErro: linha.ultimo_erro,
    }));
  }
}

// ------------------------------------------------------------- auxiliares

/** Do lote da parcela ate o loteamento — usado por todo agrupamento geografico. */
const JUNCAO_ATE_O_LOTEAMENTO = Prisma.sql`
  JOIN lotes l        ON l.id = po.lote_id
  JOIN quadras q      ON q.id = l."quadraId"
  JOIN loteamentos lo ON lo.id = q."loteamentoId"
`;

/** Chave que representa a linha de total geral do `GROUPING SETS`. */
const TOTAL_GERAL = '__total__';

/**
 * Um contrato ativo por linha, ja classificado na escala e com o endereco do
 * lote resolvido. Espera um CTE `posicoes` definido antes.
 */
function contratosClassificados(
  loteamentoId: string | undefined,
  politica: PoliticaDeInadimplencia,
): Prisma.Sql {
  return Prisma.sql`
    SELECT
      atrasos.contrato_id,
      atrasos.cliente_id,
      atrasos.lote_id,
      lo.id      AS loteamento_id,
      lo.nome    AS loteamento,
      q.nome     AS quadra,
      l.numero   AS lote,
      atrasos.dias_de_atraso_maximo,
      atrasos.valor_vencido,
      atrasos.saldo_devedor,
      ${classificacaoDeAtraso(politica)} AS situacao
    FROM (${ATRASO_MAXIMO_POR_CONTRATO}) atrasos
    JOIN lotes l        ON l.id = atrasos.lote_id
    JOIN quadras q      ON q.id = l."quadraId"
    JOIN loteamentos lo ON lo.id = q."loteamentoId"
    WHERE TRUE ${filtroDeLoteamento(loteamentoId)}
  `;
}

/** Indexa linhas cruas de quebra por situacao, prontas para `montarPorSituacao`. */
function indexarPorSituacao(
  linhas: readonly LinhaDeContratosPorSituacaoCrua[],
): Map<string, { contratos: number; clientes: number; valorVencidoCentavos: number }> {
  return new Map(
    linhas.map((linha) => [
      linha.situacao,
      {
        contratos: inteiro(linha.contratos),
        clientes: inteiro(linha.clientes),
        valorVencidoCentavos: inteiro(linha.valor),
      },
    ]),
  );
}

/** Sempre os tres degraus, mesmo zerados — a tabela do relatorio nao pode encolher. */
function montarPorSituacao(
  totais: ReadonlyMap<string, { contratos: number; clientes: number; valorVencidoCentavos: number }>,
): TotalPorSituacaoDeAtraso[] {
  return SITUACOES_EM_ATRASO.map((situacao: SituacaoDeAtraso) => ({
    situacao,
    contratos: totais.get(situacao)?.contratos ?? 0,
    clientes: totais.get(situacao)?.clientes ?? 0,
    valorVencidoCentavos: totais.get(situacao)?.valorVencidoCentavos ?? 0,
  }));
}

function filtroDeLoteamento(loteamentoId: string | undefined): Prisma.Sql {
  return loteamentoId ? Prisma.sql`AND lo.id = ${loteamentoId}` : Prisma.empty;
}

/** Compara pelo texto do enum para nao depender do nome do tipo no Postgres. */
function filtroDeStatusDoContrato(status: StatusContrato | undefined): Prisma.Sql {
  return status ? Prisma.sql`AND c.status::text = ${status}` : Prisma.empty;
}

/**
 * Recorte do relatorio de cobrancas: sempre pela data de referencia do envio
 * (o dia que a regua mirou), nao pelo carimbo de criacao da linha.
 */
function cobrancaNoPeriodo(filtro: FiltroDeCobrancasDoRelatorio): Prisma.Sql {
  return Prisma.sql`
    cb."dataDeReferencia" >= ${dataParaSql(filtro.de)}
    AND cb."dataDeReferencia" <= ${dataParaSql(filtro.ate)}
    ${filtro.canal ? Prisma.sql`AND cb.canal::text = ${filtro.canal}` : Prisma.empty}
    ${filtro.status ? Prisma.sql`AND cb.status::text = ${filtro.status}` : Prisma.empty}
  `;
}

/** Identidade da etapa da regua, no mesmo formato de `/regua/executar`. */
function nomeDoEvento(gatilho: string, dias: number): string {
  return `${gatilho}:${dias}`;
}

/** Pagamento que conta como recebimento: liquidado no periodo e nao estornado. */
function pagamentoLiquidadoNoPeriodo(periodo: PeriodoDoRelatorio): Prisma.Sql {
  return Prisma.sql`
    pg.estornado = false
    AND pg."pagoEm" >= ${dataParaSql(periodo.de)}
    AND pg."pagoEm" <= ${dataParaSql(periodo.ate)}
  `;
}

/**
 * Situacao apresentavel do contrato: derivada das parcelas, nunca gravada.
 *
 * O status persistido manda quando o contrato ja terminou; caso contrario o
 * degrau vem da escala, aplicada sobre o maior atraso entre as parcelas em
 * aberto. Delegar a `PoliticaDeInadimplencia.classificar` garante que o
 * relatorio e o extrato do contrato nunca discordem sobre o mesmo contrato.
 */
function situacaoDoContrato(
  status: StatusContrato,
  diasDeAtrasoMaximo: number,
  politica: PoliticaDeInadimplencia,
): SituacaoContrato {
  if (status === 'CANCELADO') return 'CANCELADO';
  if (status === 'DISTRATADO') return 'DISTRATADO';
  if (status === 'QUITADO') return 'QUITADO';
  return politica.classificar(diasDeAtrasoMaximo);
}

function somar<T>(itens: readonly T[], valor: (item: T) => number): number {
  return itens.reduce((total, item) => total + valor(item), 0);
}

function agruparPor<T>(itens: readonly T[], chave: (item: T) => string): Map<string, T[]> {
  const grupos = new Map<string, T[]>();
  for (const item of itens) {
    const grupo = grupos.get(chave(item));
    if (grupo) {
      grupo.push(item);
    } else {
      grupos.set(chave(item), [item]);
    }
  }
  return grupos;
}
