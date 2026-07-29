import type { Renegociacao as RenegociacaoPrisma } from '@prisma/client';
import { Renegociacao, type StatusRenegociacao } from '../../../../domain/contratos/renegociacao.js';
import { TermosDoFinanciamento } from '../../../../domain/contratos/termos-do-financiamento.js';
import { garantirPeriodicidade } from '../../../../domain/contratos/tipos.js';
import { ErroDeValidacao } from '../../../../domain/shared/errors.js';
import {
  deDataCivil,
  deDataCivilOpcional,
  deDinheiro,
  deIdentificador,
  paraDataCivil,
  paraDataCivilOpcional,
  paraDinheiro,
  paraIdentificador,
} from './conversores.js';

const STATUS_VALIDOS: readonly string[] = ['VIGENTE', 'CUMPRIDA', 'ROMPIDA', 'CANCELADA'];

function garantirStatus(valor: string): StatusRenegociacao {
  if (!STATUS_VALIDOS.includes(valor)) {
    throw new ErroDeValidacao(`Status de renegociacao invalido: "${valor}".`);
  }
  return valor as StatusRenegociacao;
}

export const mapeadorDeRenegociacao = {
  /** As parcelas substituidas vem da relacao, por isso entram como parametro. */
  paraDominio(linha: RenegociacaoPrisma, parcelasSubstituidasIds: readonly string[]): Renegociacao {
    return Renegociacao.restaurar({
      id: paraIdentificador(linha.id),
      contratoId: paraIdentificador(linha.contratoId),
      parcelasSubstituidasIds: parcelasSubstituidasIds.map(paraIdentificador),
      apuracao: {
        saldoOriginal: paraDinheiro(linha.saldoOriginalCentavos),
        encargos: paraDinheiro(linha.encargosCentavos),
        desconto: paraDinheiro(linha.descontoCentavos),
        valorNegociado: paraDinheiro(linha.valorNegociadoCentavos),
      },
      termos: TermosDoFinanciamento.restaurar({
        valorTotal: paraDinheiro(linha.valorNegociadoCentavos),
        valorEntrada: paraDinheiro(linha.entradaCentavos),
        dataEntrada: paraDataCivilOpcional(linha.dataEntrada),
        formaPagamentoEntrada: null,
        quantidadeDeParcelas: linha.quantidadeDeParcelas,
        valorDaParcela: null,
        primeiroVencimento: paraDataCivil(linha.primeiroVencimento),
        periodicidade: garantirPeriodicidade(linha.periodicidade),
      }),
      status: garantirStatus(linha.status),
      motivo: linha.motivo,
      acordadoEm: paraDataCivil(linha.acordadoEm),
      registradoPor: linha.registradoPor,
    });
  },

  paraPersistencia(renegociacao: Renegociacao) {
    const estado = renegociacao.paraEstado();
    const { apuracao, termos } = estado;
    return {
      id: deIdentificador(estado.id),
      contratoId: deIdentificador(estado.contratoId),
      saldoOriginalCentavos: deDinheiro(apuracao.saldoOriginal),
      encargosCentavos: deDinheiro(apuracao.encargos),
      descontoCentavos: deDinheiro(apuracao.desconto),
      valorNegociadoCentavos: deDinheiro(apuracao.valorNegociado),
      entradaCentavos: deDinheiro(termos.valorEntrada),
      dataEntrada: deDataCivilOpcional(termos.dataEntrada),
      quantidadeDeParcelas: termos.quantidadeDeParcelas,
      primeiroVencimento: deDataCivil(termos.primeiroVencimento ?? estado.acordadoEm),
      periodicidade: termos.periodicidade,
      status: estado.status,
      motivo: estado.motivo,
      acordadoEm: deDataCivil(estado.acordadoEm),
      registradoPor: estado.registradoPor,
    };
  },
};
