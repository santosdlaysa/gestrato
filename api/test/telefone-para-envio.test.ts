import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Telefone } from '../src/domain/value-objects/contato.js';
import { ServicoDeEnvioDeCobranca } from '../src/application/servicos/servico-de-envio-de-cobranca.js';

const numeroParaEnvio = ServicoDeEnvioDeCobranca.numeroParaEnvio;

describe('Telefone guardado no cadastro', () => {
  test('guarda apenas DDD e numero, sem codigo do pais', () => {
    assert.equal(Telefone.de('(95) 99137-1313').digitos, '95991371313');
    assert.equal(Telefone.de('95991371313').digitos, '95991371313');
  });

  test('codigo do pais digitado por engano e descartado na entrada', () => {
    assert.equal(Telefone.de('5595991371313').digitos, '95991371313');
    assert.equal(Telefone.de('+55 (95) 99137-1313').digitos, '95991371313');
  });

  /**
   * DDD 55 e o Rio Grande do Sul. Sem cuidado, "55" no inicio seria confundido
   * com o codigo do pais e o DDD desapareceria.
   */
  test('DDD 55 nao e confundido com codigo do pais', () => {
    assert.equal(Telefone.de('55991371313').digitos, '55991371313');
    assert.equal(Telefone.de('5555991371313').digitos, '55991371313');
  });

  test('fixo de 10 digitos e aceito no cadastro', () => {
    assert.equal(Telefone.de('9532241234').digitos, '9532241234');
    assert.equal(Telefone.de('9532241234').ehCelular(), false);
  });

  test('numero curto ou longo demais e recusado', () => {
    assert.throws(() => Telefone.de('991371313'), /10 ou 11 digitos/);
    assert.throws(() => Telefone.de('959913713131'), /10 ou 11 digitos/);
  });
});

describe('Numero entregue ao provedor de mensagens', () => {
  test('sai no padrao internacional 55 + DDD + numero', () => {
    assert.equal(numeroParaEnvio('95991371313'), '5595991371313');
    assert.equal(numeroParaEnvio('(95) 99137-1313'), '5595991371313');
  });

  test('nao duplica o codigo do pais quando o cadastro ja o traz', () => {
    assert.equal(numeroParaEnvio('5595991371313'), '5595991371313');
    assert.equal(numeroParaEnvio('+55 95 99137-1313'), '5595991371313');
  });

  test('DDD 55 continua correto no formato de envio', () => {
    assert.equal(numeroParaEnvio('55991371313'), '5555991371313');
  });

  /** WhatsApp e SMS nao funcionam em fixo; mandar seria credito jogado fora. */
  test('telefone fixo nao vira destino de mensagem', () => {
    assert.equal(numeroParaEnvio('9532241234'), null);
  });

  test('numero invalido ou ausente vira "sem canal", sem derrubar o ciclo', () => {
    assert.equal(numeroParaEnvio(null), null);
    assert.equal(numeroParaEnvio(''), null);
    assert.equal(numeroParaEnvio('123'), null);
    assert.equal(numeroParaEnvio('telefone do vizinho'), null);
  });

  test('o resultado tem sempre 13 digitos para celular', () => {
    for (const bruto of ['11987654321', '95991371313', '21999998888', '85988887777']) {
      const destino = numeroParaEnvio(bruto);
      assert.equal(destino?.length, 13, bruto);
      assert.ok(destino?.startsWith('55'), bruto);
    }
  });
});
