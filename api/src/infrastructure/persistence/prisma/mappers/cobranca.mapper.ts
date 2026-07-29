import type {
  Cobranca as CobrancaPrisma,
  DocumentoDeCobranca as DocumentoPrisma,
  EventoDeRegua as EventoDeReguaPrisma,
  ModeloDeMensagem as ModeloPrisma,
} from '@prisma/client';
import { Cobranca } from '../../../../domain/cobranca/cobranca.js';
import { DocumentoDeCobranca } from '../../../../domain/cobranca/documento-de-cobranca.js';
import { EventoDaRegua } from '../../../../domain/cobranca/regua-de-cobranca.js';
import type { ModeloDeMensagem } from '../../../../domain/cobranca/redator-de-mensagens.js';
import {
  garantirCanal,
  garantirGatilho,
  garantirStatusCobranca,
  garantirStatusDocumento,
  garantirTipoDocumento,
} from '../../../../domain/cobranca/tipos.js';
import {
  deDataCivil,
  deDinheiro,
  deIdentificador,
  paraDataCivil,
  paraDinheiro,
  paraIdentificador,
} from './conversores.js';

export const mapeadorDeCobranca = {
  paraDominio(linha: CobrancaPrisma): Cobranca {
    return Cobranca.restaurar({
      id: paraIdentificador(linha.id),
      contratoId: paraIdentificador(linha.contratoId),
      parcelaId: paraIdentificador(linha.parcelaId),
      clienteId: paraIdentificador(linha.clienteId),
      chaveDeIdempotencia: linha.chaveDeIdempotencia,
      gatilho: garantirGatilho(linha.gatilho),
      dias: linha.dias,
      canal: garantirCanal(linha.canal),
      destino: linha.destino,
      assunto: linha.assunto,
      mensagem: linha.mensagem,
      valorCobrado: paraDinheiro(linha.valorCobradoCentavos),
      dataDeReferencia: paraDataCivil(linha.dataDeReferencia),
      status: garantirStatusCobranca(linha.status),
      tentativas: linha.tentativas,
      ultimoErro: linha.ultimoErro,
      identificadorNoProvedor: linha.identificadorNoProvedor,
      criadaEm: linha.criadaEm,
      enviadaEm: linha.enviadaEm,
    });
  },

  paraPersistencia(cobranca: Cobranca) {
    const estado = cobranca.paraEstado();
    return {
      id: deIdentificador(estado.id),
      contratoId: deIdentificador(estado.contratoId),
      parcelaId: deIdentificador(estado.parcelaId),
      clienteId: deIdentificador(estado.clienteId),
      chaveDeIdempotencia: estado.chaveDeIdempotencia,
      gatilho: estado.gatilho,
      dias: estado.dias,
      canal: estado.canal,
      destino: estado.destino,
      assunto: estado.assunto,
      mensagem: estado.mensagem,
      valorCobradoCentavos: deDinheiro(estado.valorCobrado),
      dataDeReferencia: deDataCivil(estado.dataDeReferencia),
      status: estado.status,
      tentativas: estado.tentativas,
      ultimoErro: estado.ultimoErro,
      identificadorNoProvedor: estado.identificadorNoProvedor,
      criadaEm: estado.criadaEm,
      enviadaEm: estado.enviadaEm,
    };
  },
};

export const mapeadorDeDocumento = {
  paraDominio(linha: DocumentoPrisma): DocumentoDeCobranca {
    return DocumentoDeCobranca.restaurar({
      id: paraIdentificador(linha.id),
      contratoId: paraIdentificador(linha.contratoId),
      parcelaId: paraIdentificador(linha.parcelaId),
      tipo: garantirTipoDocumento(linha.tipo),
      provedor: linha.provedor,
      identificadorExterno: linha.identificadorExterno,
      nossoNumero: linha.nossoNumero,
      linhaDigitavel: linha.linhaDigitavel,
      codigoDeBarras: linha.codigoDeBarras,
      pixCopiaECola: linha.pixCopiaECola,
      pixQrCodeBase64: linha.pixQrCodeBase64,
      urlDoDocumento: linha.urlDoDocumento,
      valor: paraDinheiro(linha.valorCentavos),
      vencimento: paraDataCivil(linha.vencimento),
      status: garantirStatusDocumento(linha.status),
      emitidoEm: linha.emitidoEm,
      baixadoEm: linha.baixadoEm,
    });
  },

  paraPersistencia(documento: DocumentoDeCobranca) {
    const estado = documento.paraEstado();
    return {
      id: deIdentificador(estado.id),
      contratoId: deIdentificador(estado.contratoId),
      parcelaId: deIdentificador(estado.parcelaId),
      tipo: estado.tipo,
      provedor: estado.provedor,
      identificadorExterno: estado.identificadorExterno,
      nossoNumero: estado.nossoNumero,
      linhaDigitavel: estado.linhaDigitavel,
      codigoDeBarras: estado.codigoDeBarras,
      pixCopiaECola: estado.pixCopiaECola,
      pixQrCodeBase64: estado.pixQrCodeBase64,
      urlDoDocumento: estado.urlDoDocumento,
      valorCentavos: deDinheiro(estado.valor),
      vencimento: deDataCivil(estado.vencimento),
      status: estado.status,
      emitidoEm: estado.emitidoEm,
      baixadoEm: estado.baixadoEm,
    };
  },
};

export const mapeadorDeEventoDaRegua = {
  paraDominio(linha: EventoDeReguaPrisma): EventoDaRegua {
    return EventoDaRegua.de({
      gatilho: garantirGatilho(linha.gatilho),
      dias: linha.dias,
      canais: linha.canais.map(garantirCanal),
      modelo: linha.modelo,
      emitirDocumento: linha.emitirDocumento,
      tipoDeDocumento: garantirTipoDocumento(linha.tipoDeDocumento),
      ativo: linha.ativo,
    });
  },

  paraPersistencia(evento: EventoDaRegua) {
    const estado = evento.paraEstado();
    return {
      gatilho: estado.gatilho,
      dias: estado.dias,
      canais: [...estado.canais],
      modelo: estado.modelo,
      emitirDocumento: estado.emitirDocumento,
      tipoDeDocumento: estado.tipoDeDocumento,
      ativo: estado.ativo,
    };
  },
};

export const mapeadorDeModelo = {
  paraDominio(linha: ModeloPrisma): ModeloDeMensagem {
    return { chave: linha.chave, assunto: linha.assunto, corpo: linha.corpo };
  },
};
