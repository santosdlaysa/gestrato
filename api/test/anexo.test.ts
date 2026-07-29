import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, test } from 'node:test';
import { Anexo, formatarTamanho } from '../src/domain/arquivos/anexo.js';
import {
  categoriasDoEscopo,
  garantirCategoriaCompativel,
  TAMANHO_MAXIMO_EM_BYTES,
} from '../src/domain/arquivos/tipos.js';
import { ArmazenamentoLocal } from '../src/infrastructure/armazenamento/armazenamento-local.js';
import { Identificador } from '../src/domain/shared/identificador.js';

const ID = Identificador.de('11111111-1111-1111-1111-111111111111');
const DONO = Identificador.de('22222222-2222-2222-2222-222222222222');

function novoAnexo(sobrescritas: Partial<Parameters<typeof Anexo.novo>[0]> = {}) {
  return Anexo.novo({
    id: ID,
    escopo: 'CONTRATO',
    donoId: DONO,
    categoria: 'CONTRATO_ASSINADO',
    nomeOriginal: 'contrato assinado.pdf',
    tipoMime: 'application/pdf',
    tamanhoBytes: 1024,
    ...sobrescritas,
  });
}

describe('Anexo', () => {
  test('a chave de armazenamento vem do identificador, nunca do nome enviado', () => {
    const anexo = novoAnexo({ nomeOriginal: '../../etc/passwd.pdf' });

    assert.equal(
      anexo.chaveNoArmazenamento,
      `contrato/${DONO.paraString()}/${ID.paraString()}.pdf`,
    );
    assert.ok(!anexo.chaveNoArmazenamento.includes('..'), 'a chave nao pode carregar travessia');
  });

  test('a extensao da chave acompanha o tipo do arquivo, nao o nome', () => {
    const anexo = novoAnexo({
      categoria: 'COMPROVANTE_PAGAMENTO',
      nomeOriginal: 'comprovante.pdf.exe',
      tipoMime: 'image/png',
    });
    assert.ok(anexo.chaveNoArmazenamento.endsWith('.png'));
  });

  test('o nome original e preservado para quem baixa', () => {
    assert.equal(novoAnexo().nomeOriginal, 'contrato assinado.pdf');
  });

  test('barra no nome vira separador inofensivo', () => {
    assert.equal(novoAnexo({ nomeOriginal: 'pasta/arquivo.pdf' }).nomeOriginal, 'pasta_arquivo.pdf');
  });

  test('nome vazio e recusado', () => {
    assert.throws(() => novoAnexo({ nomeOriginal: '   ' }), /Nome do arquivo/);
  });

  test('tipo de arquivo fora da lista e recusado', () => {
    assert.throws(
      () => novoAnexo({ nomeOriginal: 'planilha.xlsx', tipoMime: 'application/vnd.ms-excel' }),
      /Tipo de arquivo nao aceito/,
    );
  });

  test('arquivo acima do limite e recusado, com o tamanho na mensagem', () => {
    assert.throws(
      () => novoAnexo({ tamanhoBytes: TAMANHO_MAXIMO_EM_BYTES + 1 }),
      /excede o limite/,
    );
  });

  test('arquivo no limite exato e aceito', () => {
    assert.equal(novoAnexo({ tamanhoBytes: TAMANHO_MAXIMO_EM_BYTES }).tamanhoBytes, TAMANHO_MAXIMO_EM_BYTES);
  });

  test('arquivo vazio e recusado', () => {
    assert.throws(() => novoAnexo({ tamanhoBytes: 0 }), /vazio ou com tamanho invalido/);
  });

  test('pertenceA distingue dono e escopo', () => {
    const anexo = novoAnexo();
    assert.ok(anexo.pertenceA('CONTRATO', DONO.paraString()));
    assert.ok(!anexo.pertenceA('CLIENTE', DONO.paraString()));
    assert.ok(!anexo.pertenceA('CONTRATO', ID.paraString()));
  });
});

describe('Compatibilidade entre categoria e escopo', () => {
  test('documento de pessoa nao se prende a contrato', () => {
    assert.throws(() => garantirCategoriaCompativel('CONTRATO', 'RG'), /nao se aplica a contrato/);
  });

  test('documento de contrato nao se prende a cliente', () => {
    assert.throws(
      () => garantirCategoriaCompativel('CLIENTE', 'CONTRATO_ASSINADO'),
      /nao se aplica a cliente/,
    );
  });

  test('"outro" serve aos dois escopos', () => {
    assert.doesNotThrow(() => garantirCategoriaCompativel('CLIENTE', 'OUTRO'));
    assert.doesNotThrow(() => garantirCategoriaCompativel('CONTRATO', 'OUTRO'));
  });

  test('cada escopo oferece apenas as suas categorias', () => {
    assert.ok(categoriasDoEscopo('CLIENTE').includes('COMPROVANTE_RESIDENCIA'));
    assert.ok(!categoriasDoEscopo('CLIENTE').includes('DISTRATO'));
    assert.ok(categoriasDoEscopo('CONTRATO').includes('TERMO_DE_QUITACAO'));
    assert.ok(!categoriasDoEscopo('CONTRATO').includes('RG'));
  });
});

describe('Tamanho legivel', () => {
  test('escala de bytes a megabytes', () => {
    assert.equal(formatarTamanho(512), '512 B');
    assert.equal(formatarTamanho(2048), '2.0 KB');
    assert.equal(formatarTamanho(5 * 1024 * 1024), '5.0 MB');
  });
});

describe('Armazenamento local', () => {
  let raiz: string;
  let armazenamento: ArmazenamentoLocal;

  before(async () => {
    raiz = await mkdtemp(join(tmpdir(), 'gestrato-anexos-'));
    armazenamento = new ArmazenamentoLocal(raiz);
  });

  after(async () => {
    await rm(raiz, { recursive: true, force: true });
  });

  test('salva, le e remove preservando o conteudo', async () => {
    const chave = 'contrato/abc/def.pdf';
    const conteudo = Buffer.from('conteudo do contrato assinado');

    await armazenamento.salvar(chave, conteudo, 'application/pdf');
    assert.ok(await armazenamento.existe(chave));
    assert.deepEqual(await armazenamento.ler(chave), conteudo);

    await armazenamento.remover(chave);
    assert.ok(!(await armazenamento.existe(chave)));
  });

  test('remover algo que ja nao existe nao e erro', async () => {
    await assert.doesNotReject(() => armazenamento.remover('contrato/nao/existe.pdf'));
  });

  /** O custo de errar aqui e leitura ou escrita arbitraria no disco do servidor. */
  test('chave que tenta escapar da raiz e recusada', async () => {
    for (const chave of ['../fora.pdf', 'contrato/../../fora.pdf', '../../../etc/passwd']) {
      await assert.rejects(() => armazenamento.ler(chave), /Chave de arquivo invalida/, chave);
      await assert.rejects(
        () => armazenamento.salvar(chave, Buffer.from('x'), 'application/pdf'),
        /Chave de arquivo invalida/,
        chave,
      );
    }
  });

  test('subdiretorios sao criados sozinhos', async () => {
    const chave = 'cliente/um/dois/tres.png';
    await armazenamento.salvar(chave, Buffer.from('imagem'), 'image/png');
    assert.ok(await armazenamento.existe(chave));
  });
});
