import type { Contrato as ContratoPrisma } from '@prisma/client';
import { Contrato } from '../../../../domain/contratos/contrato.js';
import { PoliticaDeEncargos } from '../../../../domain/contratos/politica-de-encargos.js';
import { TermosDoFinanciamento } from '../../../../domain/contratos/termos-do-financiamento.js';
import {
  garantirFormaPagamento,
  garantirIndiceReajuste,
  garantirPeriodicidade,
  garantirStatusContrato,
} from '../../../../domain/contratos/tipos.js';
import { Percentual } from '../../../../domain/value-objects/percentual.js';
import {
  deDataCivil,
  deDataCivilOpcional,
  deDinheiro,
  deDinheiroOpcional,
  deIdentificador,
  deIdentificadorOpcional,
  paraDataCivil,
  paraDataCivilOpcional,
  paraDinheiro,
  paraDinheiroOpcional,
  paraIdentificador,
  paraIdentificadorOpcional,
} from './conversores.js';

export const mapeadorDeContrato = {
  paraDominio(linha: ContratoPrisma): Contrato {
    return Contrato.restaurar({
      id: paraIdentificador(linha.id),
      numero: linha.numero,
      clienteId: paraIdentificador(linha.clienteId),
      loteId: paraIdentificador(linha.loteId),
      corretorId: paraIdentificadorOpcional(linha.corretorId),
      termos: TermosDoFinanciamento.restaurar({
        valorTotal: paraDinheiro(linha.valorTotalCentavos),
        valorEntrada: paraDinheiro(linha.valorEntradaCentavos),
        dataEntrada: paraDataCivilOpcional(linha.dataEntrada),
        formaPagamentoEntrada: linha.formaPagamentoEntrada
          ? garantirFormaPagamento(linha.formaPagamentoEntrada)
          : null,
        quantidadeDeParcelas: linha.quantidadeDeParcelas,
        valorDaParcela: paraDinheiroOpcional(linha.valorDaParcelaCentavos),
        primeiroVencimento: paraDataCivilOpcional(linha.primeiroVencimento),
        periodicidade: garantirPeriodicidade(linha.periodicidade),
      }),
      politicaDeEncargos: PoliticaDeEncargos.de({
        multaPorAtraso: Percentual.de(linha.multaPorAtrasoPercentual),
        jurosAoMes: Percentual.de(linha.jurosAoMesPercentual),
        diasDeCarencia: linha.diasDeCarencia,
      }),
      indiceReajuste: garantirIndiceReajuste(linha.indiceReajuste),
      status: garantirStatusContrato(linha.status),
      dataAssinatura: paraDataCivil(linha.dataAssinatura),
      observacoes: linha.observacoes,
    });
  },

  paraPersistencia(contrato: Contrato) {
    const estado = contrato.paraEstado();
    const { termos, politicaDeEncargos: politica } = estado;
    return {
      id: deIdentificador(estado.id),
      numero: estado.numero,
      clienteId: deIdentificador(estado.clienteId),
      loteId: deIdentificador(estado.loteId),
      corretorId: deIdentificadorOpcional(estado.corretorId),
      valorTotalCentavos: deDinheiro(termos.valorTotal),
      valorEntradaCentavos: deDinheiro(termos.valorEntrada),
      dataEntrada: deDataCivilOpcional(termos.dataEntrada),
      formaPagamentoEntrada: termos.formaPagamentoEntrada,
      quantidadeDeParcelas: termos.quantidadeDeParcelas,
      valorDaParcelaCentavos: deDinheiroOpcional(termos.valorDaParcela),
      primeiroVencimento: deDataCivilOpcional(termos.primeiroVencimento),
      periodicidade: termos.periodicidade,
      multaPorAtrasoPercentual: politica.multaPorAtraso.valor,
      jurosAoMesPercentual: politica.jurosAoMes.valor,
      diasDeCarencia: politica.diasDeCarencia,
      indiceReajuste: estado.indiceReajuste,
      status: estado.status,
      dataAssinatura: deDataCivil(estado.dataAssinatura),
      observacoes: estado.observacoes,
    };
  },
};
