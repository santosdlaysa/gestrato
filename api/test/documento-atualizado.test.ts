import assert from 'node:assert/strict';
import { beforeEach, describe, test } from 'node:test';
import { ServicoDeDocumentoAtualizado } from '../src/application/servicos/servico-de-documento-atualizado.js';
import type { EmitirDocumento, EntradaDeEmissao } from '../src/application/use-cases/cobranca/emitir-documento.js';
import type { RepositorioDeDocumentos } from '../src/application/ports/repositorios.js';
import { DocumentoDeCobranca } from '../src/domain/cobranca/documento-de-cobranca.js';
import { EventoDaRegua } from '../src/domain/cobranca/regua-de-cobranca.js';
import type { TipoDocumento } from '../src/domain/cobranca/tipos.js';
import { Contrato } from '../src/domain/contratos/contrato.js';
import { Parcela } from '../src/domain/contratos/parcela.js';
import { PoliticaDeEncargos } from '../src/domain/contratos/politica-de-encargos.js';
import { TermosDoFinanciamento } from '../src/domain/contratos/termos-do-financiamento.js';
import { Identificador } from '../src/domain/shared/identificador.js';
import { DataCivil } from '../src/domain/value-objects/data-civil.js';
import { Dinheiro } from '../src/domain/value-objects/dinheiro.js';

const CONTRATO_ID = Identificador.de('contrato-1');
const PARCELA_ID = Identificador.de('parcela-1');
const VENCIMENTO = DataCivil.de(2026, 9, 10);

function montarContrato(): Contrato {
  return Contrato.novo({
    id: CONTRATO_ID,
    numero: '2026/0001',
    clienteId: Identificador.de('cliente-1'),
    loteId: Identificador.de('lote-1'),
    termos: TermosDoFinanciamento.de({
      valorTotal: Dinheiro.deCentavos(120_000),
      valorEntrada: Dinheiro.ZERO,
      dataEntrada: null,
      formaPagamentoEntrada: null,
      quantidadeDeParcelas: 12,
      valorDaParcela: null,
      primeiroVencimento: VENCIMENTO,
      periodicidade: 'MENSAL',
    }),
    politicaDeEncargos: PoliticaDeEncargos.PADRAO,
    dataAssinatura: DataCivil.de(2026, 8, 1),
  });
}

function montarParcela(): Parcela {
  return Parcela.nova({
    id: PARCELA_ID,
    contratoId: CONTRATO_ID,
    numero: 1,
    tipo: 'FINANCIAMENTO',
    valorOriginal: Dinheiro.deCentavos(10_000),
    vencimento: VENCIMENTO,
  });
}

function montarDocumento(valor: Dinheiro, tipo: TipoDocumento = 'BOLETO_COM_PIX'): DocumentoDeCobranca {
  return DocumentoDeCobranca.novo({
    id: Identificador.de('documento-1'),
    contratoId: CONTRATO_ID,
    parcelaId: PARCELA_ID,
    tipo,
    provedor: 'fake',
    identificadorExterno: 'fake_1',
    linhaDigitavel: '99990.00001 00000.000000 00000.000000 1 00000000000000',
    pixCopiaECola: '000201...6304ABCD',
    valor,
    vencimento: VENCIMENTO,
  });
}

/** Espiao minimo: registra as chamadas e devolve um documento novo. */
function montarEmissor(comportamento?: { falhar?: boolean }) {
  const chamadas: EntradaDeEmissao[] = [];
  const emissor = {
    async executar(entrada: EntradaDeEmissao) {
      chamadas.push(entrada);
      if (comportamento?.falhar) throw new Error('provedor indisponivel');
      return montarDocumento(Dinheiro.deCentavos(999_99), entrada.tipo);
    },
  };
  return { chamadas, emissor: emissor as unknown as EmitirDocumento };
}

function montarRepositorio(vigente: DocumentoDeCobranca | null): RepositorioDeDocumentos {
  return {
    async vigenteDaParcela() {
      return vigente;
    },
  } as unknown as RepositorioDeDocumentos;
}

describe('Garantia de documento atualizado antes de cobrar', () => {
  let contrato: Contrato;
  let parcela: Parcela;

  beforeEach(() => {
    contrato = montarContrato();
    parcela = montarParcela();
  });

  test('parcela sem documento nenhum recebe uma emissao nova', async () => {
    const { chamadas, emissor } = montarEmissor();
    const servico = new ServicoDeDocumentoAtualizado(montarRepositorio(null), emissor);

    const documento = await servico.garantir({
      parcela,
      contrato,
      tipo: 'BOLETO_COM_PIX',
      dataDeReferencia: VENCIMENTO,
    });

    assert.equal(chamadas.length, 1);
    assert.equal(chamadas[0]?.reemitir, false, 'nao havia documento anterior para reemitir');
    assert.ok(documento);
  });

  test('documento vigente com o mesmo valor e reaproveitado, sem nova emissao', async () => {
    const vigente = montarDocumento(Dinheiro.deCentavos(10_000));
    const { chamadas, emissor } = montarEmissor();
    const servico = new ServicoDeDocumentoAtualizado(montarRepositorio(vigente), emissor);

    const documento = await servico.garantir({
      parcela,
      contrato,
      tipo: 'BOLETO_COM_PIX',
      dataDeReferencia: VENCIMENTO,
      documentoVigente: vigente,
    });

    assert.equal(chamadas.length, 0, 'nao deveria emitir de novo');
    assert.equal(documento, vigente);
  });

  /**
   * O caso que motiva a regra: 15 dias depois do vencimento a parcela vale mais
   * do que o boleto emitido no dia. Reaproveitar cobraria a menos.
   */
  test('parcela vencida reemite porque a mora mudou o valor', async () => {
    const vigente = montarDocumento(Dinheiro.deCentavos(10_000));
    const { chamadas, emissor } = montarEmissor();
    const servico = new ServicoDeDocumentoAtualizado(montarRepositorio(vigente), emissor);

    const quinzeDiasDepois = VENCIMENTO.somarDias(15);
    const valorAtualizado = parcela.demonstrativoEm(contrato.politicaDeEncargos, quinzeDiasDepois).total;
    assert.ok(valorAtualizado.maiorQue(vigente.valor), 'a premissa do teste exige mora acumulada');

    await servico.garantir({
      parcela,
      contrato,
      tipo: 'BOLETO_COM_PIX',
      dataDeReferencia: quinzeDiasDepois,
      documentoVigente: vigente,
    });

    assert.equal(chamadas.length, 1);
    assert.equal(chamadas[0]?.reemitir, true, 'deve cancelar o antigo e emitir outro');
  });

  test('mudar o tipo pedido forca nova emissao', async () => {
    const vigente = montarDocumento(Dinheiro.deCentavos(10_000), 'BOLETO');
    const { chamadas, emissor } = montarEmissor();
    const servico = new ServicoDeDocumentoAtualizado(montarRepositorio(vigente), emissor);

    await servico.garantir({
      parcela,
      contrato,
      tipo: 'PIX',
      dataDeReferencia: VENCIMENTO,
      documentoVigente: vigente,
    });

    assert.equal(chamadas.length, 1);
    assert.equal(chamadas[0]?.tipo, 'PIX');
  });

  /** Provedor fora do ar nao pode impedir o cliente de saber que venceu. */
  test('falha na emissao devolve o documento anterior em vez de lancar', async () => {
    const vigente = montarDocumento(Dinheiro.deCentavos(9_000));
    const { emissor } = montarEmissor({ falhar: true });
    const servico = new ServicoDeDocumentoAtualizado(montarRepositorio(vigente), emissor);

    const documento = await servico.garantir({
      parcela,
      contrato,
      tipo: 'BOLETO_COM_PIX',
      dataDeReferencia: VENCIMENTO,
      documentoVigente: vigente,
    });

    assert.equal(documento, vigente);
  });

  test('falha na emissao sem documento anterior devolve nulo, e a cobranca segue sem boleto', async () => {
    const { emissor } = montarEmissor({ falhar: true });
    const servico = new ServicoDeDocumentoAtualizado(montarRepositorio(null), emissor);

    const documento = await servico.garantir({
      parcela,
      contrato,
      tipo: 'BOLETO_COM_PIX',
      dataDeReferencia: VENCIMENTO,
    });

    assert.equal(documento, null);
  });
});

describe('Configuracao de documento na etapa da regua', () => {
  test('por padrao a etapa emite boleto com Pix', () => {
    const evento = EventoDaRegua.de({
      gatilho: 'APOS_O_VENCIMENTO',
      dias: 5,
      canais: ['WHATSAPP'],
      modelo: 'atraso',
    });

    assert.equal(evento.emitirDocumento, true);
    assert.equal(evento.tipoDeDocumento, 'BOLETO_COM_PIX');
  });

  test('a etapa pode ser configurada para cobrar sem documento', () => {
    const evento = EventoDaRegua.de({
      gatilho: 'ANTES_DO_VENCIMENTO',
      dias: 5,
      canais: ['EMAIL'],
      modelo: 'lembrete',
      emitirDocumento: false,
    });

    assert.equal(evento.emitirDocumento, false);
  });

  test('tipo de documento invalido e recusado na configuracao', () => {
    assert.throws(
      () =>
        EventoDaRegua.de({
          gatilho: 'NO_VENCIMENTO',
          canais: ['WHATSAPP'],
          modelo: 'vencimento',
          tipoDeDocumento: 'CARNE' as TipoDocumento,
        }),
      /Tipo de documento invalido/,
    );
  });

  test('a configuracao sobrevive a ida e volta do estado', () => {
    const evento = EventoDaRegua.de({
      gatilho: 'APOS_O_VENCIMENTO',
      dias: 30,
      canais: ['WHATSAPP', 'EMAIL'],
      modelo: 'atraso_grave',
      emitirDocumento: true,
      tipoDeDocumento: 'PIX',
    });

    const estado = evento.paraEstado();
    assert.equal(estado.emitirDocumento, true);
    assert.equal(estado.tipoDeDocumento, 'PIX');
  });
});
