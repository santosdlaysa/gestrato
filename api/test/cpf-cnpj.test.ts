import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { CpfCnpj } from '../src/domain/value-objects/cpf-cnpj.js';
import { ErroDeValidacao } from '../src/domain/shared/errors.js';

/** Fixture: documentos reais em termos de digito verificador, usados em todo o arquivo. */
const CPFS_VALIDOS = ['52998224725', '12345678909', '11144477735', '04512319107'] as const;
const CNPJS_VALIDOS = ['11222333000181', '11144477700061', '34567800012389'] as const;

describe('CpfCnpj', () => {
  describe('CPF', () => {
    test('CPF com digito verificador correto e aceito e classificado como pessoa fisica', () => {
      for (const cpf of CPFS_VALIDOS) {
        const documento = CpfCnpj.de(cpf);
        assert.equal(documento.digitos, cpf);
        assert.equal(documento.tipoPessoa, 'FISICA');
        assert.ok(documento.ehPessoaFisica());
      }
    });

    test('mascara de digitacao e descartada: o documento e guardado so com digitos', () => {
      assert.equal(CpfCnpj.de('529.982.247-25').digitos, '52998224725');
      assert.equal(CpfCnpj.de('045.123.191-07').digitos, '04512319107');
      assert.equal(CpfCnpj.de(' 111.444.777-35 ').digitos, '11144477735');
    });

    test('CPF com digito verificador errado e recusado', () => {
      assert.throws(() => CpfCnpj.de('52998224726'), ErroDeValidacao);
      assert.throws(() => CpfCnpj.de('52998224715'), ErroDeValidacao);
      assert.throws(() => CpfCnpj.de('12345678900'), ErroDeValidacao);
      assert.throws(() => CpfCnpj.de('111.444.777-30'), ErroDeValidacao);
    });

    test('CPF com todos os digitos iguais e recusado, mesmo fechando a conta dos verificadores', () => {
      for (const digito of '0123456789') {
        assert.throws(() => CpfCnpj.de(digito.repeat(11)), ErroDeValidacao, `${digito.repeat(11)} deveria ser recusado`);
      }
    });

    test('CPF formatado sai com pontos e hifen', () => {
      assert.equal(CpfCnpj.de('52998224725').formatar(), '529.982.247-25');
      assert.equal(CpfCnpj.de('04512319107').formatar(), '045.123.191-07');
      assert.equal(CpfCnpj.de('111.444.777-35').formatar(), '111.444.777-35');
    });
  });

  describe('CNPJ', () => {
    test('CNPJ com digito verificador correto e aceito e classificado como pessoa juridica', () => {
      for (const cnpj of CNPJS_VALIDOS) {
        const documento = CpfCnpj.de(cnpj);
        assert.equal(documento.digitos, cnpj);
        assert.equal(documento.tipoPessoa, 'JURIDICA');
        assert.equal(documento.ehPessoaFisica(), false);
      }
    });

    test('CNPJ com mascara e aceito e normalizado', () => {
      assert.equal(CpfCnpj.de('11.222.333/0001-81').digitos, '11222333000181');
      assert.equal(CpfCnpj.de('34.567.800/0123-89').digitos, '34567800012389');
    });

    test('CNPJ com digito verificador errado e recusado', () => {
      assert.throws(() => CpfCnpj.de('11222333000182'), ErroDeValidacao);
      assert.throws(() => CpfCnpj.de('11222333000191'), ErroDeValidacao);
      assert.throws(() => CpfCnpj.de('11.222.333/0001-80'), ErroDeValidacao);
    });

    test('CNPJ com todos os digitos iguais e recusado', () => {
      for (const digito of '0123456789') {
        assert.throws(() => CpfCnpj.de(digito.repeat(14)), ErroDeValidacao, `${digito.repeat(14)} deveria ser recusado`);
      }
    });

    test('CNPJ formatado sai com pontos, barra e hifen', () => {
      assert.equal(CpfCnpj.de('11222333000181').formatar(), '11.222.333/0001-81');
      assert.equal(CpfCnpj.de('34567800012389').formatar(), '34.567.800/0123-89');
    });
  });

  describe('tamanho e identidade', () => {
    test('documento que nao tem 11 nem 14 digitos e recusado', () => {
      assert.throws(() => CpfCnpj.de('123'), ErroDeValidacao);
      assert.throws(() => CpfCnpj.de('5299822472'), ErroDeValidacao);
      assert.throws(() => CpfCnpj.de('529982247251'), ErroDeValidacao);
      assert.throws(() => CpfCnpj.de('112223330001812'), ErroDeValidacao);
      assert.throws(() => CpfCnpj.de(''), ErroDeValidacao);
      assert.throws(() => CpfCnpj.de('apenas letras'), ErroDeValidacao);
    });

    test('dois documentos com os mesmos digitos sao o mesmo documento, com ou sem mascara', () => {
      assert.ok(CpfCnpj.de('529.982.247-25').igualA(CpfCnpj.de('52998224725')));
      assert.equal(CpfCnpj.de('52998224725').igualA(CpfCnpj.de('12345678909')), false);
    });

    test('serializacao JSON guarda apenas os digitos', () => {
      assert.equal(CpfCnpj.de('529.982.247-25').toJSON(), '52998224725');
      assert.equal(JSON.stringify({ documento: CpfCnpj.de('11.222.333/0001-81') }), '{"documento":"11222333000181"}');
    });
  });
});
