import type { Contrato } from '../../../domain/contratos/contrato.js';
import type { PoliticaDeInadimplencia } from '../../../domain/contratos/politica-de-inadimplencia.js';
import type { DataCivil } from '../../../domain/value-objects/data-civil.js';
import { Dinheiro } from '../../../domain/value-objects/dinheiro.js';
import type { Relogio } from '../../ports/comuns.js';
import type { ConsultaDeContextoDeCobranca } from '../../ports/consulta-de-contexto.js';
import type { Mensageria } from '../../ports/mensageria.js';
import type { Repositorios } from '../../ports/repositorios.js';
import type { ResultadoDaRegua } from './executar-regua.js';

/** Quantas linhas de detalhe cabem no corpo antes de virar ruido. */
const LIMITE_DE_LINHAS = 20;

interface LinhaDeParcela {
  readonly contrato: string;
  readonly cliente: string;
  readonly numero: number;
  readonly valor: Dinheiro;
}

interface MarcoDoContrato {
  readonly contrato: string;
  readonly cliente: string;
  readonly imovel: string;
  readonly diasDeAtraso: number;
  readonly saldoDevedor: Dinheiro;
  readonly totalVencido: Dinheiro;
}

export interface ResumoParaEquipe {
  readonly data: string;
  readonly destinatarios: readonly string[];
  readonly novosVencidos: number;
  readonly valorNovosVencidosCentavos: number;
  readonly novosInadimplentes: number;
  readonly sujeitosARetomada: number;
  readonly enviados: number;
  readonly falhas: number;
}

/**
 * Alerta ativo para a equipe ao fim do ciclo diario.
 *
 * O painel ja mostra a inadimplencia, mas painel e passivo: so avisa quem
 * resolve abrir. Este resumo empurra para o financeiro o que exige acao humana
 * no mesmo dia, em tres blocos:
 *
 * 1. quem acabou de entrar em atraso;
 * 2. quem **cruzou hoje** o prazo de inadimplencia;
 * 3. quem **cruzou hoje** o prazo de retomada do lote.
 *
 * Os marcos avisam na virada, nao todo dia. Repetir "continua inadimplente" a
 * cada manha e a forma mais rapida de fazer a equipe parar de ler o alerta.
 *
 * Sai pela mesma porta `Mensageria` das cobrancas: com o adaptador de console
 * ele aparece no log; ao plugar um provedor real de e-mail, vira e-mail de
 * verdade sem tocar neste arquivo.
 */
export class NotificarEquipeDoCiclo {
  constructor(
    private readonly repositorios: Repositorios,
    private readonly consultaDeContexto: ConsultaDeContextoDeCobranca,
    private readonly mensageria: Mensageria,
    private readonly relogio: Relogio,
    private readonly destinatarios: readonly string[],
    private readonly nomeDaEmpresa: string,
  ) {}

  async executar(resultado: ResultadoDaRegua, data?: DataCivil): Promise<ResumoParaEquipe | null> {
    if (this.destinatarios.length === 0) return null;

    const referencia = data ?? this.relogio.hoje();
    const politica = await this.repositorios.politicaDeInadimplencia.obter();

    const [novosVencidos, novosInadimplentes, sujeitosARetomada] = await Promise.all([
      this.levantarNovosVencidos(referencia),
      this.levantarMarco(referencia, politica, politica.diasParaInadimplencia),
      this.levantarMarco(referencia, politica, politica.diasParaRetomadaDoLote),
    ]);

    const valorNovosVencidos = Dinheiro.somaDe(novosVencidos.map((item) => item.valor));

    const corpo = this.montarCorpo({
      resultado,
      referencia,
      politica,
      novosVencidos,
      valorNovosVencidos,
      novosInadimplentes,
      sujeitosARetomada,
    });

    const assunto = this.montarAssunto(referencia, novosVencidos.length, novosInadimplentes.length, sujeitosARetomada.length);

    for (const destinatario of this.destinatarios) {
      const envio = await this.mensageria.enviar({
        canal: 'EMAIL',
        destino: destinatario,
        assunto,
        corpo,
      });
      if (!envio.sucesso) {
        console.warn(`[notificar-equipe] falha ao avisar ${destinatario}: ${envio.erro}`);
      }
    }

    return {
      data: referencia.paraIso(),
      destinatarios: this.destinatarios,
      novosVencidos: novosVencidos.length,
      valorNovosVencidosCentavos: valorNovosVencidos.centavos,
      novosInadimplentes: novosInadimplentes.length,
      sujeitosARetomada: sujeitosARetomada.length,
      enviados: resultado.enviadas,
      falhas: resultado.falhas,
    };
  }

  /**
   * Parcelas que viraram atraso hoje: venceram ontem e continuam em aberto.
   * E o recorte que interessa — o acumulado de vencidos ja esta no painel.
   */
  private async levantarNovosVencidos(referencia: DataCivil): Promise<LinhaDeParcela[]> {
    const ontem = referencia.somarDias(-1);
    const parcelas = await this.repositorios.parcelas.emAbertoComVencimentoEntre(ontem, ontem);
    if (parcelas.length === 0) return [];

    const contextos = await this.consultaDeContexto.porParcelas(
      parcelas.map((parcela) => parcela.id.paraString()),
    );

    return parcelas.map((parcela) => {
      const contexto = contextos.get(parcela.id.paraString());
      return {
        valor: parcela.saldoPrincipal(),
        contrato: contexto?.contratoNumero ?? '—',
        cliente: contexto?.clienteNome ?? '—',
        numero: parcela.numero,
      };
    });
  }

  /**
   * Contratos que cruzaram HOJE o marco de `dias` de atraso.
   *
   * Partimos das parcelas que vencem exatamente ha `dias` e confirmamos, no
   * contrato, que esse e mesmo o maior atraso. Sem essa conferencia, um
   * contrato que ja estava 200 dias atrasado apareceria de novo como "novo
   * inadimplente" so porque outra parcela dele completou 8 dias.
   */
  private async levantarMarco(
    referencia: DataCivil,
    politica: PoliticaDeInadimplencia,
    dias: number,
  ): Promise<MarcoDoContrato[]> {
    const vencimentoAlvo = referencia.somarDias(-dias);
    const parcelas = await this.repositorios.parcelas.emAbertoComVencimentoEntre(vencimentoAlvo, vencimentoAlvo);
    if (parcelas.length === 0) return [];

    const contratoIds = [...new Set(parcelas.map((parcela) => parcela.contratoId.paraString()))];
    const [contratos, parcelasPorContrato, contextos] = await Promise.all([
      this.repositorios.contratos.porIds(contratoIds),
      this.repositorios.parcelas.porContratos(contratoIds),
      this.consultaDeContexto.porParcelas(parcelas.map((parcela) => parcela.id.paraString())),
    ]);

    const contextoPorContrato = new Map(
      [...contextos.values()].map((contexto) => [contexto.contratoId, contexto]),
    );

    const marcos: MarcoDoContrato[] = [];
    for (const contratoId of contratoIds) {
      const contrato = contratos.get(contratoId);
      if (!contrato || !contrato.estaAtivo()) continue;

      const posicao = contrato.posicaoEm(parcelasPorContrato.get(contratoId) ?? [], referencia, politica);
      if (posicao.diasDeAtrasoMaximo !== dias) continue;

      const contexto = contextoPorContrato.get(contratoId);
      marcos.push({
        contrato: contrato.numero,
        cliente: contexto?.clienteNome ?? '—',
        imovel: contexto ? `${contexto.loteamento} · Q ${contexto.quadra} · L ${contexto.lote}` : '—',
        diasDeAtraso: posicao.diasDeAtrasoMaximo,
        saldoDevedor: posicao.saldoDevedor,
        totalVencido: posicao.totalVencido,
      });
    }
    return marcos;
  }

  private montarAssunto(
    referencia: DataCivil,
    novosVencidos: number,
    novosInadimplentes: number,
    sujeitosARetomada: number,
  ): string {
    const partes = [`${novosVencidos} novo(s) atraso(s)`];
    if (novosInadimplentes > 0) partes.push(`${novosInadimplentes} inadimplente(s)`);
    if (sujeitosARetomada > 0) partes.push(`${sujeitosARetomada} LOTE(S) A RETOMAR`);
    return `[${this.nomeDaEmpresa}] Cobranca ${referencia.formatarBr()} — ${partes.join(', ')}`;
  }

  private montarCorpo(entrada: {
    resultado: ResultadoDaRegua;
    referencia: DataCivil;
    politica: PoliticaDeInadimplencia;
    novosVencidos: readonly LinhaDeParcela[];
    valorNovosVencidos: Dinheiro;
    novosInadimplentes: readonly MarcoDoContrato[];
    sujeitosARetomada: readonly MarcoDoContrato[];
  }): string {
    const { resultado, referencia, politica, novosVencidos, valorNovosVencidos } = entrada;

    const linhas = [
      `Resumo do ciclo de cobranca de ${referencia.formatarBr()}`,
      '',
      `Cobrancas enviadas.......... ${resultado.enviadas}`,
      `Documentos emitidos......... ${resultado.documentosEmitidos}`,
      `Falhas de envio............. ${resultado.falhas}`,
      `Clientes sem canal.......... ${resultado.semCanal}`,
      `Ja enviadas antes........... ${resultado.ignoradasPorDuplicidade}`,
      `Valor total cobrado......... ${Dinheiro.deCentavos(resultado.valorTotalCobradoCentavos).formatar()}`,
    ];

    // O bloco mais grave primeiro: e o unico com prazo juridico correndo.
    if (entrada.sujeitosARetomada.length > 0) {
      linhas.push(
        '',
        '='.repeat(64),
        `LOTES SUJEITOS A RETOMADA — ${politica.diasParaRetomadaDoLote} DIAS DE ATRASO`,
        `${entrada.sujeitosARetomada.length} contrato(s) atingiram hoje o prazo de retomada.`,
        'O sistema NAO distrata sozinho: e necessario ato humano.',
        '='.repeat(64),
      );
      linhas.push(...this.formatarMarcos(entrada.sujeitosARetomada));
    }

    if (entrada.novosInadimplentes.length > 0) {
      linhas.push(
        '',
        `ENTRARAM EM INADIMPLENCIA HOJE (${politica.diasParaInadimplencia} dias de atraso): ${entrada.novosInadimplentes.length} contrato(s)`,
      );
      linhas.push(...this.formatarMarcos(entrada.novosInadimplentes));
    }

    linhas.push(
      '',
      `NOVOS ATRASOS HOJE: ${novosVencidos.length} parcela(s), ${valorNovosVencidos.formatar()}`,
    );
    for (const item of novosVencidos.slice(0, LIMITE_DE_LINHAS)) {
      linhas.push(`  - ${item.contrato} | ${item.cliente} | parcela ${item.numero} | ${item.valor.formatar()}`);
    }
    if (novosVencidos.length > LIMITE_DE_LINHAS) {
      linhas.push(`  ... e mais ${novosVencidos.length - LIMITE_DE_LINHAS}. Veja a lista completa no painel.`);
    }

    const problemas = resultado.detalhes.filter(
      (detalhe) => detalhe.resultado === 'FALHA' || detalhe.resultado === 'SEM_CANAL',
    );
    if (problemas.length > 0) {
      linhas.push('', `EXIGEM ACAO MANUAL: ${problemas.length} cobranca(s) nao entregue(s)`);
      for (const problema of problemas.slice(0, LIMITE_DE_LINHAS)) {
        linhas.push(`  - [${problema.resultado}] ${problema.contrato} | ${problema.cliente} | ${problema.motivo ?? ''}`);
      }
      if (problemas.length > LIMITE_DE_LINHAS) {
        linhas.push(`  ... e mais ${problemas.length - LIMITE_DE_LINHAS}.`);
      }
    }

    return linhas.join('\n');
  }

  private formatarMarcos(marcos: readonly MarcoDoContrato[]): string[] {
    const linhas = marcos
      .slice(0, LIMITE_DE_LINHAS)
      .map(
        (marco) =>
          `  - ${marco.contrato} | ${marco.cliente} | ${marco.imovel}\n` +
          `      ${marco.diasDeAtraso} dias | vencido ${marco.totalVencido.formatar()} | saldo ${marco.saldoDevedor.formatar()}`,
      );
    if (marcos.length > LIMITE_DE_LINHAS) {
      linhas.push(`  ... e mais ${marcos.length - LIMITE_DE_LINHAS}.`);
    }
    return linhas;
  }
}
