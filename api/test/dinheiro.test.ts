import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { Dinheiro } from '../src/domain/value-objects/dinheiro.js';
import { ErroDeValidacao } from '../src/domain/shared/errors.js';

/** Fixture: soma os centavos de uma lista de partes rateadas. */
function somaEmCentavos(partes: readonly Dinheiro[]): number {
  return partes.reduce((total, parte) => total + parte.centavos, 0);
}

describe('Dinheiro', () => {
  describe('conversao de reais para centavos', () => {
    test('valor em reais vira centavos inteiros sem depender da representacao binaria do float', () => {
      assert.equal(Dinheiro.deReais(1234.56).centavos, 123456);
      assert.equal(Dinheiro.deReais(19.99).centavos, 1999);
      assert.equal(Dinheiro.deReais(0.07).centavos, 7);
      assert.equal(Dinheiro.deReais(1).centavos, 100);
    });

    test('soma imprecisa de float nao gera centavo fantasma: 0,10 + 0,20 vale exatamente 30 centavos', () => {
      assert.equal(Dinheiro.deReais(0.1 + 0.2).centavos, 30);
      assert.equal(Dinheiro.deReais(0.1).somar(Dinheiro.deReais(0.2)).centavos, 30);
    });

    test('meio centavo e arredondado para cima (half-up), como manda a convencao de cobranca', () => {
      assert.equal(Dinheiro.deReais(0.005).centavos, 1);
      assert.equal(Dinheiro.deReais(0.015).centavos, 2);
      assert.equal(Dinheiro.deReais(2.675).centavos, 268);
      assert.equal(Dinheiro.deReais(1234.565).centavos, 123457);
    });

    // BUG NO DOMINIO (src/domain/value-objects/dinheiro.ts:33) — mantido falhando de proposito.
    // `deReais` multiplica por 100 em ponto flutuante antes de arredondar; valores como
    // 1,005 viram 100.49999999999999 e arredondam PARA BAIXO, contrariando o half-up que
    // o proprio cabecalho da classe promete ("0,005 -> 0,01"). Cerca de 5,7% dos valores
    // com meio centavo caem nessa armadilha (0,145; 0,285; 1,005; 1,015; 1,025; ...).
    test('meio centavo sobe mesmo quando o float o representa por baixo (1,005 vale 101 centavos)', () => {
      assert.equal(Dinheiro.deReais(1.005).centavos, 101);
      assert.equal(Dinheiro.deReais(0.145).centavos, 15);
      assert.equal(Dinheiro.deReais(1.015).centavos, 102);
    });

    test('valor negativo arredonda meio centavo afastando-se do zero', () => {
      assert.equal(Dinheiro.deReais(-0.005).centavos, -1);
      assert.equal(Dinheiro.deReais(-2.675).centavos, -268);
    });

    test('valor abaixo de meio centavo e descartado', () => {
      assert.equal(Dinheiro.deReais(0.004).centavos, 0);
      assert.equal(Dinheiro.deReais(0.0049).centavos, 0);
    });

    test('valor nao finito nao e dinheiro', () => {
      assert.throws(() => Dinheiro.deReais(Number.NaN), ErroDeValidacao);
      assert.throws(() => Dinheiro.deReais(Number.POSITIVE_INFINITY), ErroDeValidacao);
      assert.throws(() => Dinheiro.deReais(Number.NEGATIVE_INFINITY), ErroDeValidacao);
    });
  });

  describe('construcao a partir de centavos', () => {
    test('centavo fracionado e recusado: nao existe meio centavo em conta a receber', () => {
      assert.throws(() => Dinheiro.deCentavos(10.5), ErroDeValidacao);
      assert.throws(() => Dinheiro.deCentavos(0.1), ErroDeValidacao);
    });

    test('centavo nao finito e recusado', () => {
      assert.throws(() => Dinheiro.deCentavos(Number.NaN), ErroDeValidacao);
      assert.throws(() => Dinheiro.deCentavos(Number.POSITIVE_INFINITY), ErroDeValidacao);
    });

    test('valor acima do inteiro seguro e recusado, porque a partir dali a soma mente', () => {
      assert.throws(() => Dinheiro.deCentavos(Number.MAX_SAFE_INTEGER + 2), ErroDeValidacao);
      assert.equal(Dinheiro.deCentavos(Number.MAX_SAFE_INTEGER).centavos, Number.MAX_SAFE_INTEGER);
    });
  });

  describe('rateio', () => {
    test('a soma das partes rateadas e sempre exatamente o total, em 100 combinacoes de valor e divisor', () => {
      const valores = [1, 7, 100, 999, 1000, 10007, 123456, 1000000, 12000000, 99999999];
      const divisores = [1, 2, 3, 5, 7, 11, 12, 24, 36, 360];

      for (const centavos of valores) {
        for (const partes of divisores) {
          const rateio = Dinheiro.deCentavos(centavos).ratear(partes);
          assert.equal(rateio.length, partes, `${centavos} em ${partes} partes: quantidade errada`);
          assert.equal(
            somaEmCentavos(rateio),
            centavos,
            `${centavos} em ${partes} partes: a soma nao fecha`,
          );
          const maior = Math.max(...rateio.map((p) => p.centavos));
          const menor = Math.min(...rateio.map((p) => p.centavos));
          assert.ok(
            maior - menor <= 1,
            `${centavos} em ${partes} partes: diferenca entre parcelas passou de 1 centavo`,
          );
        }
      }
    });

    test('divisao nao exata joga o centavo que sobra nas ultimas partes', () => {
      assert.deepEqual(
        Dinheiro.deCentavos(100000).ratear(3).map((p) => p.centavos),
        [33333, 33333, 33334],
      );
      assert.deepEqual(
        Dinheiro.deCentavos(1000700).ratear(7).map((p) => p.centavos),
        [142957, 142957, 142957, 142957, 142957, 142957, 142958],
      );
      assert.deepEqual(
        Dinheiro.deCentavos(10).ratear(4).map((p) => p.centavos),
        [2, 2, 3, 3],
      );
    });

    test('valor negativo tambem fecha exatamente, com a sobra indo para as ultimas partes', () => {
      const rateio = Dinheiro.deCentavos(-1000).ratear(3);
      assert.deepEqual(rateio.map((p) => p.centavos), [-333, -333, -334]);
      assert.equal(somaEmCentavos(rateio), -1000);
    });

    test('ratear zero devolve partes zeradas', () => {
      const rateio = Dinheiro.ZERO.ratear(4);
      assert.deepEqual(rateio.map((p) => p.centavos), [0, 0, 0, 0]);
      assert.equal(somaEmCentavos(rateio), 0);
    });

    test('ratear em uma unica parte devolve o proprio valor', () => {
      assert.deepEqual(Dinheiro.deCentavos(10007).ratear(1).map((p) => p.centavos), [10007]);
    });

    test('numero de partes deve ser inteiro positivo', () => {
      assert.throws(() => Dinheiro.deCentavos(100).ratear(0), ErroDeValidacao);
      assert.throws(() => Dinheiro.deCentavos(100).ratear(-3), ErroDeValidacao);
      assert.throws(() => Dinheiro.deCentavos(100).ratear(2.5), ErroDeValidacao);
    });
  });

  describe('multiplicacao', () => {
    test('multiplicacao arredonda meio centavo para cima', () => {
      assert.equal(Dinheiro.deCentavos(101).multiplicarPor(0.5).centavos, 51);
      assert.equal(Dinheiro.deCentavos(103).multiplicarPor(0.5).centavos, 52);
    });

    test('multiplicacao de valor negativo arredonda afastando-se do zero', () => {
      assert.equal(Dinheiro.deCentavos(-101).multiplicarPor(0.5).centavos, -51);
    });

    test('multa de 2% sobre R$ 1.000,00 da R$ 20,00', () => {
      assert.equal(Dinheiro.deReais(1000).multiplicarPor(0.02).centavos, 2000);
    });

    test('fator nao finito e recusado', () => {
      assert.throws(() => Dinheiro.deCentavos(100).multiplicarPor(Number.NaN), ErroDeValidacao);
      assert.throws(() => Dinheiro.deCentavos(100).multiplicarPor(Number.POSITIVE_INFINITY), ErroDeValidacao);
    });
  });

  describe('saldos e agregacoes', () => {
    test('saldo devedor nunca fica negativo', () => {
      assert.equal(Dinheiro.deCentavos(-500).naoNegativo().centavos, 0);
      assert.equal(Dinheiro.ZERO.naoNegativo().centavos, 0);
      assert.equal(Dinheiro.deCentavos(500).naoNegativo().centavos, 500);
    });

    test('soma de lista vazia e zero, nao indefinido', () => {
      assert.equal(Dinheiro.somaDe([]).centavos, 0);
      assert.ok(Dinheiro.somaDe([]).ehZero());
    });

    test('soma de lista acumula todos os valores', () => {
      const total = Dinheiro.somaDe([
        Dinheiro.deReais(1000),
        Dinheiro.deReais(250.5),
        Dinheiro.deCentavos(-50),
      ]);
      assert.equal(total.centavos, 125000);
    });

    test('subtracao produz o saldo bruto, inclusive negativo', () => {
      assert.equal(Dinheiro.deReais(100).subtrair(Dinheiro.deReais(150)).centavos, -5000);
    });

    test('comparacoes respondem sobre a ordem dos valores', () => {
      const cem = Dinheiro.deReais(100);
      const duzentos = Dinheiro.deReais(200);
      assert.ok(duzentos.maiorQue(cem));
      assert.ok(cem.menorQue(duzentos));
      assert.ok(cem.igualA(Dinheiro.deCentavos(10000)));
      assert.ok(Dinheiro.deCentavos(-1).ehNegativo());
      assert.ok(Dinheiro.deCentavos(1).ehPositivo());
      assert.ok(Dinheiro.ZERO.ehZero());
      assert.equal(Dinheiro.ZERO.ehPositivo(), false);
    });

    test('reais e a leitura decimal dos centavos', () => {
      assert.equal(Dinheiro.deCentavos(123456).reais, 1234.56);
      assert.equal(Dinheiro.deCentavos(123456).toJSON(), 123456);
    });
  });
});
