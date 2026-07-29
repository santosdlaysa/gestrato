import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { EventoDaRegua, ReguaDeCobranca } from '../src/domain/cobranca/regua-de-cobranca.js';
import { Parcela } from '../src/domain/contratos/parcela.js';
import { Identificador } from '../src/domain/shared/identificador.js';
import { DataCivil } from '../src/domain/value-objects/data-civil.js';
import { Dinheiro } from '../src/domain/value-objects/dinheiro.js';
import { ErroDeValidacao } from '../src/domain/shared/errors.js';

const VENCIMENTO = '2026-05-10';

/** Fixture: parcela de R$ 1.000,00 vencendo em 10/05/2026. */
function parcela(id = 'parcela-1', vencimento = VENCIMENTO): Parcela {
  return Parcela.nova({
    id: Identificador.de(id),
    contratoId: Identificador.de('contrato-1'),
    numero: 1,
    tipo: 'FINANCIAMENTO',
    valorOriginal: Dinheiro.deReais(1_000),
    vencimento: DataCivil.deIso(vencimento),
  });
}

function quitar(p: Parcela): Parcela {
  p.registrarBaixa({
    valorPrincipal: p.saldoPrincipal(),
    valorJuros: Dinheiro.ZERO,
    valorMulta: Dinheiro.ZERO,
    valorDesconto: Dinheiro.ZERO,
    pagoEm: DataCivil.deIso(VENCIMENTO),
    formaPagamento: 'PIX',
  });
  return p;
}

function pagarParcialmente(p: Parcela): Parcela {
  p.registrarBaixa({
    valorPrincipal: Dinheiro.deReais(300),
    valorJuros: Dinheiro.ZERO,
    valorMulta: Dinheiro.ZERO,
    valorDesconto: Dinheiro.ZERO,
    pagoEm: DataCivil.deIso(VENCIMENTO),
    formaPagamento: 'PIX',
  });
  return p;
}

function chavesEm(dataReferencia: string, parcelas: readonly Parcela[] = [parcela()]): string[] {
  return ReguaDeCobranca.padrao()
    .avaliar(parcelas, DataCivil.deIso(dataReferencia))
    .map((disparo) => disparo.evento.chave);
}

describe('ReguaDeCobranca', () => {
  describe('o evento dispara exatamente na data prevista', () => {
    const agenda: Array<[string, string]> = [
      ['2026-05-05', 'ANTES_DO_VENCIMENTO:5'],
      ['2026-05-09', 'ANTES_DO_VENCIMENTO:1'],
      ['2026-05-10', 'NO_VENCIMENTO:0'],
      ['2026-05-11', 'APOS_O_VENCIMENTO:1'],
      ['2026-05-15', 'APOS_O_VENCIMENTO:5'],
      ['2026-05-20', 'APOS_O_VENCIMENTO:10'],
      ['2026-06-09', 'APOS_O_VENCIMENTO:30'],
    ];

    for (const [dataReferencia, chaveEsperada] of agenda) {
      test(`em ${dataReferencia} a regua dispara ${chaveEsperada} para o vencimento de 10/05/2026`, () => {
        assert.deepEqual(chavesEm(dataReferencia), [chaveEsperada]);
      });
    }

    test('nenhum evento dispara um dia antes ou um dia depois da data programada', () => {
      const bordas = [
        '2026-05-04', '2026-05-06', // ao redor de 5 dias antes
        '2026-05-08', // ao redor de 1 dia antes (05-09) pelo lado anterior
        '2026-05-12', '2026-05-13', // ao redor de 1 dia apos (05-11)
        '2026-05-14', '2026-05-16', // ao redor de 5 dias apos (05-15)
        '2026-05-19', '2026-05-21', // ao redor de 10 dias apos (05-20)
        '2026-06-08', '2026-06-10', // ao redor de 30 dias apos (06-09)
      ];
      for (const dataReferencia of bordas) {
        assert.deepEqual(chavesEm(dataReferencia), [], `${dataReferencia} nao deveria disparar nada`);
      }
    });

    test('a virada de mes nao desloca o disparo de 30 dias apos o vencimento', () => {
      const evento = EventoDaRegua.de({
        gatilho: 'APOS_O_VENCIMENTO',
        dias: 30,
        canais: ['WHATSAPP'],
        modelo: 'atraso_grave',
      });
      assert.equal(evento.dataDeDisparo(DataCivil.deIso('2026-05-10')).paraIso(), '2026-06-09');
      assert.equal(evento.dataDeDisparo(DataCivil.deIso('2026-01-31')).paraIso(), '2026-03-02');
      assert.equal(evento.dataDeDisparo(DataCivil.deIso('2028-01-31')).paraIso(), '2028-03-01');
    });

    test('o evento no vencimento ignora o campo dias', () => {
      const evento = EventoDaRegua.de({
        gatilho: 'NO_VENCIMENTO',
        dias: 7,
        canais: ['EMAIL'],
        modelo: 'vencimento',
      });
      assert.equal(evento.dias, 0);
      assert.equal(evento.chave, 'NO_VENCIMENTO:0');
      assert.equal(evento.dataDeDisparo(DataCivil.deIso(VENCIMENTO)).paraIso(), VENCIMENTO);
    });
  });

  describe('so parcela em aberto e cobrada', () => {
    test('parcela quitada nao gera disparo, mesmo na data exata do evento', () => {
      assert.deepEqual(chavesEm('2026-05-15', [quitar(parcela())]), []);
      assert.deepEqual(chavesEm('2026-05-10', [quitar(parcela())]), []);
    });

    test('parcela cancelada nao gera disparo', () => {
      const cancelada = parcela();
      cancelada.cancelar();
      assert.deepEqual(chavesEm('2026-05-15', [cancelada]), []);
    });

    test('parcela renegociada nao gera disparo: quem cobra e o novo plano', () => {
      const renegociada = parcela();
      renegociada.marcarComoRenegociada();
      assert.deepEqual(chavesEm('2026-05-15', [renegociada]), []);
    });

    test('parcela paga so em parte continua sendo cobrada pelo saldo', () => {
      const parcial = pagarParcialmente(parcela());
      assert.equal(parcial.status, 'PAGA_PARCIAL');
      assert.deepEqual(chavesEm('2026-05-15', [parcial]), ['APOS_O_VENCIMENTO:5']);
      assert.deepEqual(chavesEm('2026-05-05', [parcial]), ['ANTES_DO_VENCIMENTO:5']);
    });

    test('evento desativado nao dispara', () => {
      const regua = ReguaDeCobranca.de([
        EventoDaRegua.de({ gatilho: 'APOS_O_VENCIMENTO', dias: 5, canais: ['WHATSAPP'], modelo: 'atraso', ativo: false }),
        EventoDaRegua.de({ gatilho: 'NO_VENCIMENTO', canais: ['WHATSAPP'], modelo: 'vencimento' }),
      ]);
      assert.equal(regua.avaliar([parcela()], DataCivil.deIso('2026-05-15')).length, 0);
      assert.equal(regua.avaliar([parcela()], DataCivil.deIso('2026-05-10')).length, 1);
      assert.equal(regua.eventosAtivos.length, 1);
    });
  });

  describe('idempotencia do disparo', () => {
    test('a chave de idempotencia identifica parcela e etapa da regua', () => {
      const disparos = ReguaDeCobranca.padrao().avaliar([parcela()], DataCivil.deIso('2026-05-15'));
      assert.equal(disparos.length, 1);
      assert.equal(disparos[0]!.chaveDeIdempotencia, 'parcela-1:APOS_O_VENCIMENTO:5');
    });

    test('avaliar duas vezes o mesmo dia produz exatamente a mesma chave', () => {
      const p = parcela();
      const primeira = ReguaDeCobranca.padrao().avaliar([p], DataCivil.deIso('2026-05-15'));
      const segunda = ReguaDeCobranca.padrao().avaliar([p], DataCivil.deIso('2026-05-15'));
      assert.deepEqual(
        primeira.map((d) => d.chaveDeIdempotencia),
        segunda.map((d) => d.chaveDeIdempotencia),
      );
    });

    test('parcelas diferentes na mesma etapa geram chaves diferentes', () => {
      const disparos = ReguaDeCobranca.padrao().avaliar(
        [parcela('parcela-1'), parcela('parcela-2')],
        DataCivil.deIso('2026-05-15'),
      );
      assert.deepEqual(disparos.map((d) => d.chaveDeIdempotencia), [
        'parcela-1:APOS_O_VENCIMENTO:5',
        'parcela-2:APOS_O_VENCIMENTO:5',
      ]);
    });

    test('etapas diferentes da mesma parcela geram chaves diferentes', () => {
      const p = parcela();
      const regua = ReguaDeCobranca.de([
        EventoDaRegua.de({ gatilho: 'APOS_O_VENCIMENTO', dias: 5, canais: ['WHATSAPP'], modelo: 'atraso' }),
        EventoDaRegua.de({ gatilho: 'ANTES_DO_VENCIMENTO', dias: 5, canais: ['WHATSAPP'], modelo: 'lembrete' }),
      ]);
      const antes = regua.avaliar([p], DataCivil.deIso('2026-05-05'))[0]!.chaveDeIdempotencia;
      const depois = regua.avaliar([p], DataCivil.deIso('2026-05-15'))[0]!.chaveDeIdempotencia;
      assert.equal(antes, 'parcela-1:ANTES_DO_VENCIMENTO:5');
      assert.equal(depois, 'parcela-1:APOS_O_VENCIMENTO:5');
      assert.notEqual(antes, depois);
    });

    test('parcelas com vencimentos distintos sao avaliadas cada uma pela sua data', () => {
      const disparos = ReguaDeCobranca.padrao().avaliar(
        [parcela('parcela-1', '2026-05-10'), parcela('parcela-2', '2026-05-20')],
        DataCivil.deIso('2026-05-15'),
      );
      assert.deepEqual(disparos.map((d) => d.chaveDeIdempotencia), [
        'parcela-1:APOS_O_VENCIMENTO:5',
        'parcela-2:ANTES_DO_VENCIMENTO:5',
      ]);
    });
  });

  describe('composicao da regua', () => {
    test('evento repetido na regua e recusado: nao se cobra duas vezes a mesma etapa', () => {
      assert.throws(
        () =>
          ReguaDeCobranca.de([
            EventoDaRegua.de({ gatilho: 'APOS_O_VENCIMENTO', dias: 5, canais: ['WHATSAPP'], modelo: 'atraso' }),
            EventoDaRegua.de({ gatilho: 'APOS_O_VENCIMENTO', dias: 5, canais: ['EMAIL'], modelo: 'outro' }),
          ]),
        ErroDeValidacao,
      );
      assert.throws(
        () =>
          ReguaDeCobranca.de([
            EventoDaRegua.de({ gatilho: 'NO_VENCIMENTO', canais: ['WHATSAPP'], modelo: 'vencimento' }),
            EventoDaRegua.de({ gatilho: 'NO_VENCIMENTO', canais: ['EMAIL'], modelo: 'vencimento' }),
          ]),
        ErroDeValidacao,
      );
    });

    test('o mesmo numero de dias antes e depois do vencimento sao etapas distintas', () => {
      const regua = ReguaDeCobranca.de([
        EventoDaRegua.de({ gatilho: 'ANTES_DO_VENCIMENTO', dias: 3, canais: ['WHATSAPP'], modelo: 'lembrete' }),
        EventoDaRegua.de({ gatilho: 'APOS_O_VENCIMENTO', dias: 3, canais: ['WHATSAPP'], modelo: 'atraso' }),
      ]);
      assert.equal(regua.eventos.length, 2);
    });

    test('a regua e ordenada do aviso mais antecipado ate a cobranca mais tardia', () => {
      assert.deepEqual(ReguaDeCobranca.padrao().eventos.map((evento) => evento.chave), [
        'ANTES_DO_VENCIMENTO:5',
        'ANTES_DO_VENCIMENTO:1',
        'NO_VENCIMENTO:0',
        'APOS_O_VENCIMENTO:1',
        'APOS_O_VENCIMENTO:5',
        // Ultimo aviso antes de o contrato cruzar o prazo de inadimplencia.
        'APOS_O_VENCIMENTO:7',
        'APOS_O_VENCIMENTO:10',
        'APOS_O_VENCIMENTO:30',
      ]);
    });

    test('a ordenacao independe da ordem em que os eventos foram cadastrados', () => {
      const regua = ReguaDeCobranca.de([
        EventoDaRegua.de({ gatilho: 'APOS_O_VENCIMENTO', dias: 10, canais: ['EMAIL'], modelo: 'atraso' }),
        EventoDaRegua.de({ gatilho: 'ANTES_DO_VENCIMENTO', dias: 1, canais: ['SMS'], modelo: 'lembrete' }),
        EventoDaRegua.de({ gatilho: 'APOS_O_VENCIMENTO', dias: 2, canais: ['SMS'], modelo: 'atraso' }),
        EventoDaRegua.de({ gatilho: 'ANTES_DO_VENCIMENTO', dias: 15, canais: ['EMAIL'], modelo: 'lembrete' }),
        EventoDaRegua.de({ gatilho: 'NO_VENCIMENTO', canais: ['WHATSAPP'], modelo: 'vencimento' }),
      ]);
      assert.deepEqual(regua.eventos.map((evento) => evento.chave), [
        'ANTES_DO_VENCIMENTO:15',
        'ANTES_DO_VENCIMENTO:1',
        'NO_VENCIMENTO:0',
        'APOS_O_VENCIMENTO:2',
        'APOS_O_VENCIMENTO:10',
      ]);
    });

    test('a regua informa ate quando ainda tem algo a dizer sobre um vencimento', () => {
      const padrao = ReguaDeCobranca.padrao();
      assert.equal(padrao.maiorAtrasoConfigurado, 30);
      assert.equal(padrao.maiorAntecedenciaConfigurada, 5);

      const soAvisosPrevios = ReguaDeCobranca.de([
        EventoDaRegua.de({ gatilho: 'ANTES_DO_VENCIMENTO', dias: 7, canais: ['EMAIL'], modelo: 'lembrete' }),
      ]);
      assert.equal(soAvisosPrevios.maiorAtrasoConfigurado, 0);
      assert.equal(soAvisosPrevios.maiorAntecedenciaConfigurada, 7);
    });

    test('a descricao do evento explica a etapa em portugues', () => {
      const padrao = ReguaDeCobranca.padrao();
      assert.deepEqual(padrao.eventos.map((evento) => evento.descricao), [
        '5 dia(s) antes do vencimento',
        '1 dia(s) antes do vencimento',
        'No dia do vencimento',
        '1 dia(s) apos o vencimento',
        '5 dia(s) apos o vencimento',
        '7 dia(s) apos o vencimento',
        '10 dia(s) apos o vencimento',
        '30 dia(s) apos o vencimento',
      ]);
    });
  });

  describe('validacao do evento', () => {
    test('evento antes ou apos o vencimento exige dias maior que zero', () => {
      assert.throws(
        () => EventoDaRegua.de({ gatilho: 'ANTES_DO_VENCIMENTO', dias: 0, canais: ['EMAIL'], modelo: 'lembrete' }),
        ErroDeValidacao,
      );
      assert.throws(
        () => EventoDaRegua.de({ gatilho: 'APOS_O_VENCIMENTO', canais: ['EMAIL'], modelo: 'atraso' }),
        ErroDeValidacao,
      );
    });

    test('dias negativo, fracionado ou absurdo e recusado', () => {
      assert.throws(
        () => EventoDaRegua.de({ gatilho: 'APOS_O_VENCIMENTO', dias: -1, canais: ['EMAIL'], modelo: 'atraso' }),
        ErroDeValidacao,
      );
      assert.throws(
        () => EventoDaRegua.de({ gatilho: 'APOS_O_VENCIMENTO', dias: 1.5, canais: ['EMAIL'], modelo: 'atraso' }),
        ErroDeValidacao,
      );
      assert.throws(
        () => EventoDaRegua.de({ gatilho: 'APOS_O_VENCIMENTO', dias: 3651, canais: ['EMAIL'], modelo: 'atraso' }),
        ErroDeValidacao,
      );
    });

    test('evento sem canal ou com canal desconhecido e recusado', () => {
      assert.throws(
        () => EventoDaRegua.de({ gatilho: 'NO_VENCIMENTO', canais: [], modelo: 'vencimento' }),
        ErroDeValidacao,
      );
      assert.throws(
        () =>
          EventoDaRegua.de({
            gatilho: 'NO_VENCIMENTO',
            canais: ['POMBO_CORREIO' as never],
            modelo: 'vencimento',
          }),
        ErroDeValidacao,
      );
    });

    test('evento sem modelo de mensagem e recusado', () => {
      assert.throws(
        () => EventoDaRegua.de({ gatilho: 'NO_VENCIMENTO', canais: ['EMAIL'], modelo: '   ' }),
        ErroDeValidacao,
      );
    });

    test('a ordem dos canais e a ordem de preferencia de envio', () => {
      const evento = EventoDaRegua.de({
        gatilho: 'NO_VENCIMENTO',
        canais: ['WHATSAPP', 'EMAIL', 'SMS'],
        modelo: 'vencimento',
      });
      assert.deepEqual([...evento.canais], ['WHATSAPP', 'EMAIL', 'SMS']);
      assert.ok(evento.ativo, 'evento nasce ativo por padrao');
    });
  });
});
