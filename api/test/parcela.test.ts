import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { Parcela, type Baixa } from '../src/domain/contratos/parcela.js';
import { PoliticaDeEncargos } from '../src/domain/contratos/politica-de-encargos.js';
import type { TipoParcela } from '../src/domain/contratos/tipos.js';
import { Identificador } from '../src/domain/shared/identificador.js';
import { DataCivil } from '../src/domain/value-objects/data-civil.js';
import { Dinheiro } from '../src/domain/value-objects/dinheiro.js';
import { ErroDeRegraDeNegocio, ErroDeValidacao } from '../src/domain/shared/errors.js';

const VENCIMENTO = '2026-03-10';

/** Fixture: parcela 1 de R$ 1.000,00 vencendo em 10/03/2026. */
function parcela(
  ajustes: {
    numero?: number;
    tipo?: TipoParcela;
    valorOriginal?: Dinheiro;
    vencimento?: DataCivil;
  } = {},
): Parcela {
  return Parcela.nova({
    id: Identificador.de('parcela-1'),
    contratoId: Identificador.de('contrato-1'),
    numero: ajustes.numero ?? 1,
    tipo: ajustes.tipo ?? 'FINANCIAMENTO',
    valorOriginal: ajustes.valorOriginal ?? Dinheiro.deReais(1_000),
    vencimento: ajustes.vencimento ?? DataCivil.deIso(VENCIMENTO),
    descricao: 'Parcela 1/12',
  });
}

function baixa(ajustes: Partial<Baixa> = {}): Baixa {
  return {
    valorPrincipal: Dinheiro.deReais(1_000),
    valorJuros: Dinheiro.ZERO,
    valorMulta: Dinheiro.ZERO,
    valorDesconto: Dinheiro.ZERO,
    pagoEm: DataCivil.deIso(VENCIMENTO),
    formaPagamento: 'PIX',
    ...ajustes,
  };
}

describe('Parcela', () => {
  describe('baixa parcial mantem a parcela em aberto', () => {
    test('recebimento menor que o saldo deixa a parcela PAGA_PARCIAL e ainda cobravel', () => {
      const p = parcela();
      p.registrarBaixa(baixa({ valorPrincipal: Dinheiro.deReais(400) }));

      assert.equal(p.status, 'PAGA_PARCIAL');
      assert.equal(p.saldoPrincipal().centavos, 60_000);
      assert.ok(p.estaEmAberto(), 'parcela paga em parte continua gerando cobranca');
      assert.equal(p.estaQuitada(), false);
      assert.equal(p.estaEncerrada(), false);
    });

    test('recebimento que zera o saldo deixa a parcela PAGA e encerrada', () => {
      const p = parcela();
      p.registrarBaixa(baixa());

      assert.equal(p.status, 'PAGA');
      assert.equal(p.saldoPrincipal().centavos, 0);
      assert.ok(p.estaQuitada());
      assert.ok(p.estaEncerrada());
      assert.equal(p.estaEmAberto(), false);
    });

    test('duas baixas parciais se somam e quitam a parcela', () => {
      const p = parcela();
      p.registrarBaixa(baixa({ valorPrincipal: Dinheiro.deReais(400) }));
      assert.equal(p.status, 'PAGA_PARCIAL');

      p.registrarBaixa(baixa({ valorPrincipal: Dinheiro.deReais(600), pagoEm: DataCivil.deIso('2026-03-20') }));
      assert.equal(p.status, 'PAGA');
      assert.equal(p.valorPago.centavos, 100_000);
      assert.equal(p.saldoPrincipal().centavos, 0);
      assert.equal(p.pagoEm?.paraIso(), '2026-03-20', 'a data do pagamento e a da ultima baixa');
    });

    test('multa e juros recebidos entram no total recebido sem abater o principal', () => {
      const p = parcela();
      p.registrarBaixa(
        baixa({
          valorPrincipal: Dinheiro.deReais(400),
          valorMulta: Dinheiro.deReais(20),
          valorJuros: Dinheiro.deReais(10),
        }),
      );

      assert.equal(p.saldoPrincipal().centavos, 60_000, 'mora nao abate principal');
      assert.equal(p.multaRecebida.centavos, 2_000);
      assert.equal(p.jurosRecebidos.centavos, 1_000);
      assert.equal(p.totalRecebido.centavos, 43_000);
    });

    test('a forma de pagamento registrada e a da baixa', () => {
      const p = parcela();
      assert.equal(p.formaPagamento, null);
      p.registrarBaixa(baixa({ formaPagamento: 'BOLETO' }));
      assert.equal(p.formaPagamento, 'BOLETO');
    });
  });

  describe('baixas recusadas', () => {
    test('baixa maior que o saldo da parcela e recusada', () => {
      const p = parcela();
      assert.throws(() => p.registrarBaixa(baixa({ valorPrincipal: Dinheiro.deCentavos(100_001) })), ErroDeRegraDeNegocio);
      assert.equal(p.status, 'PENDENTE');
      assert.equal(p.valorPago.centavos, 0);
    });

    test('baixa maior que o saldo remanescente de uma parcela ja parcialmente paga e recusada', () => {
      const p = parcela();
      p.registrarBaixa(baixa({ valorPrincipal: Dinheiro.deReais(700) }));
      assert.throws(() => p.registrarBaixa(baixa({ valorPrincipal: Dinheiro.deReais(301) })), ErroDeRegraDeNegocio);
      assert.equal(p.valorPago.centavos, 70_000);
    });

    test('principal somado ao desconto tambem nao pode exceder o saldo', () => {
      const p = parcela();
      assert.throws(
        () =>
          p.registrarBaixa(
            baixa({ valorPrincipal: Dinheiro.deReais(900), valorDesconto: Dinheiro.deReais(200) }),
          ),
        ErroDeRegraDeNegocio,
      );
    });

    test('parcela ja paga nao aceita nova baixa', () => {
      const p = parcela();
      p.registrarBaixa(baixa());
      assert.throws(() => p.registrarBaixa(baixa({ valorPrincipal: Dinheiro.deReais(1) })), ErroDeRegraDeNegocio);
    });

    test('parcela cancelada nao aceita baixa', () => {
      const p = parcela();
      p.cancelar();
      assert.throws(() => p.registrarBaixa(baixa()), ErroDeRegraDeNegocio);
    });

    test('parcela renegociada nao aceita baixa: quem paga e o novo plano', () => {
      const p = parcela();
      p.marcarComoRenegociada();
      assert.throws(() => p.registrarBaixa(baixa()), ErroDeRegraDeNegocio);
    });

    test('baixa sem principal e sem desconto nao movimenta nada e e recusada', () => {
      const p = parcela();
      assert.throws(
        () => p.registrarBaixa(baixa({ valorPrincipal: Dinheiro.ZERO, valorJuros: Dinheiro.deReais(10) })),
        ErroDeValidacao,
      );
    });

    test('valores negativos na baixa sao recusados', () => {
      const p = parcela();
      assert.throws(
        () =>
          p.registrarBaixa(
            baixa({ valorPrincipal: Dinheiro.deReais(100), valorJuros: Dinheiro.deCentavos(-1) }),
          ),
        ErroDeValidacao,
      );
    });

    test('parcela precisa nascer com numero nao negativo e valor positivo', () => {
      assert.throws(() => parcela({ numero: -1 }), ErroDeValidacao);
      assert.throws(() => parcela({ numero: 1.5 }), ErroDeValidacao);
      assert.throws(() => parcela({ valorOriginal: Dinheiro.ZERO }), ErroDeValidacao);
      assert.throws(() => parcela({ valorOriginal: Dinheiro.deCentavos(-100) }), ErroDeValidacao);
      assert.equal(parcela({ numero: 0, tipo: 'ENTRADA' }).numero, 0, 'a entrada e a parcela zero');
    });
  });

  describe('desconto', () => {
    test('desconto concedido abate o saldo principal', () => {
      const p = parcela();
      p.registrarBaixa(baixa({ valorPrincipal: Dinheiro.deReais(900), valorDesconto: Dinheiro.deReais(100) }));

      assert.equal(p.descontoConcedido.centavos, 10_000);
      assert.equal(p.valorPago.centavos, 90_000);
      assert.equal(p.saldoPrincipal().centavos, 0);
      assert.equal(p.status, 'PAGA', 'principal mais desconto quitam a parcela');
      assert.equal(p.totalRecebido.centavos, 90_000, 'desconto nao e dinheiro recebido');
    });

    test('desconto sozinho abate parte do saldo e mantem a parcela em aberto', () => {
      const p = parcela();
      p.registrarBaixa(baixa({ valorPrincipal: Dinheiro.ZERO, valorDesconto: Dinheiro.deReais(100) }));

      assert.equal(p.saldoPrincipal().centavos, 90_000);
      assert.equal(p.status, 'PAGA_PARCIAL');
    });
  });

  describe('situacao na data de referencia', () => {
    test('parcela pendente com vencimento no futuro esta A_VENCER', () => {
      assert.equal(parcela().situacaoEm(DataCivil.deIso('2026-03-09')), 'A_VENCER');
      assert.equal(parcela().situacaoEm(DataCivil.deIso('2026-01-01')), 'A_VENCER');
    });

    test('parcela pendente no proprio dia do vencimento VENCE_HOJE e ainda nao esta vencida', () => {
      const p = parcela();
      assert.equal(p.situacaoEm(DataCivil.deIso(VENCIMENTO)), 'VENCE_HOJE');
      assert.equal(p.estaVencidaEm(DataCivil.deIso(VENCIMENTO)), false);
      assert.ok(p.venceEm(DataCivil.deIso(VENCIMENTO)));
      assert.equal(p.diasDeAtrasoEm(DataCivil.deIso(VENCIMENTO)), 0);
    });

    test('parcela pendente no dia seguinte ao vencimento ja esta VENCIDA', () => {
      const p = parcela();
      assert.equal(p.situacaoEm(DataCivil.deIso('2026-03-11')), 'VENCIDA');
      assert.ok(p.estaVencidaEm(DataCivil.deIso('2026-03-11')));
      assert.equal(p.diasDeAtrasoEm(DataCivil.deIso('2026-03-11')), 1);
      assert.equal(p.diasDeAtrasoEm(DataCivil.deIso('2026-04-09')), 30);
    });

    test('parcela paga esta PAGA em qualquer data de referencia', () => {
      const p = parcela();
      p.registrarBaixa(baixa());
      assert.equal(p.situacaoEm(DataCivil.deIso('2026-01-01')), 'PAGA');
      assert.equal(p.situacaoEm(DataCivil.deIso('2027-12-31')), 'PAGA');
      assert.equal(p.estaVencidaEm(DataCivil.deIso('2027-12-31')), false);
    });

    test('parcela cancelada e parcela renegociada mostram o proprio status, nunca vencida', () => {
      const cancelada = parcela();
      cancelada.cancelar();
      assert.equal(cancelada.situacaoEm(DataCivil.deIso('2027-01-01')), 'CANCELADA');

      const renegociada = parcela();
      renegociada.marcarComoRenegociada();
      assert.equal(renegociada.situacaoEm(DataCivil.deIso('2027-01-01')), 'RENEGOCIADA');
      assert.equal(renegociada.estaVencidaEm(DataCivil.deIso('2027-01-01')), false);
    });

    test('parcela paga em parte antes do vencimento aparece como PAGA_PARCIAL; depois, como VENCIDA', () => {
      const p = parcela();
      p.registrarBaixa(baixa({ valorPrincipal: Dinheiro.deReais(400) }));
      assert.equal(p.situacaoEm(DataCivil.deIso('2026-03-01')), 'PAGA_PARCIAL');
      assert.equal(p.situacaoEm(DataCivil.deIso(VENCIMENTO)), 'VENCE_HOJE');
      assert.equal(p.situacaoEm(DataCivil.deIso('2026-03-11')), 'VENCIDA');
    });

    test('dias de atraso nunca sao negativos antes do vencimento', () => {
      assert.equal(parcela().diasDeAtrasoEm(DataCivil.deIso('2026-01-10')), 0);
    });
  });

  describe('demonstrativo de debito', () => {
    test('o total a pagar e o principal mais multa mais juros na data de referencia', () => {
      const p = parcela();
      const demonstrativo = p.demonstrativoEm(PoliticaDeEncargos.PADRAO, DataCivil.deIso('2026-04-09'));

      assert.equal(demonstrativo.saldoPrincipal.centavos, 100_000);
      assert.equal(demonstrativo.multa.centavos, 2_000);
      assert.equal(demonstrativo.juros.centavos, 1_000);
      assert.equal(demonstrativo.total.centavos, 103_000);
      assert.equal(demonstrativo.diasDeAtraso, 30);
      assert.equal(demonstrativo.diasCobrados, 30);
    });

    test('a mora incide sobre o saldo remanescente, nao sobre o valor original', () => {
      const p = parcela();
      p.registrarBaixa(baixa({ valorPrincipal: Dinheiro.deReais(600) }));
      const demonstrativo = p.demonstrativoEm(PoliticaDeEncargos.PADRAO, DataCivil.deIso('2026-04-09'));

      assert.equal(demonstrativo.saldoPrincipal.centavos, 40_000);
      assert.equal(demonstrativo.multa.centavos, 800);
      assert.equal(demonstrativo.juros.centavos, 400);
      assert.equal(demonstrativo.total.centavos, 41_200);
    });

    test('parcela em dia tem total igual ao principal, sem encargo', () => {
      const demonstrativo = parcela().demonstrativoEm(PoliticaDeEncargos.PADRAO, DataCivil.deIso(VENCIMENTO));
      assert.equal(demonstrativo.total.centavos, 100_000);
      assert.equal(demonstrativo.multa.centavos, 0);
      assert.equal(demonstrativo.juros.centavos, 0);
    });
  });

  describe('estorno', () => {
    test('estornar as baixas devolve a parcela ao estado PENDENTE zerando tudo', () => {
      const p = parcela();
      p.registrarBaixa(
        baixa({
          valorPrincipal: Dinheiro.deReais(600),
          valorJuros: Dinheiro.deReais(10),
          valorMulta: Dinheiro.deReais(20),
          valorDesconto: Dinheiro.deReais(50),
        }),
      );
      p.estornarBaixas();

      assert.equal(p.status, 'PENDENTE');
      assert.equal(p.valorPago.centavos, 0);
      assert.equal(p.jurosRecebidos.centavos, 0);
      assert.equal(p.multaRecebida.centavos, 0);
      assert.equal(p.descontoConcedido.centavos, 0);
      assert.equal(p.pagoEm, null);
      assert.equal(p.formaPagamento, null);
      assert.equal(p.saldoPrincipal().centavos, 100_000);
      assert.equal(p.totalRecebido.centavos, 0);
    });

    test('parcela ja quitada tambem pode ser estornada e volta a ser cobravel', () => {
      const p = parcela();
      p.registrarBaixa(baixa());
      assert.equal(p.status, 'PAGA');
      p.estornarBaixas();
      assert.equal(p.status, 'PENDENTE');
      assert.ok(p.estaEmAberto());
    });

    test('parcela cancelada ou renegociada nao pode ser estornada', () => {
      const cancelada = parcela();
      cancelada.cancelar();
      assert.throws(() => cancelada.estornarBaixas(), ErroDeRegraDeNegocio);

      const renegociada = parcela();
      renegociada.marcarComoRenegociada();
      assert.throws(() => renegociada.estornarBaixas(), ErroDeRegraDeNegocio);
    });
  });

  describe('cancelamento, renegociacao, reajuste e prorrogacao', () => {
    test('parcela paga nao pode ser cancelada', () => {
      const p = parcela();
      p.registrarBaixa(baixa());
      assert.throws(() => p.cancelar(), ErroDeRegraDeNegocio);
    });

    test('somente parcela em aberto pode ser renegociada', () => {
      const paga = parcela();
      paga.registrarBaixa(baixa());
      assert.throws(() => paga.marcarComoRenegociada(), ErroDeRegraDeNegocio);

      const parcialmentePaga = parcela();
      parcialmentePaga.registrarBaixa(baixa({ valorPrincipal: Dinheiro.deReais(100) }));
      parcialmentePaga.marcarComoRenegociada();
      assert.equal(parcialmentePaga.status, 'RENEGOCIADA');
    });

    test('reajuste so se aplica a parcela ainda intocada', () => {
      const pendente = parcela();
      pendente.aplicarReajuste(0.055);
      assert.equal(pendente.valorOriginal.centavos, 105_500);

      const parcialmentePaga = parcela();
      parcialmentePaga.registrarBaixa(baixa({ valorPrincipal: Dinheiro.deReais(100) }));
      assert.throws(() => parcialmentePaga.aplicarReajuste(0.055), ErroDeRegraDeNegocio);
    });

    test('prorrogar vencimento so vale para parcela em aberto', () => {
      const p = parcela();
      p.alterarVencimento(DataCivil.deIso('2026-04-10'));
      assert.equal(p.vencimento.paraIso(), '2026-04-10');
      assert.equal(p.situacaoEm(DataCivil.deIso('2026-03-11')), 'A_VENCER');

      p.registrarBaixa(baixa());
      assert.throws(() => p.alterarVencimento(DataCivil.deIso('2026-05-10')), ErroDeRegraDeNegocio);
    });
  });
});
