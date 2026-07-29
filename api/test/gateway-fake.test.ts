import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { GatewayDeCobrancaFake } from '../src/infrastructure/gateways/gateway-fake.js';
import { montarCodigoDeBarras, montarLinhaDigitavel } from '../src/infrastructure/gateways/febraban.js';
import { montarPixCopiaECola } from '../src/infrastructure/gateways/pix-br-code.js';
import { DataCivil } from '../src/domain/value-objects/data-civil.js';
import { Dinheiro } from '../src/domain/value-objects/dinheiro.js';

const pagador = {
  nome: 'Maria Aparecida de Souza',
  documento: '12345678909',
  email: 'maria@exemplo.com.br',
  telefone: '14999998888',
  logradouro: 'Rua das Palmeiras',
  numero: '250',
  complemento: null,
  bairro: 'Centro',
  cidade: 'Marilia',
  uf: 'SP',
  cep: '17500000',
};

function pedido(sobrescritas: Partial<Parameters<GatewayDeCobrancaFake['emitir']>[0]> = {}) {
  return {
    tipo: 'BOLETO_COM_PIX' as const,
    referencia: 'Contrato 2026/0001 - parcela 12',
    descricao: 'Parcela 12/120',
    valor: Dinheiro.deCentavos(86_029),
    vencimento: DataCivil.de(2026, 9, 10),
    pagador,
    multaPercentual: 2,
    jurosAoMesPercentual: 1,
    chaveDeIdempotencia: 'parcela-1:BOLETO_COM_PIX:2026-09-10:86029',
    ...sobrescritas,
  };
}

/** Modulo 10 dos tres primeiros campos da linha digitavel. */
function conferirModulo10(campo: string): boolean {
  const corpo = campo.slice(0, -1);
  let peso = 2;
  let soma = 0;
  for (let indice = corpo.length - 1; indice >= 0; indice -= 1) {
    const produto = Number(corpo[indice]) * peso;
    soma += produto > 9 ? Math.floor(produto / 10) + (produto % 10) : produto;
    peso = peso === 2 ? 1 : 2;
  }
  return String((10 - (soma % 10)) % 10) === campo.slice(-1);
}

function conferirCrcDoPix(carga: string): boolean {
  const semCrc = carga.slice(0, -4);
  let resultado = 0xffff;
  for (const caractere of semCrc) {
    resultado ^= caractere.charCodeAt(0) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      resultado = resultado & 0x8000 ? ((resultado << 1) ^ 0x1021) & 0xffff : (resultado << 1) & 0xffff;
    }
  }
  return resultado.toString(16).toUpperCase().padStart(4, '0') === carga.slice(-4);
}

describe('Codigo de barras FEBRABAN', () => {
  test('tem 44 posicoes e embute banco, moeda, valor e vencimento', () => {
    const codigo = montarCodigoDeBarras({
      codigoDoBanco: '999',
      vencimento: DataCivil.de(2026, 9, 10),
      valor: Dinheiro.deCentavos(86_029),
      campoLivre: '1'.repeat(25),
    });

    assert.equal(codigo.length, 44);
    assert.equal(codigo.slice(0, 3), '999');
    assert.equal(codigo.slice(3, 4), '9', 'moeda deve ser real');
    assert.equal(codigo.slice(9, 19), '0000086029', 'valor em centavos com 10 posicoes');
  });

  test('o fator de vencimento conta os dias desde 07/10/1997', () => {
    const codigo = montarCodigoDeBarras({
      codigoDoBanco: '999',
      vencimento: DataCivil.de(1997, 10, 8),
      valor: Dinheiro.deCentavos(100),
      campoLivre: '0'.repeat(25),
    });
    assert.equal(codigo.slice(5, 9), '0001');
  });

  test('valores diferentes produzem digito verificador geral diferente', () => {
    const base = { codigoDoBanco: '999', vencimento: DataCivil.de(2026, 9, 10), campoLivre: '7'.repeat(25) };
    const primeiro = montarCodigoDeBarras({ ...base, valor: Dinheiro.deCentavos(10_000) });
    const segundo = montarCodigoDeBarras({ ...base, valor: Dinheiro.deCentavos(10_001) });
    assert.notEqual(primeiro, segundo);
  });
});

describe('Linha digitavel', () => {
  test('tem 47 posicoes e os tres campos passam no modulo 10', () => {
    const codigo = montarCodigoDeBarras({
      codigoDoBanco: '999',
      vencimento: DataCivil.de(2026, 9, 10),
      valor: Dinheiro.deCentavos(86_029),
      campoLivre: '1234567890123456789012345',
    });
    const linha = montarLinhaDigitavel(codigo);

    assert.equal(linha.length, 47);
    assert.ok(conferirModulo10(linha.slice(0, 10)), 'campo 1 com DV invalido');
    assert.ok(conferirModulo10(linha.slice(10, 21)), 'campo 2 com DV invalido');
    assert.ok(conferirModulo10(linha.slice(21, 32)), 'campo 3 com DV invalido');
    assert.equal(linha.slice(32, 33), codigo.slice(4, 5), 'DV geral preservado');
    assert.equal(linha.slice(33, 47), codigo.slice(5, 19), 'fator e valor preservados');
  });
});

describe('Pix copia e cola', () => {
  test('comeca pelo indicador de payload e termina com CRC16 valido', () => {
    const carga = montarPixCopiaECola({
      chave: 'gestrato@exemplo.invalido',
      nomeDoRecebedor: 'Gestrato Loteamentos',
      cidadeDoRecebedor: 'Sao Paulo',
      valor: Dinheiro.deCentavos(86_029),
      identificador: '00012345678',
    });

    assert.ok(carga.startsWith('000201'), 'payload format indicator ausente');
    assert.ok(carga.includes('BR.GOV.BCB.PIX'), 'GUI do Pix ausente');
    assert.ok(carga.includes('5303986'), 'moeda deve ser 986 (BRL)');
    assert.ok(carga.includes('5406860.29'), 'valor deve sair em reais com 2 casas');
    assert.ok(carga.includes('5802BR'), 'pais deve ser BR');
    assert.ok(conferirCrcDoPix(carga), 'CRC16 invalido');
  });

  test('acentos sao removidos — o padrao aceita apenas ASCII imprimivel', () => {
    const carga = montarPixCopiaECola({
      chave: 'chave@exemplo.invalido',
      nomeDoRecebedor: 'Loteadora Sao Joao Ltda',
      cidadeDoRecebedor: 'Brasilia',
      valor: Dinheiro.deCentavos(1000),
      identificador: 'ABC123',
    });
    assert.ok(/^[\x20-\x7E]+$/.test(carga), 'payload contem caractere fora do ASCII imprimivel');
  });
});

describe('Gateway fake', () => {
  const gateway = new GatewayDeCobrancaFake('Gestrato Loteamentos', 'SAO PAULO', 'http://localhost:5173');

  test('BOLETO_COM_PIX devolve linha digitavel e Pix juntos', async () => {
    const emitido = await gateway.emitir(pedido());

    assert.ok(emitido.linhaDigitavel, 'linha digitavel ausente');
    assert.equal(emitido.linhaDigitavel?.replace(/\D/g, '').length, 47);
    assert.ok(emitido.pixCopiaECola?.startsWith('000201'));
    assert.equal(emitido.codigoDeBarras?.length, 44);
    assert.ok(emitido.identificadorExterno.startsWith('fake_'));
  });

  test('PIX puro nao emite boleto, e BOLETO puro nao emite Pix', async () => {
    const somentePix = await gateway.emitir(pedido({ tipo: 'PIX' }));
    assert.equal(somentePix.linhaDigitavel, null);
    assert.ok(somentePix.pixCopiaECola);

    const somenteBoleto = await gateway.emitir(pedido({ tipo: 'BOLETO' }));
    assert.ok(somenteBoleto.linhaDigitavel);
    assert.equal(somenteBoleto.pixCopiaECola, null);
  });

  /** Retry de emissao nao pode gerar dois documentos para a mesma parcela. */
  test('a mesma chave de idempotencia devolve o mesmo identificador externo', async () => {
    const primeiro = await gateway.emitir(pedido());
    const segundo = await gateway.emitir(pedido());
    assert.equal(primeiro.identificadorExterno, segundo.identificadorExterno);
    assert.equal(primeiro.nossoNumero, segundo.nossoNumero);
  });

  test('chaves diferentes produzem documentos diferentes', async () => {
    const primeiro = await gateway.emitir(pedido());
    const segundo = await gateway.emitir(pedido({ chaveDeIdempotencia: 'parcela-2:BOLETO_COM_PIX:2026-09-10:86029' }));
    assert.notEqual(primeiro.identificadorExterno, segundo.identificadorExterno);
  });

  test('interpreta o webhook de pagamento confirmado', () => {
    const notificacao = gateway.interpretarWebhook(
      {
        identificadorExterno: 'fake_abc123',
        evento: 'PAGAMENTO_CONFIRMADO',
        valorCentavos: 86_029,
        pagoEm: '2026-10-17',
      },
      {},
    );

    assert.equal(notificacao?.tipo, 'PAGAMENTO_CONFIRMADO');
    assert.equal(notificacao?.valorPago?.centavos, 86_029);
    assert.equal(notificacao?.pagoEm?.paraIso(), '2026-10-17');
  });

  test('webhook sem identificador ou com evento desconhecido nao vira baixa', () => {
    assert.equal(gateway.interpretarWebhook({ evento: 'PAGAMENTO_CONFIRMADO' }, {}), null);
    assert.equal(gateway.interpretarWebhook('lixo', {}), null);
    assert.equal(
      gateway.interpretarWebhook({ identificadorExterno: 'fake_x', evento: 'ALGO_NOVO' }, {})?.tipo,
      'DESCONHECIDO',
    );
  });
});
