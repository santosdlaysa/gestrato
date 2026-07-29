import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { PoliticaDeInadimplencia } from '../src/domain/contratos/politica-de-inadimplencia.js';
import { Contrato } from '../src/domain/contratos/contrato.js';
import { Parcela } from '../src/domain/contratos/parcela.js';
import { PoliticaDeEncargos } from '../src/domain/contratos/politica-de-encargos.js';
import { TermosDoFinanciamento } from '../src/domain/contratos/termos-do-financiamento.js';
import { Identificador } from '../src/domain/shared/identificador.js';
import { DataCivil } from '../src/domain/value-objects/data-civil.js';
import { Dinheiro } from '../src/domain/value-objects/dinheiro.js';

const HOJE = DataCivil.de(2026, 7, 28);
const CONTRATO_ID = Identificador.de('contrato-1');

function montarContrato(): Contrato {
  return Contrato.novo({
    id: CONTRATO_ID,
    numero: '2026/0001',
    clienteId: Identificador.de('cliente-1'),
    loteId: Identificador.de('lote-1'),
    termos: TermosDoFinanciamento.de({
      valorTotal: Dinheiro.deCentavos(1_200_000),
      valorEntrada: Dinheiro.ZERO,
      dataEntrada: null,
      formaPagamentoEntrada: null,
      quantidadeDeParcelas: 12,
      valorDaParcela: null,
      primeiroVencimento: DataCivil.de(2026, 1, 10),
      periodicidade: 'MENSAL',
    }),
    politicaDeEncargos: PoliticaDeEncargos.PADRAO,
    dataAssinatura: DataCivil.de(2025, 12, 1),
  });
}

/** Parcela em aberto que venceu ha `diasDeAtraso` dias em relacao a HOJE. */
function parcelaAtrasadaHa(diasDeAtraso: number, numero = 1): Parcela {
  return Parcela.nova({
    id: Identificador.de(`parcela-${numero}`),
    contratoId: CONTRATO_ID,
    numero,
    tipo: 'FINANCIAMENTO',
    valorOriginal: Dinheiro.deCentavos(100_000),
    vencimento: HOJE.somarDias(-diasDeAtraso),
  });
}

describe('Escala de inadimplencia', () => {
  const politica = PoliticaDeInadimplencia.de({ diasParaInadimplencia: 8, diasParaRetomadaDoLote: 90 });

  test('sem atraso o contrato esta em dia', () => {
    assert.equal(politica.classificar(0), 'EM_DIA');
  });

  test('do primeiro dia ate a vespera do prazo, e apenas atraso — nao inadimplencia', () => {
    for (const dias of [1, 2, 5, 7]) {
      assert.equal(politica.classificar(dias), 'EM_ATRASO', `${dias} dias deveria ser EM_ATRASO`);
    }
  });

  test('no oitavo dia vira inadimplencia, e a borda e exata', () => {
    assert.equal(politica.classificar(7), 'EM_ATRASO');
    assert.equal(politica.classificar(8), 'INADIMPLENTE');
  });

  test('aos 90 dias o lote fica sujeito a retomada, e a borda e exata', () => {
    assert.equal(politica.classificar(89), 'INADIMPLENTE');
    assert.equal(politica.classificar(90), 'SUJEITO_A_RETOMADA');
    assert.equal(politica.classificar(400), 'SUJEITO_A_RETOMADA');
  });

  test('os limiares sao configuraveis pela loteadora', () => {
    const outra = PoliticaDeInadimplencia.de({ diasParaInadimplencia: 15, diasParaRetomadaDoLote: 180 });
    assert.equal(outra.classificar(14), 'EM_ATRASO');
    assert.equal(outra.classificar(15), 'INADIMPLENTE');
    assert.equal(outra.classificar(179), 'INADIMPLENTE');
    assert.equal(outra.classificar(180), 'SUJEITO_A_RETOMADA');
  });

  test('a retomada precisa vir depois da inadimplencia', () => {
    assert.throws(
      () => PoliticaDeInadimplencia.de({ diasParaInadimplencia: 90, diasParaRetomadaDoLote: 30 }),
      /retomada do lote .* precisa vir depois da inadimplencia/,
    );
    assert.throws(
      () => PoliticaDeInadimplencia.de({ diasParaInadimplencia: 30, diasParaRetomadaDoLote: 30 }),
      /precisa vir depois/,
    );
  });

  test('limiares invalidos sao recusados', () => {
    assert.throws(() => PoliticaDeInadimplencia.de({ diasParaInadimplencia: 0, diasParaRetomadaDoLote: 90 }));
    assert.throws(() => PoliticaDeInadimplencia.de({ diasParaInadimplencia: 1.5, diasParaRetomadaDoLote: 90 }));
    assert.throws(() => PoliticaDeInadimplencia.de({ diasParaInadimplencia: 8, diasParaRetomadaDoLote: 4000 }));
  });

  test('a politica padrao e 8 dias para inadimplencia e 90 para retomada', () => {
    assert.equal(PoliticaDeInadimplencia.PADRAO.diasParaInadimplencia, 8);
    assert.equal(PoliticaDeInadimplencia.PADRAO.diasParaRetomadaDoLote, 90);
  });

  test('dias restantes ate a retomada nunca ficam negativos', () => {
    assert.equal(politica.diasAteARetomada(0), 90);
    assert.equal(politica.diasAteARetomada(30), 60);
    assert.equal(politica.diasAteARetomada(90), 0);
    assert.equal(politica.diasAteARetomada(500), 0);
  });
});

describe('Marcos de alerta', () => {
  const politica = PoliticaDeInadimplencia.PADRAO;

  /** Alerta na virada, nao todo dia — repetir diariamente faz a equipe parar de ler. */
  test('o contrato cruza a inadimplencia uma unica vez, no dia exato', () => {
    assert.equal(politica.cruzouInadimplenciaHoje(7), false);
    assert.equal(politica.cruzouInadimplenciaHoje(8), true);
    assert.equal(politica.cruzouInadimplenciaHoje(9), false);
  });

  test('o contrato cruza a retomada uma unica vez, no dia exato', () => {
    assert.equal(politica.cruzouRetomadaHoje(89), false);
    assert.equal(politica.cruzouRetomadaHoje(90), true);
    assert.equal(politica.cruzouRetomadaHoje(91), false);
  });
});

describe('Situacao do contrato pela escala', () => {
  const politica = PoliticaDeInadimplencia.PADRAO;

  test('contrato sem parcela vencida fica em dia', () => {
    const contrato = montarContrato();
    const futura = Parcela.nova({
      id: Identificador.de('parcela-futura'),
      contratoId: CONTRATO_ID,
      numero: 1,
      tipo: 'FINANCIAMENTO',
      valorOriginal: Dinheiro.deCentavos(100_000),
      vencimento: HOJE.somarDias(10),
    });

    const posicao = contrato.posicaoEm([futura], HOJE, politica);
    assert.equal(posicao.situacao, 'EM_DIA');
    assert.equal(posicao.diasDeAtrasoMaximo, 0);
  });

  test('atraso curto deixa o contrato em atraso, nao inadimplente', () => {
    const posicao = montarContrato().posicaoEm([parcelaAtrasadaHa(3)], HOJE, politica);
    assert.equal(posicao.situacao, 'EM_ATRASO');
    assert.equal(posicao.diasDeAtrasoMaximo, 3);
  });

  test('a partir do prazo configurado o contrato fica inadimplente', () => {
    const posicao = montarContrato().posicaoEm([parcelaAtrasadaHa(8)], HOJE, politica);
    assert.equal(posicao.situacao, 'INADIMPLENTE');
  });

  /**
   * Vale sempre o pior caso: e o contrato inteiro que fica sujeito a retomada,
   * nao a parcela. Classificar pela parcela mais recente esconderia o problema.
   */
  test('vale o maior atraso do contrato, nao o menor', () => {
    const posicao = montarContrato().posicaoEm(
      [parcelaAtrasadaHa(100, 1), parcelaAtrasadaHa(2, 2)],
      HOJE,
      politica,
    );
    assert.equal(posicao.diasDeAtrasoMaximo, 100);
    assert.equal(posicao.situacao, 'SUJEITO_A_RETOMADA');
    assert.equal(posicao.diasAteARetomada, 0);
  });

  test('contrato inadimplente informa quantos dias faltam para a retomada', () => {
    const posicao = montarContrato().posicaoEm([parcelaAtrasadaHa(28)], HOJE, politica);
    assert.equal(posicao.situacao, 'INADIMPLENTE');
    assert.equal(posicao.diasAteARetomada, 62);
  });

  test('contrato encerrado tem situacao propria, independente do atraso', () => {
    const quitado = montarContrato();
    const paga = parcelaAtrasadaHa(200);
    paga.registrarBaixa({
      valorPrincipal: Dinheiro.deCentavos(100_000),
      valorJuros: Dinheiro.ZERO,
      valorMulta: Dinheiro.ZERO,
      valorDesconto: Dinheiro.ZERO,
      pagoEm: HOJE,
      formaPagamento: 'PIX',
    });
    quitado.quitar([paga]);
    assert.equal(quitado.posicaoEm([paga], HOJE, politica).situacao, 'QUITADO');

    const cancelado = montarContrato();
    cancelado.cancelar();
    assert.equal(cancelado.posicaoEm([parcelaAtrasadaHa(200)], HOJE, politica).situacao, 'CANCELADO');
  });

  test('sem politica informada, a posicao usa o padrao de 8 e 90 dias', () => {
    assert.equal(montarContrato().posicaoEm([parcelaAtrasadaHa(3)], HOJE).situacao, 'EM_ATRASO');
    assert.equal(montarContrato().posicaoEm([parcelaAtrasadaHa(8)], HOJE).situacao, 'INADIMPLENTE');
    assert.equal(montarContrato().posicaoEm([parcelaAtrasadaHa(90)], HOJE).situacao, 'SUJEITO_A_RETOMADA');
  });
});
