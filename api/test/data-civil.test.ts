import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { DataCivil } from '../src/domain/value-objects/data-civil.js';
import { ErroDeValidacao } from '../src/domain/shared/errors.js';

/** Fixture: encurta a escrita de datas fixas nos testes. */
function data(iso: string): DataCivil {
  return DataCivil.deIso(iso);
}

describe('DataCivil', () => {
  describe('somar meses ancorando no fim do mes', () => {
    test('31 de janeiro mais um mes cai em 28 de fevereiro em ano comum', () => {
      assert.equal(data('2026-01-31').somarMeses(1).paraIso(), '2026-02-28');
    });

    test('31 de janeiro mais um mes cai em 29 de fevereiro em ano bissexto', () => {
      assert.equal(data('2028-01-31').somarMeses(1).paraIso(), '2028-02-29');
    });

    test('31 de marco mais um mes cai em 30 de abril, ultimo dia do mes destino', () => {
      assert.equal(data('2026-03-31').somarMeses(1).paraIso(), '2026-04-30');
    });

    test('31 de dezembro de 2026 mais dois meses cai em 28 de fevereiro de 2027', () => {
      assert.equal(data('2026-12-31').somarMeses(2).paraIso(), '2027-02-28');
    });

    test('o dia original e preservado sempre que o mes destino comporta', () => {
      assert.equal(data('2026-01-31').somarMeses(2).paraIso(), '2026-03-31');
      assert.equal(data('2026-01-10').somarMeses(1).paraIso(), '2026-02-10');
      assert.equal(data('2026-01-31').somarMeses(4).paraIso(), '2026-05-31');
    });

    test('somar meses atravessa a virada de ano', () => {
      assert.equal(data('2026-11-15').somarMeses(3).paraIso(), '2027-02-15');
      assert.equal(data('2026-12-31').somarMeses(12).paraIso(), '2027-12-31');
      assert.equal(data('2026-06-30').somarMeses(24).paraIso(), '2028-06-30');
    });

    test('somar meses negativo anda para tras, tambem ancorando no fim do mes', () => {
      assert.equal(data('2026-03-31').somarMeses(-1).paraIso(), '2026-02-28');
      assert.equal(data('2026-01-31').somarMeses(-1).paraIso(), '2025-12-31');
      assert.equal(data('2026-01-15').somarMeses(-13).paraIso(), '2024-12-15');
    });

    test('somar zero mes devolve a mesma data', () => {
      assert.equal(data('2026-07-28').somarMeses(0).paraIso(), '2026-07-28');
    });

    test('quantidade de meses fracionada e recusada', () => {
      assert.throws(() => data('2026-01-31').somarMeses(1.5), ErroDeValidacao);
    });
  });

  describe('somar dias e contar dias', () => {
    test('somar dias atravessa mes e ano', () => {
      assert.equal(data('2026-02-27').somarDias(2).paraIso(), '2026-03-01');
      assert.equal(data('2028-02-28').somarDias(1).paraIso(), '2028-02-29');
      assert.equal(data('2026-12-31').somarDias(1).paraIso(), '2027-01-01');
      assert.equal(data('2026-03-01').somarDias(-1).paraIso(), '2026-02-28');
    });

    test('trinta dias sao trinta dias mesmo atravessando a virada de horario de verao', () => {
      // 08/03/2026 e 01/11/2026 sao viradas de horario de verao no hemisferio norte;
      // a data civil e UTC pura, entao nenhuma hora se perde ou sobra.
      assert.equal(data('2026-03-01').diasAte(data('2026-03-31')), 30);
      assert.equal(data('2026-10-15').diasAte(data('2026-11-14')), 30);
      assert.equal(data('2026-10-15').somarDias(30).paraIso(), '2026-11-14');
      assert.equal(data('2026-02-14').diasAte(data('2026-03-16')), 30);
    });

    test('contagem de dias e negativa quando a data destino e anterior', () => {
      assert.equal(data('2026-03-31').diasAte(data('2026-03-01')), -30);
      assert.equal(data('2026-05-10').diasAte(data('2026-05-10')), 0);
    });

    test('ano bissexto tem 366 dias', () => {
      assert.equal(data('2028-01-01').diasAte(data('2029-01-01')), 366);
      assert.equal(data('2026-01-01').diasAte(data('2027-01-01')), 365);
    });
  });

  describe('leitura de datas', () => {
    test('formato fora de AAAA-MM-DD e recusado', () => {
      assert.throws(() => DataCivil.deIso('10/03/2026'), ErroDeValidacao);
      assert.throws(() => DataCivil.deIso('2026-3-10'), ErroDeValidacao);
      assert.throws(() => DataCivil.deIso(''), ErroDeValidacao);
      assert.throws(() => DataCivil.deIso('ontem'), ErroDeValidacao);
    });

    test('data que nao existe no calendario e recusada', () => {
      assert.throws(() => DataCivil.deIso('2026-02-30'), ErroDeValidacao);
      assert.throws(() => DataCivil.deIso('2026-02-29'), ErroDeValidacao);
      assert.throws(() => DataCivil.deIso('2026-04-31'), ErroDeValidacao);
      assert.throws(() => DataCivil.deIso('2026-13-01'), ErroDeValidacao);
      assert.throws(() => DataCivil.deIso('2026-00-10'), ErroDeValidacao);
      assert.throws(() => DataCivil.de(2026, 1, 0), ErroDeValidacao);
    });

    test('29 de fevereiro existe em ano bissexto', () => {
      assert.equal(DataCivil.deIso('2028-02-29').paraIso(), '2028-02-29');
    });

    test('a parte de hora do ISO completo e descartada: vencimento e fato de calendario', () => {
      assert.equal(DataCivil.deIso('2026-03-10T23:45:00.000Z').paraIso(), '2026-03-10');
      assert.equal(DataCivil.deIso('2026-03-10T00:00:00-03:00').paraIso(), '2026-03-10');
    });

    test('data vinda do banco e lida pelos componentes UTC', () => {
      assert.equal(DataCivil.deDate(new Date(Date.UTC(2026, 2, 10))).paraIso(), '2026-03-10');
      assert.throws(() => DataCivil.deDate(new Date('nao e data')), ErroDeValidacao);
    });
  });

  describe('competencia e limites do mes', () => {
    test('competencia agrupa por ano-mes com dois digitos', () => {
      assert.equal(data('2026-03-05').competencia(), '2026-03');
      assert.equal(data('2026-12-31').competencia(), '2026-12');
      assert.equal(data('2026-01-01').competencia(), '2026-01');
    });

    test('primeiro e ultimo dia do mes respeitam o tamanho do mes', () => {
      assert.equal(data('2026-02-15').primeiroDiaDoMes().paraIso(), '2026-02-01');
      assert.equal(data('2026-02-15').ultimoDiaDoMes().paraIso(), '2026-02-28');
      assert.equal(data('2028-02-15').ultimoDiaDoMes().paraIso(), '2028-02-29');
      assert.equal(data('2026-04-01').ultimoDiaDoMes().paraIso(), '2026-04-30');
      assert.equal(data('2026-12-09').ultimoDiaDoMes().paraIso(), '2026-12-31');
    });
  });

  describe('comparacao entre datas', () => {
    test('comparar ordena cronologicamente', () => {
      assert.ok(data('2026-01-10').comparar(data('2026-02-10')) < 0);
      assert.ok(data('2026-02-10').comparar(data('2026-01-10')) > 0);
      assert.equal(data('2026-02-10').comparar(data('2026-02-10')), 0);
      assert.ok(data('2026-12-31').comparar(data('2027-01-01')) < 0);
    });

    test('anterior, posterior e igual derivam da comparacao', () => {
      assert.ok(data('2026-01-10').anteriorA(data('2026-01-11')));
      assert.ok(data('2026-01-11').posteriorA(data('2026-01-10')));
      assert.ok(data('2026-01-10').igualA(DataCivil.de(2026, 1, 10)));
      assert.equal(data('2026-01-10').anteriorA(data('2026-01-10')), false);
    });

    test('entre inclui as duas pontas do intervalo', () => {
      const inicio = data('2026-01-01');
      const fim = data('2026-01-31');
      assert.ok(data('2026-01-01').entre(inicio, fim));
      assert.ok(data('2026-01-31').entre(inicio, fim));
      assert.ok(data('2026-01-15').entre(inicio, fim));
      assert.equal(data('2025-12-31').entre(inicio, fim), false);
      assert.equal(data('2026-02-01').entre(inicio, fim), false);
    });

    test('a menor data de uma lista vazia e nula', () => {
      assert.equal(DataCivil.minima([]), null);
      assert.equal(
        DataCivil.minima([data('2026-05-10'), data('2026-01-31'), data('2026-03-01')])?.paraIso(),
        '2026-01-31',
      );
    });
  });

  describe('apresentacao', () => {
    test('formato brasileiro usa dia/mes/ano com zero a esquerda', () => {
      assert.equal(data('2026-03-05').formatarBr(), '05/03/2026');
      assert.equal(data('2026-12-31').formatarBr(), '31/12/2026');
    });

    test('serializacao JSON usa o ISO de data civil', () => {
      assert.equal(data('2026-03-05').toJSON(), '2026-03-05');
      assert.equal(JSON.stringify({ vencimento: data('2026-03-05') }), '{"vencimento":"2026-03-05"}');
    });

    test('data de hoje respeita o fuso informado no instante de referencia', () => {
      // 01/01/2027 00:30 UTC ainda e 31/12/2026 em America/Sao_Paulo (UTC-3).
      const instante = new Date('2027-01-01T00:30:00.000Z');
      assert.equal(DataCivil.hoje('America/Sao_Paulo', instante).paraIso(), '2026-12-31');
      assert.equal(DataCivil.hoje('UTC', instante).paraIso(), '2027-01-01');
    });
  });
});
