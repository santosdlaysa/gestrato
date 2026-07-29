import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { PoliticaDeEncargos } from '../src/domain/contratos/politica-de-encargos.js';
import { Dinheiro } from '../src/domain/value-objects/dinheiro.js';
import { Percentual } from '../src/domain/value-objects/percentual.js';
import { ErroDeValidacao } from '../src/domain/shared/errors.js';

/** Fixture: multa de 2%, juros de 1% a.m. e a carencia informada. */
function politica(diasDeCarencia = 0): PoliticaDeEncargos {
  return PoliticaDeEncargos.de({
    multaPorAtraso: Percentual.de(2),
    jurosAoMes: Percentual.de(1),
    diasDeCarencia,
  });
}

const MIL_REAIS = Dinheiro.deReais(1000);

describe('PoliticaDeEncargos', () => {
  describe('sem atraso nao ha encargo', () => {
    test('parcela paga no dia do vencimento nao tem multa nem juros', () => {
      const encargos = politica().calcular(MIL_REAIS, 0);
      assert.equal(encargos.multa.centavos, 0);
      assert.equal(encargos.juros.centavos, 0);
      assert.equal(encargos.diasDeAtraso, 0);
      assert.equal(encargos.diasCobrados, 0);
    });

    test('pagamento antecipado nao gera encargo nem atraso negativo', () => {
      const encargos = politica().calcular(MIL_REAIS, -7);
      assert.equal(encargos.multa.centavos, 0);
      assert.equal(encargos.juros.centavos, 0);
      assert.equal(encargos.diasDeAtraso, 0);
      assert.equal(encargos.diasCobrados, 0);
    });
  });

  describe('multa e juros sobre o saldo', () => {
    test('saldo de R$ 1.000,00 com 30 dias de atraso paga R$ 20,00 de multa e R$ 10,00 de juros', () => {
      const encargos = politica().calcular(MIL_REAIS, 30);
      assert.equal(encargos.multa.centavos, 2000);
      assert.equal(encargos.juros.centavos, 1000);
      assert.equal(encargos.diasDeAtraso, 30);
      assert.equal(encargos.diasCobrados, 30);
    });

    test('a multa incide uma unica vez: dobrar os dias de atraso nao dobra a multa', () => {
      const trintaDias = politica().calcular(MIL_REAIS, 30);
      const sessentaDias = politica().calcular(MIL_REAIS, 60);
      assert.equal(sessentaDias.multa.centavos, trintaDias.multa.centavos);
      assert.equal(sessentaDias.multa.centavos, 2000);
    });

    test('os juros sao pro rata die: 60 dias custam o dobro de 30 dias', () => {
      const trintaDias = politica().calcular(MIL_REAIS, 30);
      const sessentaDias = politica().calcular(MIL_REAIS, 60);
      assert.equal(sessentaDias.juros.centavos, 2000);
      assert.equal(sessentaDias.juros.centavos, trintaDias.juros.centavos * 2);
    });

    test('um unico dia de atraso ja custa multa cheia mais um trinta avos dos juros do mes', () => {
      const encargos = politica().calcular(MIL_REAIS, 1);
      assert.equal(encargos.multa.centavos, 2000);
      // 1% a.m. / 30 dias x 1 dia sobre R$ 1.000,00 = R$ 0,33.
      assert.equal(encargos.juros.centavos, 33);
    });

    test('multa e juros incidem sobre o saldo devedor, nao sobre o valor original da parcela', () => {
      const saldoRemanescente = Dinheiro.deReais(400);
      const encargos = politica().calcular(saldoRemanescente, 30);
      assert.equal(encargos.multa.centavos, 800);
      assert.equal(encargos.juros.centavos, 400);
    });

    test('politica padrao do sistema e multa de 2%, juros de 1% ao mes e nenhuma carencia', () => {
      assert.equal(PoliticaDeEncargos.PADRAO.multaPorAtraso.valor, 2);
      assert.equal(PoliticaDeEncargos.PADRAO.jurosAoMes.valor, 1);
      assert.equal(PoliticaDeEncargos.PADRAO.diasDeCarencia, 0);
      const encargos = PoliticaDeEncargos.PADRAO.calcular(MIL_REAIS, 30);
      assert.equal(encargos.multa.centavos, 2000);
      assert.equal(encargos.juros.centavos, 1000);
    });

    test('politica sem multa e sem juros nunca cobra nada, mesmo com atraso longo', () => {
      const semEncargo = PoliticaDeEncargos.de({
        multaPorAtraso: Percentual.ZERO,
        jurosAoMes: Percentual.ZERO,
        diasDeCarencia: 0,
      });
      const encargos = semEncargo.calcular(MIL_REAIS, 365);
      assert.equal(encargos.multa.centavos, 0);
      assert.equal(encargos.juros.centavos, 0);
      assert.equal(encargos.diasDeAtraso, 365);
      assert.equal(encargos.diasCobrados, 365);
    });
  });

  describe('carencia', () => {
    test('atraso dentro da carencia de 5 dias nao gera multa nem juros', () => {
      const encargos = politica(5).calcular(MIL_REAIS, 3);
      assert.equal(encargos.multa.centavos, 0);
      assert.equal(encargos.juros.centavos, 0);
      assert.equal(encargos.diasCobrados, 0);
    });

    test('o ultimo dia da carencia ainda nao cobra; o primeiro dia seguinte ja cobra', () => {
      const noLimite = politica(5).calcular(MIL_REAIS, 5);
      assert.equal(noLimite.multa.centavos, 0);
      assert.equal(noLimite.juros.centavos, 0);
      assert.equal(noLimite.diasCobrados, 0);

      const umDiaDepois = politica(5).calcular(MIL_REAIS, 6);
      assert.equal(umDiaDepois.multa.centavos, 2000);
      assert.equal(umDiaDepois.diasCobrados, 1);
    });

    test('vencida a carencia de 5 dias, 8 dias de atraso cobram juros de apenas 3 dias', () => {
      const encargos = politica(5).calcular(MIL_REAIS, 8);
      assert.equal(encargos.multa.centavos, 2000);
      // 1% a.m. / 30 x 3 dias sobre R$ 1.000,00 = R$ 1,00.
      assert.equal(encargos.juros.centavos, 100);
      assert.equal(encargos.diasDeAtraso, 8);
      assert.equal(encargos.diasCobrados, 3);
    });

    test('dias de atraso corridos e dias cobrados sao reportados separadamente', () => {
      const encargos = politica(10).calcular(MIL_REAIS, 45);
      assert.equal(encargos.diasDeAtraso, 45, 'o cliente ve 45 dias corridos de atraso');
      assert.equal(encargos.diasCobrados, 35, 'mas so 35 dias sao onerados');
      // 1% a.m. / 30 x 35 dias sobre R$ 1.000,00 = R$ 11,67.
      assert.equal(encargos.juros.centavos, 1167);
    });

    test('dias cobraveis nunca sao negativos', () => {
      assert.equal(politica(5).diasCobraveis(0), 0);
      assert.equal(politica(5).diasCobraveis(2), 0);
      assert.equal(politica(5).diasCobraveis(-10), 0);
      assert.equal(politica(5).diasCobraveis(12), 7);
      assert.equal(politica(0).diasCobraveis(12), 12);
    });
  });

  describe('saldo sem valor a cobrar', () => {
    test('saldo zerado nao gera encargo por mais antiga que seja a parcela', () => {
      const encargos = politica().calcular(Dinheiro.ZERO, 400);
      assert.equal(encargos.multa.centavos, 0);
      assert.equal(encargos.juros.centavos, 0);
      assert.equal(encargos.diasDeAtraso, 400);
      assert.equal(encargos.diasCobrados, 0);
    });

    test('saldo negativo (credito do cliente) nao gera encargo', () => {
      const encargos = politica().calcular(Dinheiro.deCentavos(-5000), 30);
      assert.equal(encargos.multa.centavos, 0);
      assert.equal(encargos.juros.centavos, 0);
      assert.equal(encargos.diasCobrados, 0);
    });
  });

  describe('validacao da politica', () => {
    test('carencia deve ser inteiro nao negativo', () => {
      assert.throws(() => politica(-1), ErroDeValidacao);
      assert.throws(() => politica(2.5), ErroDeValidacao);
    });

    test('carencia acima de 90 dias e recusada', () => {
      assert.throws(() => politica(91), ErroDeValidacao);
      assert.equal(politica(90).diasDeCarencia, 90);
    });

    test('percentual negativo ou acima de 100% nao e taxa valida', () => {
      assert.throws(() => Percentual.de(-1), ErroDeValidacao);
      assert.throws(() => Percentual.de(101), ErroDeValidacao);
      assert.throws(() => Percentual.de(Number.NaN), ErroDeValidacao);
    });
  });
});
