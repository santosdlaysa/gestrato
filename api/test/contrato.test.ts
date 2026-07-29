import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { Contrato } from '../src/domain/contratos/contrato.js';
import { Parcela, type Baixa } from '../src/domain/contratos/parcela.js';
import { PoliticaDeEncargos } from '../src/domain/contratos/politica-de-encargos.js';
import { TermosDoFinanciamento } from '../src/domain/contratos/termos-do-financiamento.js';
import { Identificador } from '../src/domain/shared/identificador.js';
import { DataCivil } from '../src/domain/value-objects/data-civil.js';
import { Dinheiro } from '../src/domain/value-objects/dinheiro.js';
import { Percentual } from '../src/domain/value-objects/percentual.js';
import { ErroDeRegraDeNegocio, ErroDeValidacao } from '../src/domain/shared/errors.js';

const CONTRATO_ID = Identificador.de('contrato-1');

/**
 * Fixture: contrato de R$ 30.000,00 em 3 parcelas mensais de R$ 10.000,00,
 * vencendo em 10/01, 10/02 e 10/03 de 2026, com a politica padrao de mora.
 */
function contratoComParcelas(): { contrato: Contrato; parcelas: Parcela[] } {
  const termos = TermosDoFinanciamento.de({
    valorTotal: Dinheiro.deReais(30_000),
    valorEntrada: Dinheiro.ZERO,
    dataEntrada: null,
    formaPagamentoEntrada: null,
    quantidadeDeParcelas: 3,
    valorDaParcela: null,
    primeiroVencimento: DataCivil.deIso('2026-01-10'),
    periodicidade: 'MENSAL',
  });

  const contrato = Contrato.novo({
    id: CONTRATO_ID,
    numero: '2026/0001',
    clienteId: Identificador.de('cliente-1'),
    loteId: Identificador.de('lote-1'),
    termos,
    dataAssinatura: DataCivil.deIso('2025-12-20'),
  });

  const parcelas = contrato.gerarPlanoDeParcelas().map((linha) =>
    Parcela.nova({
      id: Identificador.de(`parcela-${linha.numero}`),
      contratoId: CONTRATO_ID,
      numero: linha.numero,
      tipo: linha.tipo,
      valorOriginal: linha.valor,
      vencimento: linha.vencimento,
      descricao: linha.descricao,
    }),
  );

  return { contrato, parcelas };
}

function baixaTotal(parcela: Parcela, pagoEm: string): Baixa {
  return {
    valorPrincipal: parcela.saldoPrincipal(),
    valorJuros: Dinheiro.ZERO,
    valorMulta: Dinheiro.ZERO,
    valorDesconto: Dinheiro.ZERO,
    pagoEm: DataCivil.deIso(pagoEm),
    formaPagamento: 'PIX',
  };
}

describe('Contrato', () => {
  describe('posicao financeira numa data de referencia', () => {
    test('com uma parcela vencida, a posicao mostra saldo, vencido, a vencer e encargos', () => {
      const { contrato, parcelas } = contratoComParcelas();
      const posicao = contrato.posicaoEm(parcelas, DataCivil.deIso('2026-02-10'));

      assert.equal(posicao.valorTotal.centavos, 3_000_000);
      assert.equal(posicao.totalRecebido.centavos, 0);
      assert.equal(posicao.saldoDevedor.centavos, 3_000_000);
      // Parcela 1 vencida ha 31 dias: R$ 10.000,00 + 2% de multa + 31/30 de 1% de juros.
      assert.equal(posicao.totalVencido.centavos, 1_030_333);
      assert.equal(posicao.encargosAcumulados.centavos, 30_333);
      assert.equal(posicao.totalAVencer.centavos, 2_000_000);
      assert.equal(posicao.parcelasPagas, 0);
      assert.equal(posicao.parcelasEmAberto, 3);
      assert.equal(posicao.parcelasVencidas, 1);
      assert.equal(posicao.proximoVencimento?.paraIso(), '2026-02-10');
      assert.equal(posicao.diasDeAtrasoMaximo, 31);
      assert.equal(posicao.situacao, 'INADIMPLENTE');
    });

    test('o maior atraso e o da parcela mais antiga em aberto', () => {
      const { contrato, parcelas } = contratoComParcelas();
      const posicao = contrato.posicaoEm(parcelas, DataCivil.deIso('2026-03-10'));

      assert.equal(posicao.parcelasVencidas, 2, 'a parcela que vence hoje ainda nao esta vencida');
      assert.equal(posicao.diasDeAtrasoMaximo, 59);
      assert.equal(posicao.proximoVencimento?.paraIso(), '2026-03-10');
    });

    test('sem parcela vencida o contrato esta EM_DIA e sem encargos', () => {
      const { contrato, parcelas } = contratoComParcelas();
      const posicao = contrato.posicaoEm(parcelas, DataCivil.deIso('2026-01-09'));

      assert.equal(posicao.situacao, 'EM_DIA');
      assert.equal(posicao.parcelasVencidas, 0);
      assert.equal(posicao.totalVencido.centavos, 0);
      assert.equal(posicao.encargosAcumulados.centavos, 0);
      assert.equal(posicao.totalAVencer.centavos, 3_000_000);
      assert.equal(posicao.diasDeAtrasoMaximo, 0);
      assert.equal(posicao.proximoVencimento?.paraIso(), '2026-01-10');
    });

    test('a parcela que vence no dia da referencia ainda nao torna o contrato inadimplente', () => {
      const { contrato, parcelas } = contratoComParcelas();
      const posicao = contrato.posicaoEm(parcelas, DataCivil.deIso('2026-01-10'));

      assert.equal(posicao.situacao, 'EM_DIA');
      assert.equal(posicao.parcelasVencidas, 0);
    });

    test('pagar a parcela atrasada devolve o contrato para EM_DIA sem job noturno', () => {
      const { contrato, parcelas } = contratoComParcelas();
      parcelas[0]!.registrarBaixa(baixaTotal(parcelas[0]!, '2026-02-10'));
      const posicao = contrato.posicaoEm(parcelas, DataCivil.deIso('2026-02-10'));

      assert.equal(posicao.situacao, 'EM_DIA');
      assert.equal(posicao.parcelasPagas, 1);
      assert.equal(posicao.parcelasEmAberto, 2);
      assert.equal(posicao.parcelasVencidas, 0);
      assert.equal(posicao.totalRecebido.centavos, 1_000_000);
      assert.equal(posicao.saldoDevedor.centavos, 2_000_000);
      assert.equal(posicao.totalVencido.centavos, 0);
    });

    test('parcela paga em parte continua contando no saldo devedor pelo que falta', () => {
      const { contrato, parcelas } = contratoComParcelas();
      parcelas[0]!.registrarBaixa({
        valorPrincipal: Dinheiro.deReais(4_000),
        valorJuros: Dinheiro.ZERO,
        valorMulta: Dinheiro.ZERO,
        valorDesconto: Dinheiro.ZERO,
        pagoEm: DataCivil.deIso('2026-02-10'),
        formaPagamento: 'PIX',
      });
      const posicao = contrato.posicaoEm(parcelas, DataCivil.deIso('2026-02-10'));

      assert.equal(posicao.saldoDevedor.centavos, 2_600_000);
      assert.equal(posicao.parcelasEmAberto, 3);
      assert.equal(posicao.parcelasPagas, 0);
      assert.equal(posicao.parcelasVencidas, 1);
      assert.equal(posicao.situacao, 'INADIMPLENTE');
      // Saldo de R$ 6.000,00 vencido ha 31 dias: 2% de multa e 31/30 de 1% de juros.
      assert.equal(posicao.totalVencido.centavos, 618_200);
      assert.equal(posicao.encargosAcumulados.centavos, 18_200);
    });

    test('parcelas canceladas e renegociadas ficam fora da posicao financeira', () => {
      const { contrato, parcelas } = contratoComParcelas();
      const canceladas = [
        Parcela.nova({
          id: Identificador.de('parcela-cancelada'),
          contratoId: CONTRATO_ID,
          numero: 4,
          tipo: 'FINANCIAMENTO',
          valorOriginal: Dinheiro.deReais(5_000),
          vencimento: DataCivil.deIso('2025-11-10'),
        }),
        Parcela.nova({
          id: Identificador.de('parcela-renegociada'),
          contratoId: CONTRATO_ID,
          numero: 5,
          tipo: 'FINANCIAMENTO',
          valorOriginal: Dinheiro.deReais(5_000),
          vencimento: DataCivil.deIso('2025-12-10'),
        }),
      ];
      canceladas[0]!.registrarBaixa({
        valorPrincipal: Dinheiro.deReais(500),
        valorJuros: Dinheiro.ZERO,
        valorMulta: Dinheiro.ZERO,
        valorDesconto: Dinheiro.ZERO,
        pagoEm: DataCivil.deIso('2025-11-10'),
        formaPagamento: 'DINHEIRO',
      });
      canceladas[0]!.cancelar();
      canceladas[1]!.marcarComoRenegociada();

      const referencia = DataCivil.deIso('2026-02-10');
      const semAsExcluidas = contrato.posicaoEm(parcelas, referencia);
      const comAsExcluidas = contrato.posicaoEm([...parcelas, ...canceladas], referencia);

      assert.equal(comAsExcluidas.saldoDevedor.centavos, semAsExcluidas.saldoDevedor.centavos);
      assert.equal(comAsExcluidas.totalVencido.centavos, semAsExcluidas.totalVencido.centavos);
      assert.equal(comAsExcluidas.totalRecebido.centavos, 0, 'recebimento de parcela cancelada nao entra');
      assert.equal(comAsExcluidas.parcelasEmAberto, 3);
      assert.equal(comAsExcluidas.parcelasVencidas, 1);
      assert.equal(comAsExcluidas.diasDeAtrasoMaximo, 31, 'a parcela cancelada de 2025 nao puxa o atraso');
    });

    test('a politica de mora do contrato manda no calculo do vencido', () => {
      const { contrato, parcelas } = contratoComParcelas();
      contrato.alterarPoliticaDeEncargos(
        PoliticaDeEncargos.de({
          multaPorAtraso: Percentual.de(10),
          jurosAoMes: Percentual.de(1),
          diasDeCarencia: 40,
        }),
      );
      const posicao = contrato.posicaoEm(parcelas, DataCivil.deIso('2026-02-10'));

      assert.equal(posicao.parcelasVencidas, 1);
      assert.equal(posicao.encargosAcumulados.centavos, 0, 'atraso de 31 dias cabe na carencia de 40');
      assert.equal(posicao.totalVencido.centavos, 1_000_000);
      assert.equal(posicao.situacao, 'INADIMPLENTE');
    });
  });

  describe('quitacao', () => {
    test('quitar e recusado enquanto restar parcela em aberto', () => {
      const { contrato, parcelas } = contratoComParcelas();
      parcelas[0]!.registrarBaixa(baixaTotal(parcelas[0]!, '2026-01-10'));

      assert.throws(() => contrato.quitar(parcelas), ErroDeRegraDeNegocio);
      assert.equal(contrato.status, 'ATIVO');
    });

    test('quitar aceita quando todas as parcelas foram encerradas', () => {
      const { contrato, parcelas } = contratoComParcelas();
      parcelas.forEach((p, indice) => p.registrarBaixa(baixaTotal(p, `2026-0${indice + 1}-10`)));

      contrato.quitar(parcelas);
      assert.equal(contrato.status, 'QUITADO');
      assert.equal(contrato.estaAtivo(), false);
      assert.ok(contrato.estaEncerrado());
    });

    test('a quitacao automatica so acontece quando a ultima parcela em aberto e baixada', () => {
      const { contrato, parcelas } = contratoComParcelas();

      parcelas[0]!.registrarBaixa(baixaTotal(parcelas[0]!, '2026-01-10'));
      assert.equal(contrato.quitarSeTotalmenteRecebido(parcelas), false);
      assert.equal(contrato.status, 'ATIVO');

      parcelas[1]!.registrarBaixa(baixaTotal(parcelas[1]!, '2026-02-10'));
      parcelas[2]!.registrarBaixa(baixaTotal(parcelas[2]!, '2026-03-10'));
      assert.equal(contrato.quitarSeTotalmenteRecebido(parcelas), true);
      assert.equal(contrato.status, 'QUITADO');
    });

    test('contrato sem nenhuma parcela paga nao quita automaticamente', () => {
      const { contrato, parcelas } = contratoComParcelas();
      parcelas.forEach((p) => p.cancelar());
      assert.equal(contrato.quitarSeTotalmenteRecebido(parcelas), false);
      assert.equal(contrato.status, 'ATIVO');
    });

    test('contrato quitado mostra situacao QUITADO mesmo com o calendario andando', () => {
      const { contrato, parcelas } = contratoComParcelas();
      parcelas.forEach((p, indice) => p.registrarBaixa(baixaTotal(p, `2026-0${indice + 1}-10`)));
      contrato.quitar(parcelas);

      const posicao = contrato.posicaoEm(parcelas, DataCivil.deIso('2030-01-01'));
      assert.equal(posicao.situacao, 'QUITADO');
      assert.equal(posicao.saldoDevedor.centavos, 0);
      assert.equal(posicao.totalRecebido.centavos, 3_000_000);
      assert.equal(posicao.parcelasPagas, 3);
    });

    test('quitar um contrato ja quitado nao muda nada e nao levanta erro', () => {
      const { contrato, parcelas } = contratoComParcelas();
      parcelas.forEach((p, indice) => p.registrarBaixa(baixaTotal(p, `2026-0${indice + 1}-10`)));
      contrato.quitar(parcelas);
      contrato.quitar(parcelas);
      assert.equal(contrato.status, 'QUITADO');
    });
  });

  describe('encerramento do contrato', () => {
    test('contrato quitado nao pode ser cancelado', () => {
      const { contrato, parcelas } = contratoComParcelas();
      parcelas.forEach((p, indice) => p.registrarBaixa(baixaTotal(p, `2026-0${indice + 1}-10`)));
      contrato.quitar(parcelas);

      assert.throws(() => contrato.cancelar(), ErroDeRegraDeNegocio);
      assert.equal(contrato.status, 'QUITADO');
    });

    test('contrato quitado nao pode ser distratado', () => {
      const { contrato, parcelas } = contratoComParcelas();
      parcelas.forEach((p, indice) => p.registrarBaixa(baixaTotal(p, `2026-0${indice + 1}-10`)));
      contrato.quitar(parcelas);

      assert.throws(() => contrato.distratar(), ErroDeRegraDeNegocio);
    });

    test('contrato cancelado ou distratado nao movimenta mais cobranca', () => {
      const cancelado = contratoComParcelas();
      cancelado.contrato.cancelar();
      assert.equal(cancelado.contrato.status, 'CANCELADO');
      assert.throws(() => cancelado.contrato.garantirQuePodeReceberCobranca(), ErroDeRegraDeNegocio);
      assert.equal(
        cancelado.contrato.posicaoEm(cancelado.parcelas, DataCivil.deIso('2026-03-10')).situacao,
        'CANCELADO',
      );

      const distratado = contratoComParcelas();
      distratado.contrato.distratar();
      assert.equal(
        distratado.contrato.posicaoEm(distratado.parcelas, DataCivil.deIso('2026-03-10')).situacao,
        'DISTRATADO',
      );
    });

    test('contrato encerrado nao aceita nova politica de encargos ate ser reaberto', () => {
      const { contrato } = contratoComParcelas();
      contrato.cancelar();
      assert.throws(() => contrato.alterarPoliticaDeEncargos(PoliticaDeEncargos.PADRAO), ErroDeRegraDeNegocio);

      contrato.reabrir();
      assert.equal(contrato.status, 'ATIVO');
      contrato.alterarPoliticaDeEncargos(PoliticaDeEncargos.PADRAO);
    });
  });

  describe('identificacao e reajuste', () => {
    test('contrato exige numero preenchido', () => {
      const { contrato } = contratoComParcelas();
      assert.equal(contrato.numero, '2026/0001');
      assert.throws(
        () =>
          Contrato.novo({
            id: Identificador.de('contrato-2'),
            numero: '   ',
            clienteId: Identificador.de('cliente-1'),
            loteId: Identificador.de('lote-1'),
            termos: contrato.termos,
            dataAssinatura: DataCivil.deIso('2025-12-20'),
          }),
        ErroDeValidacao,
      );
    });

    test('contrato sem indice de reajuste nao aceita reajuste', () => {
      const { contrato } = contratoComParcelas();
      assert.equal(contrato.indiceReajuste, 'NENHUM');
      assert.throws(() => contrato.fatorDeReajuste(Percentual.de(5.5)), ErroDeRegraDeNegocio);
    });

    test('contrato com indice de reajuste converte o percentual em fator', () => {
      const { contrato } = contratoComParcelas();
      const comIndice = Contrato.novo({
        id: Identificador.de('contrato-3'),
        numero: '2026/0003',
        clienteId: Identificador.de('cliente-1'),
        loteId: Identificador.de('lote-1'),
        termos: contrato.termos,
        indiceReajuste: 'IGPM',
        dataAssinatura: DataCivil.deIso('2025-12-20'),
      });
      assert.equal(comIndice.fatorDeReajuste(Percentual.de(5.5)), 0.055);
    });

    test('a politica padrao entra quando o contrato nao define a sua', () => {
      const { contrato } = contratoComParcelas();
      assert.equal(contrato.politicaDeEncargos.multaPorAtraso.valor, 2);
      assert.equal(contrato.politicaDeEncargos.jurosAoMes.valor, 1);
    });
  });
});
