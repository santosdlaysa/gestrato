import type { Pagamento as PagamentoPrisma, Parcela as ParcelaPrisma } from '@prisma/client';
import { Pagamento } from '../../../../domain/contratos/pagamento.js';
import { Parcela } from '../../../../domain/contratos/parcela.js';
import {
  garantirFormaPagamento,
  garantirStatusParcela,
  garantirTipoParcela,
} from '../../../../domain/contratos/tipos.js';
import {
  deDataCivil,
  deDataCivilOpcional,
  deDinheiro,
  deIdentificador,
  deIdentificadorOpcional,
  paraDataCivil,
  paraDataCivilOpcional,
  paraDinheiro,
  paraIdentificador,
  paraIdentificadorOpcional,
} from './conversores.js';

export const mapeadorDeParcela = {
  paraDominio(linha: ParcelaPrisma): Parcela {
    return Parcela.restaurar({
      id: paraIdentificador(linha.id),
      contratoId: paraIdentificador(linha.contratoId),
      numero: linha.numero,
      tipo: garantirTipoParcela(linha.tipo),
      valorOriginal: paraDinheiro(linha.valorOriginalCentavos),
      vencimento: paraDataCivil(linha.vencimento),
      status: garantirStatusParcela(linha.status),
      valorPago: paraDinheiro(linha.valorPagoCentavos),
      jurosRecebidos: paraDinheiro(linha.jurosRecebidosCentavos),
      multaRecebida: paraDinheiro(linha.multaRecebidaCentavos),
      descontoConcedido: paraDinheiro(linha.descontoConcedidoCentavos),
      pagoEm: paraDataCivilOpcional(linha.pagoEm),
      formaPagamento: linha.formaPagamento ? garantirFormaPagamento(linha.formaPagamento) : null,
      descricao: linha.descricao,
    });
  },

  paraPersistencia(parcela: Parcela) {
    const estado = parcela.paraEstado();
    return {
      id: deIdentificador(estado.id),
      contratoId: deIdentificador(estado.contratoId),
      numero: estado.numero,
      tipo: estado.tipo,
      valorOriginalCentavos: deDinheiro(estado.valorOriginal),
      vencimento: deDataCivil(estado.vencimento),
      status: estado.status,
      valorPagoCentavos: deDinheiro(estado.valorPago),
      jurosRecebidosCentavos: deDinheiro(estado.jurosRecebidos),
      multaRecebidaCentavos: deDinheiro(estado.multaRecebida),
      descontoConcedidoCentavos: deDinheiro(estado.descontoConcedido),
      pagoEm: deDataCivilOpcional(estado.pagoEm),
      formaPagamento: estado.formaPagamento,
      descricao: estado.descricao,
    };
  },
};

export const mapeadorDePagamento = {
  paraDominio(linha: PagamentoPrisma): Pagamento {
    return Pagamento.restaurar({
      id: paraIdentificador(linha.id),
      contratoId: paraIdentificador(linha.contratoId),
      parcelaId: paraIdentificador(linha.parcelaId),
      valorPrincipal: paraDinheiro(linha.valorPrincipalCentavos),
      valorJuros: paraDinheiro(linha.valorJurosCentavos),
      valorMulta: paraDinheiro(linha.valorMultaCentavos),
      valorDesconto: paraDinheiro(linha.valorDescontoCentavos),
      pagoEm: paraDataCivil(linha.pagoEm),
      formaPagamento: garantirFormaPagamento(linha.formaPagamento),
      origem: linha.origem,
      documentoId: paraIdentificadorOpcional(linha.documentoId),
      registradoPor: linha.registradoPor,
      observacoes: linha.observacoes,
      estornado: linha.estornado,
      criadoEm: linha.criadoEm,
    });
  },

  paraPersistencia(pagamento: Pagamento) {
    const estado = pagamento.paraEstado();
    return {
      id: deIdentificador(estado.id),
      contratoId: deIdentificador(estado.contratoId),
      parcelaId: deIdentificador(estado.parcelaId),
      valorPrincipalCentavos: deDinheiro(estado.valorPrincipal),
      valorJurosCentavos: deDinheiro(estado.valorJuros),
      valorMultaCentavos: deDinheiro(estado.valorMulta),
      valorDescontoCentavos: deDinheiro(estado.valorDesconto),
      // Redundante com as colunas acima, mas materializado para o relatorio de
      // caixa somar sem recalcular linha a linha.
      valorTotalCentavos: deDinheiro(pagamento.valorTotal),
      pagoEm: deDataCivil(estado.pagoEm),
      formaPagamento: estado.formaPagamento,
      origem: estado.origem,
      documentoId: deIdentificadorOpcional(estado.documentoId),
      registradoPor: estado.registradoPor,
      observacoes: estado.observacoes,
      estornado: estado.estornado,
      criadoEm: estado.criadoEm,
    };
  },
};
