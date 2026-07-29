import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  TermosDoFinanciamento,
  type EspecificacaoDeParcela,
} from '../src/domain/contratos/termos-do-financiamento.js';
import type { FormaPagamento, Periodicidade } from '../src/domain/contratos/tipos.js';
import { DataCivil } from '../src/domain/value-objects/data-civil.js';
import { Dinheiro } from '../src/domain/value-objects/dinheiro.js';
import { ErroDeValidacao } from '../src/domain/shared/errors.js';

interface Ajustes {
  valorTotal?: Dinheiro;
  valorEntrada?: Dinheiro;
  dataEntrada?: DataCivil | null;
  formaPagamentoEntrada?: FormaPagamento | null;
  quantidadeDeParcelas?: number;
  valorDaParcela?: Dinheiro | null;
  primeiroVencimento?: DataCivil | null;
  periodicidade?: Periodicidade;
}

/** Fixture: contrato de R$ 120.000,00 em 12 parcelas mensais, sem entrada. */
function termos(ajustes: Ajustes = {}): TermosDoFinanciamento {
  return TermosDoFinanciamento.de({
    valorTotal: Dinheiro.deReais(120_000),
    valorEntrada: Dinheiro.ZERO,
    dataEntrada: null,
    formaPagamentoEntrada: null,
    quantidadeDeParcelas: 12,
    valorDaParcela: null,
    primeiroVencimento: DataCivil.deIso('2026-02-10'),
    periodicidade: 'MENSAL',
    ...ajustes,
  });
}

function somaDoPlano(plano: readonly EspecificacaoDeParcela[]): number {
  return plano.reduce((total, linha) => total + linha.valor.centavos, 0);
}

describe('TermosDoFinanciamento', () => {
  describe('o plano gerado sempre fecha com o valor total', () => {
    test('R$ 120.000,00 em 7 parcelas fecha no centavo, com a sobra nas ultimas parcelas', () => {
      const plano = termos({ quantidadeDeParcelas: 7 }).gerarPlanoDeParcelas();
      assert.deepEqual(
        plano.map((linha) => linha.valor.centavos),
        [1_714_285, 1_714_285, 1_714_286, 1_714_286, 1_714_286, 1_714_286, 1_714_286],
      );
      assert.equal(somaDoPlano(plano), 12_000_000);
    });

    test('a soma do plano e exatamente o valor total em todas as combinacoes de valor e quantidade', () => {
      const totais = [1, 100, 99_999, 100_000, 12_000_000, 35_000_055, 100_000_001];
      const quantidades = [1, 2, 3, 7, 12, 24, 36, 60, 120, 240, 360, 600];

      for (const valorTotal of totais) {
        for (const quantidadeDeParcelas of quantidades) {
          if (valorTotal < quantidadeDeParcelas) continue; // parcela precisa ter valor positivo
          const plano = termos({
            valorTotal: Dinheiro.deCentavos(valorTotal),
            quantidadeDeParcelas,
          }).gerarPlanoDeParcelas();
          assert.equal(
            somaDoPlano(plano),
            valorTotal,
            `${valorTotal} centavos em ${quantidadeDeParcelas} parcelas nao fecha`,
          );
          assert.equal(plano.length, quantidadeDeParcelas);
        }
      }
    });

    test('com entrada, a soma da entrada mais as parcelas continua sendo exatamente o valor total', () => {
      const entradas = [1, 5_000, 1_000_000, 3_333_333, 9_999_999];
      const quantidades = [1, 3, 7, 13, 24, 61];

      for (const valorEntrada of entradas) {
        for (const quantidadeDeParcelas of quantidades) {
          const plano = termos({
            valorTotal: Dinheiro.deCentavos(35_000_055),
            valorEntrada: Dinheiro.deCentavos(valorEntrada),
            dataEntrada: DataCivil.deIso('2026-01-05'),
            formaPagamentoEntrada: 'PIX',
            quantidadeDeParcelas,
          }).gerarPlanoDeParcelas();
          assert.equal(
            somaDoPlano(plano),
            35_000_055,
            `entrada de ${valorEntrada} em ${quantidadeDeParcelas} parcelas nao fecha`,
          );
          assert.equal(plano.length, quantidadeDeParcelas + 1);
        }
      }
    });

    test('R$ 100.000,00 com R$ 20.000,00 de entrada gera 24 parcelas que somam o financiado', () => {
      const plano = termos({
        valorTotal: Dinheiro.deReais(100_000),
        valorEntrada: Dinheiro.deReais(20_000),
        dataEntrada: DataCivil.deIso('2026-01-05'),
        formaPagamentoEntrada: 'PIX',
        quantidadeDeParcelas: 24,
      }).gerarPlanoDeParcelas();

      const financiamento = plano.filter((linha) => linha.tipo === 'FINANCIAMENTO');
      assert.equal(financiamento.reduce((t, l) => t + l.valor.centavos, 0), 8_000_000);
      assert.equal(somaDoPlano(plano), 10_000_000);
      assert.deepEqual(
        [...new Set(financiamento.map((l) => l.valor.centavos))].sort((a, b) => a - b),
        [333_333, 333_334],
      );
    });
  });

  describe('entrada', () => {
    test('entrada vira a parcela zero, do tipo ENTRADA, vencendo na data da entrada', () => {
      const plano = termos({
        valorEntrada: Dinheiro.deReais(30_000),
        dataEntrada: DataCivil.deIso('2026-01-05'),
        formaPagamentoEntrada: 'PIX',
      }).gerarPlanoDeParcelas();

      const entrada = plano[0]!;
      assert.equal(entrada.numero, 0);
      assert.equal(entrada.tipo, 'ENTRADA');
      assert.equal(entrada.valor.centavos, 3_000_000);
      assert.equal(entrada.vencimento.paraIso(), '2026-01-05');
      assert.equal(entrada.descricao, 'Entrada');
    });

    test('contrato sem entrada nao gera parcela zero', () => {
      const plano = termos().gerarPlanoDeParcelas();
      assert.equal(plano.some((linha) => linha.tipo === 'ENTRADA'), false);
      assert.equal(plano[0]!.numero, 1);
      assert.equal(termos().temEntrada(), false);
    });

    test('contrato quitado na entrada gera somente a parcela zero', () => {
      const plano = termos({
        valorTotal: Dinheiro.deReais(50_000),
        valorEntrada: Dinheiro.deReais(50_000),
        dataEntrada: DataCivil.deIso('2026-01-05'),
        formaPagamentoEntrada: 'DINHEIRO',
        quantidadeDeParcelas: 0,
        primeiroVencimento: null,
      }).gerarPlanoDeParcelas();

      assert.equal(plano.length, 1);
      assert.equal(plano[0]!.tipo, 'ENTRADA');
      assert.equal(plano[0]!.valor.centavos, 5_000_000);
    });

    test('o valor financiado e o total menos a entrada', () => {
      const comEntrada = termos({
        valorEntrada: Dinheiro.deReais(20_000),
        dataEntrada: DataCivil.deIso('2026-01-05'),
        formaPagamentoEntrada: 'PIX',
      });
      assert.equal(comEntrada.valorFinanciado.centavos, 10_000_000);
      assert.ok(comEntrada.temEntrada());
      assert.equal(termos().valorFinanciado.centavos, 12_000_000);
    });
  });

  describe('numeracao e descricao das parcelas', () => {
    test('as parcelas de financiamento sao numeradas de 1 a N e marcadas como FINANCIAMENTO', () => {
      const plano = termos({ quantidadeDeParcelas: 5 }).gerarPlanoDeParcelas();
      assert.deepEqual(plano.map((linha) => linha.numero), [1, 2, 3, 4, 5]);
      assert.ok(plano.every((linha) => linha.tipo === 'FINANCIAMENTO'));
    });

    test('a numeracao das parcelas de financiamento continua em 1 mesmo havendo entrada', () => {
      const plano = termos({
        quantidadeDeParcelas: 3,
        valorEntrada: Dinheiro.deReais(30_000),
        dataEntrada: DataCivil.deIso('2026-01-05'),
        formaPagamentoEntrada: 'PIX',
      }).gerarPlanoDeParcelas();
      assert.deepEqual(plano.map((linha) => linha.numero), [0, 1, 2, 3]);
      assert.deepEqual(plano.map((linha) => linha.tipo), [
        'ENTRADA',
        'FINANCIAMENTO',
        'FINANCIAMENTO',
        'FINANCIAMENTO',
      ]);
    });

    test('a descricao mostra a posicao da parcela no plano', () => {
      const plano = termos({ quantidadeDeParcelas: 3 }).gerarPlanoDeParcelas();
      assert.deepEqual(plano.map((linha) => linha.descricao), [
        'Parcela 1/3',
        'Parcela 2/3',
        'Parcela 3/3',
      ]);
    });
  });

  describe('espacamento dos vencimentos pela periodicidade', () => {
    const esperados: Record<Periodicidade, string[]> = {
      MENSAL: ['2026-01-15', '2026-02-15', '2026-03-15'],
      BIMESTRAL: ['2026-01-15', '2026-03-15', '2026-05-15'],
      TRIMESTRAL: ['2026-01-15', '2026-04-15', '2026-07-15'],
      SEMESTRAL: ['2026-01-15', '2026-07-15', '2027-01-15'],
      ANUAL: ['2026-01-15', '2027-01-15', '2028-01-15'],
    };

    for (const [periodicidade, vencimentos] of Object.entries(esperados)) {
      test(`periodicidade ${periodicidade} espaca os vencimentos conforme o contrato`, () => {
        const plano = termos({
          quantidadeDeParcelas: 3,
          primeiroVencimento: DataCivil.deIso('2026-01-15'),
          periodicidade: periodicidade as Periodicidade,
        }).gerarPlanoDeParcelas();
        assert.deepEqual(plano.map((linha) => linha.vencimento.paraIso()), vencimentos);
      });
    }

    test('a primeira parcela vence exatamente na data do primeiro vencimento', () => {
      const plano = termos({ primeiroVencimento: DataCivil.deIso('2026-04-07') }).gerarPlanoDeParcelas();
      assert.equal(plano[0]!.vencimento.paraIso(), '2026-04-07');
    });

    test('vencimento no dia 31 ancora no ultimo dia dos meses mais curtos', () => {
      const plano = termos({
        quantidadeDeParcelas: 6,
        primeiroVencimento: DataCivil.deIso('2026-01-31'),
        periodicidade: 'MENSAL',
      }).gerarPlanoDeParcelas();
      assert.deepEqual(plano.map((linha) => linha.vencimento.paraIso()), [
        '2026-01-31',
        '2026-02-28',
        '2026-03-31',
        '2026-04-30',
        '2026-05-31',
        '2026-06-30',
      ]);
    });

    test('vencimento no dia 31 ancora em 29 de fevereiro quando o ano e bissexto', () => {
      const plano = termos({
        quantidadeDeParcelas: 2,
        primeiroVencimento: DataCivil.deIso('2028-01-31'),
        periodicidade: 'MENSAL',
      }).gerarPlanoDeParcelas();
      assert.deepEqual(plano.map((linha) => linha.vencimento.paraIso()), ['2028-01-31', '2028-02-29']);
    });

    test('o ancoramento nao e cumulativo: depois de fevereiro o dia 31 volta', () => {
      const plano = termos({
        quantidadeDeParcelas: 4,
        primeiroVencimento: DataCivil.deIso('2026-12-31'),
        periodicidade: 'MENSAL',
      }).gerarPlanoDeParcelas();
      assert.deepEqual(plano.map((linha) => linha.vencimento.paraIso()), [
        '2026-12-31',
        '2027-01-31',
        '2027-02-28',
        '2027-03-31',
      ]);
    });
  });

  describe('valor de parcela fixado no contrato', () => {
    test('quando o contrato fixa o valor, todas menos a ultima tem esse valor', () => {
      const plano = termos({
        valorTotal: Dinheiro.deReais(100_000),
        quantidadeDeParcelas: 3,
        valorDaParcela: Dinheiro.deReais(33_333),
      }).gerarPlanoDeParcelas();

      assert.deepEqual(plano.map((linha) => linha.valor.centavos), [3_333_300, 3_333_300, 3_333_400]);
      assert.equal(somaDoPlano(plano), 10_000_000);
    });

    test('a ultima parcela absorve a diferenca de arredondamento, para mais ou para menos', () => {
      const paraMais = termos({
        valorTotal: Dinheiro.deReais(10_000),
        quantidadeDeParcelas: 4,
        valorDaParcela: Dinheiro.deReais(2_000),
      }).gerarPlanoDeParcelas();
      assert.deepEqual(paraMais.map((l) => l.valor.centavos), [200_000, 200_000, 200_000, 400_000]);

      const paraMenos = termos({
        valorTotal: Dinheiro.deReais(10_000),
        quantidadeDeParcelas: 4,
        valorDaParcela: Dinheiro.deReais(2_600),
      }).gerarPlanoDeParcelas();
      assert.deepEqual(paraMenos.map((l) => l.valor.centavos), [260_000, 260_000, 260_000, 220_000]);
      assert.equal(somaDoPlano(paraMenos), 1_000_000);
    });

    test('o valor fixado vale sobre o financiado, nao sobre o total, quando ha entrada', () => {
      const plano = termos({
        valorTotal: Dinheiro.deReais(100_000),
        valorEntrada: Dinheiro.deReais(40_000),
        dataEntrada: DataCivil.deIso('2026-01-05'),
        formaPagamentoEntrada: 'PIX',
        quantidadeDeParcelas: 3,
        valorDaParcela: Dinheiro.deReais(20_000),
      }).gerarPlanoDeParcelas();

      assert.deepEqual(plano.map((l) => l.valor.centavos), [4_000_000, 2_000_000, 2_000_000, 2_000_000]);
      assert.equal(somaDoPlano(plano), 10_000_000);
    });
  });

  describe('condicoes comerciais impossiveis sao recusadas na origem', () => {
    test('contrato sem valor nao existe', () => {
      assert.throws(() => termos({ valorTotal: Dinheiro.ZERO }), ErroDeValidacao);
      assert.throws(() => termos({ valorTotal: Dinheiro.deCentavos(-1) }), ErroDeValidacao);
    });

    test('entrada negativa e recusada', () => {
      assert.throws(
        () => termos({ valorEntrada: Dinheiro.deCentavos(-100), dataEntrada: DataCivil.deIso('2026-01-05') }),
        ErroDeValidacao,
      );
    });

    test('entrada maior que o valor total e recusada', () => {
      assert.throws(
        () =>
          termos({
            valorTotal: Dinheiro.deReais(100_000),
            valorEntrada: Dinheiro.deReais(100_001),
            dataEntrada: DataCivil.deIso('2026-01-05'),
          }),
        ErroDeValidacao,
      );
    });

    test('contrato com entrada exige a data da entrada', () => {
      assert.throws(
        () => termos({ valorEntrada: Dinheiro.deReais(10_000), dataEntrada: null }),
        ErroDeValidacao,
      );
    });

    test('saldo a financiar sem quantidade de parcelas e recusado', () => {
      assert.throws(
        () => termos({ quantidadeDeParcelas: 0, primeiroVencimento: null }),
        ErroDeValidacao,
      );
    });

    test('quantidade de parcelas sem data do primeiro vencimento e recusada', () => {
      assert.throws(() => termos({ primeiroVencimento: null }), ErroDeValidacao);
    });

    test('contrato quitado na entrada nao pode ter parcelas de financiamento', () => {
      assert.throws(
        () =>
          termos({
            valorTotal: Dinheiro.deReais(50_000),
            valorEntrada: Dinheiro.deReais(50_000),
            dataEntrada: DataCivil.deIso('2026-01-05'),
            quantidadeDeParcelas: 6,
          }),
        ErroDeValidacao,
      );
    });

    test('parcelas fixadas que estouram o valor financiado sao recusadas', () => {
      assert.throws(
        () =>
          termos({
            valorTotal: Dinheiro.deReais(100_000),
            quantidadeDeParcelas: 3,
            valorDaParcela: Dinheiro.deReais(50_000),
          }),
        ErroDeValidacao,
      );
      assert.throws(
        () =>
          termos({
            valorTotal: Dinheiro.deReais(100_000),
            quantidadeDeParcelas: 12,
            valorDaParcela: Dinheiro.deReais(10_000),
          }),
        ErroDeValidacao,
      );
    });

    test('valor de parcela zerado ou negativo e recusado', () => {
      assert.throws(() => termos({ valorDaParcela: Dinheiro.ZERO }), ErroDeValidacao);
      assert.throws(() => termos({ valorDaParcela: Dinheiro.deCentavos(-100) }), ErroDeValidacao);
    });

    test('quantidade de parcelas deve ser inteiro nao negativo e dentro do limite', () => {
      assert.throws(() => termos({ quantidadeDeParcelas: -1 }), ErroDeValidacao);
      assert.throws(() => termos({ quantidadeDeParcelas: 12.5 }), ErroDeValidacao);
      assert.throws(() => termos({ quantidadeDeParcelas: 601 }), ErroDeValidacao);
      assert.equal(termos({ quantidadeDeParcelas: 600 }).quantidadeDeParcelas, 600);
    });
  });

  describe('leitura das condicoes acordadas', () => {
    test('os termos expoem exatamente o que foi contratado', () => {
      const contratado = termos({
        valorTotal: Dinheiro.deReais(100_000),
        valorEntrada: Dinheiro.deReais(20_000),
        dataEntrada: DataCivil.deIso('2026-01-05'),
        formaPagamentoEntrada: 'BOLETO',
        quantidadeDeParcelas: 36,
        primeiroVencimento: DataCivil.deIso('2026-02-10'),
        periodicidade: 'MENSAL',
      });

      assert.equal(contratado.valorTotal.centavos, 10_000_000);
      assert.equal(contratado.valorEntrada.centavos, 2_000_000);
      assert.equal(contratado.dataEntrada?.paraIso(), '2026-01-05');
      assert.equal(contratado.formaPagamentoEntrada, 'BOLETO');
      assert.equal(contratado.quantidadeDeParcelas, 36);
      assert.equal(contratado.valorDaParcela, null);
      assert.equal(contratado.primeiroVencimento?.paraIso(), '2026-02-10');
      assert.equal(contratado.periodicidade, 'MENSAL');
    });
  });
});
