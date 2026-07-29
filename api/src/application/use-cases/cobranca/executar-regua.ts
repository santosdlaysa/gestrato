import type { Contrato } from '../../../domain/contratos/contrato.js';
import type { Parcela } from '../../../domain/contratos/parcela.js';
import type { DisparoProgramado } from '../../../domain/cobranca/regua-de-cobranca.js';
import type { DataCivil } from '../../../domain/value-objects/data-civil.js';
import { Dinheiro } from '../../../domain/value-objects/dinheiro.js';
import type { Relogio } from '../../ports/comuns.js';
import type { ConsultaDeContextoDeCobranca } from '../../ports/consulta-de-contexto.js';
import type { Repositorios } from '../../ports/repositorios.js';
import { ServicoDeEnvioDeCobranca } from '../../servicos/servico-de-envio-de-cobranca.js';
import { ServicoDeDocumentoAtualizado } from '../../servicos/servico-de-documento-atualizado.js';

export interface EntradaDaRegua {
  readonly data?: DataCivil;
  /** Mostra o que seria enviado sem enviar nada nem gravar historico. */
  readonly simular?: boolean;
}

export interface DetalheDoDisparo {
  readonly parcelaId: string;
  readonly contrato: string;
  readonly cliente: string;
  readonly evento: string;
  readonly canal: string | null;
  readonly valorCentavos: number;
  readonly resultado: 'ENVIADA' | 'FALHA' | 'SEM_CANAL' | 'SIMULADA';
  readonly motivo?: string;
}

export interface ResultadoDaRegua {
  readonly data: string;
  readonly simulado: boolean;
  readonly avaliadas: number;
  readonly disparosProgramados: number;
  readonly enviadas: number;
  readonly ignoradasPorDuplicidade: number;
  readonly falhas: number;
  readonly semCanal: number;
  /** Boletos/Pix emitidos ou reemitidos para acompanhar as mensagens do ciclo. */
  readonly documentosEmitidos: number;
  readonly valorTotalCobradoCentavos: number;
  readonly detalhes: readonly DetalheDoDisparo[];
}

/**
 * O ciclo diario de cobranca.
 *
 * Pergunta a regua o que ela quer disparar hoje, remove o que ja foi enviado e
 * manda o resto. Tres decisoes sustentam este desenho:
 *
 * 1. **Idempotencia por chave** — a chave `parcelaId:GATILHO:dias` e consultada
 *    em bloco antes de qualquer envio. Rodar o job duas vezes no mesmo dia, ou
 *    reprocessar uma data antiga, nao manda nada repetido ao cliente.
 * 2. **Falha isolada** — uma mensagem que nao sai vira `FALHA` naquela cobranca
 *    e o ciclo continua. Um numero invalido nao pode impedir as outras
 *    trezentas cobrancas do dia.
 * 3. **Simulacao** — `simular: true` percorre exatamente o mesmo caminho sem
 *    enviar nem gravar, para conferir a regua antes de disparar de verdade.
 */
export class ExecutarRegua {
  constructor(
    private readonly repositorios: Repositorios,
    private readonly consultaDeContexto: ConsultaDeContextoDeCobranca,
    private readonly servicoDeEnvio: ServicoDeEnvioDeCobranca,
    private readonly servicoDeDocumento: ServicoDeDocumentoAtualizado,
    private readonly relogio: Relogio,
  ) {}

  async executar(entrada: EntradaDaRegua = {}): Promise<ResultadoDaRegua> {
    const data = entrada.data ?? this.relogio.hoje();
    const simular = entrada.simular ?? false;

    const regua = await this.repositorios.regua.obter();
    const parcelas = await this.carregarParcelasDaJanela(regua.maiorAntecedenciaConfigurada, regua.maiorAtrasoConfigurado, data);

    const disparos = regua.avaliar(parcelas, data);
    if (disparos.length === 0) {
      return this.resultadoVazio(data, simular, parcelas.length);
    }

    const jaEnviadas = await this.repositorios.cobrancas.chavesJaRegistradas(
      disparos.map((disparo) => disparo.chaveDeIdempotencia),
    );
    const pendentes = disparos.filter((disparo) => !jaEnviadas.has(disparo.chaveDeIdempotencia));

    const { detalhes, documentosEmitidos } = await this.processar(pendentes, data, simular);

    return {
      data: data.paraIso(),
      simulado: simular,
      avaliadas: parcelas.length,
      disparosProgramados: disparos.length,
      enviadas: detalhes.filter((d) => d.resultado === 'ENVIADA' || d.resultado === 'SIMULADA').length,
      ignoradasPorDuplicidade: disparos.length - pendentes.length,
      falhas: detalhes.filter((d) => d.resultado === 'FALHA').length,
      semCanal: detalhes.filter((d) => d.resultado === 'SEM_CANAL').length,
      documentosEmitidos,
      valorTotalCobradoCentavos: detalhes.reduce((total, detalhe) => total + detalhe.valorCentavos, 0),
      detalhes,
    };
  }

  /**
   * Busca so a faixa de vencimentos que a regua alcanca hoje. Sem esta janela,
   * o ciclo leria a tabela inteira de parcelas todo dia.
   */
  private carregarParcelasDaJanela(
    antecedencia: number,
    atraso: number,
    data: DataCivil,
  ): Promise<Parcela[]> {
    return this.repositorios.parcelas.emAbertoComVencimentoEntre(
      data.somarDias(-atraso),
      data.somarDias(antecedencia),
    );
  }

  private async processar(
    disparos: readonly DisparoProgramado[],
    data: DataCivil,
    simular: boolean,
  ): Promise<{ detalhes: DetalheDoDisparo[]; documentosEmitidos: number }> {
    if (disparos.length === 0) return { detalhes: [], documentosEmitidos: 0 };

    const parcelaIds = disparos.map((disparo) => disparo.parcela.id.paraString());
    const [contextos, documentos, modelos, contratos] = await Promise.all([
      this.consultaDeContexto.porParcelas(parcelaIds),
      this.repositorios.documentos.vigentesDasParcelas(parcelaIds),
      this.repositorios.modelos.mapa(),
      this.carregarContratos(disparos),
    ]);

    const detalhes: DetalheDoDisparo[] = [];
    let documentosEmitidos = 0;

    for (const disparo of disparos) {
      const parcelaId = disparo.parcela.id.paraString();
      const contexto = contextos.get(parcelaId);
      const contrato = contratos.get(disparo.parcela.contratoId.paraString());

      if (!contexto || !contrato || contrato.estaEncerrado()) continue;

      const modelo = modelos.get(disparo.evento.modelo);
      if (!modelo) {
        detalhes.push(
          this.detalhe(disparo, contexto.contratoNumero, contexto.clienteNome, null, Dinheiro.ZERO, 'FALHA', {
            motivo: `Modelo "${disparo.evento.modelo}" nao cadastrado.`,
          }),
        );
        continue;
      }

      const vigente = documentos.get(parcelaId) ?? null;
      const valor = disparo.parcela.demonstrativoEm(contrato.politicaDeEncargos, data).total;

      if (simular) {
        detalhes.push(
          this.detalhe(disparo, contexto.contratoNumero, contexto.clienteNome, disparo.evento.canais[0] ?? null, valor, 'SIMULADA'),
        );
        continue;
      }

      // Boleto/Pix ANTES da mensagem: cobrar sem meio de pagamento so gera
      // ligacao do cliente perguntando como pagar.
      let documento = vigente;
      if (disparo.evento.emitirDocumento) {
        documento = await this.servicoDeDocumento.garantir({
          parcela: disparo.parcela,
          contrato,
          tipo: disparo.evento.tipoDeDocumento,
          dataDeReferencia: data,
          documentoVigente: vigente,
        });
        // `garantir` devolve o proprio documento vigente quando nao precisou
        // emitir; instancia diferente significa emissao nova.
        if (documento !== null && documento !== vigente) documentosEmitidos += 1;
      }

      const resultado = await this.servicoDeEnvio.enviar({
        parcela: disparo.parcela,
        contrato,
        contexto,
        documento,
        gatilho: disparo.evento.gatilho,
        dias: disparo.evento.dias,
        canaisPreferidos: disparo.evento.canais,
        modelo,
        chaveDeIdempotencia: disparo.chaveDeIdempotencia,
        dataDeReferencia: data,
      });

      detalhes.push(
        resultado.situacao === 'SEM_CANAL'
          ? this.detalhe(disparo, contexto.contratoNumero, contexto.clienteNome, null, valor, 'SEM_CANAL', {
              motivo: resultado.motivo,
            })
          : this.detalhe(
              disparo,
              contexto.contratoNumero,
              contexto.clienteNome,
              resultado.cobranca.canal,
              resultado.cobranca.valorCobrado,
              resultado.situacao === 'ENVIADA' ? 'ENVIADA' : 'FALHA',
              resultado.situacao === 'FALHA' ? { motivo: resultado.motivo } : {},
            ),
      );
    }

    return { detalhes, documentosEmitidos };
  }

  private carregarContratos(disparos: readonly DisparoProgramado[]): Promise<Map<string, Contrato>> {
    const ids = [...new Set(disparos.map((disparo) => disparo.parcela.contratoId.paraString()))];
    return this.repositorios.contratos.porIds(ids);
  }

  private detalhe(
    disparo: DisparoProgramado,
    contrato: string,
    cliente: string,
    canal: string | null,
    valor: Dinheiro,
    resultado: DetalheDoDisparo['resultado'],
    extra: { motivo?: string } = {},
  ): DetalheDoDisparo {
    return {
      parcelaId: disparo.parcela.id.paraString(),
      contrato,
      cliente,
      evento: disparo.evento.chave,
      canal,
      valorCentavos: valor.centavos,
      resultado,
      ...extra,
    };
  }

  private resultadoVazio(data: DataCivil, simulado: boolean, avaliadas: number): ResultadoDaRegua {
    return {
      data: data.paraIso(),
      simulado,
      avaliadas,
      disparosProgramados: 0,
      enviadas: 0,
      ignoradasPorDuplicidade: 0,
      falhas: 0,
      semCanal: 0,
      documentosEmitidos: 0,
      valorTotalCobradoCentavos: 0,
      detalhes: [],
    };
  }
}
