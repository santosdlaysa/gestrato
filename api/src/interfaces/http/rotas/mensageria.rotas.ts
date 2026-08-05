import express, { Router } from 'express';
import { z } from 'zod';
import type { StatusCobranca } from '@prisma/client';
import { prisma } from '../../../infrastructure/persistence/prisma/cliente-prisma.js';
import { assincrono } from '../utilitarios/manipulador-assincrono.js';

/**
 * Confirmação de entrega das mensagens (Twilio) e linha do tempo da cobrança.
 *
 * O Twilio chama o webhook público a cada mudança de status da mensagem
 * (enviada → entregue → lida, ou não entregue). Cada chamada vira uma transição
 * gravada, e o status da cobrança avança — nunca retrocede. A tela de detalhe lê
 * essas transições somadas aos marcos internos (criada, enviada) para responder
 * "a mensagem chegou ao cliente?".
 */

const idParam = z.string().uuid();

// ---------------------------------------------------- mapeamento Twilio → domínio

/** Traduz o `MessageStatus` do Twilio para o status de cobrança do sistema. */
function statusDoTwilio(bruto: string): StatusCobranca | null {
  switch (bruto.toLowerCase()) {
    case 'queued':
    case 'sending':
    case 'sent':
    case 'accepted':
      return 'ENVIADA';
    case 'delivered':
      return 'ENTREGUE';
    case 'read':
      return 'LIDA';
    case 'undelivered':
    case 'failed':
      return 'NAO_ENTREGUE';
    default:
      return null;
  }
}

const PRECEDENCIA: Record<StatusCobranca, number> = {
  PENDENTE: 0,
  ENVIADA: 1,
  ENTREGUE: 2,
  LIDA: 3,
  NAO_ENTREGUE: 2,
  FALHA: 2,
  CANCELADA: 4,
};

/**
 * Decide o novo status da cobrança sem retroceder: um "entregue" não volta para
 * "enviada", e um "não entregue" não sobrescreve um "lida" já confirmado.
 */
function proximoStatus(atual: StatusCobranca, novo: StatusCobranca): StatusCobranca {
  if (novo === 'NAO_ENTREGUE') {
    return PRECEDENCIA[atual] >= PRECEDENCIA.ENTREGUE ? atual : 'NAO_ENTREGUE';
  }
  return PRECEDENCIA[novo] > PRECEDENCIA[atual] ? novo : atual;
}

// ------------------------------------------------------------------- webhook público

export function criarRotasDeWebhookDeMensageria(): Router {
  const rotas = Router();
  // O Twilio envia o StatusCallback como application/x-www-form-urlencoded.
  rotas.use(express.urlencoded({ extended: false }));

  rotas.post('/webhooks/mensageria/twilio', assincrono(async (req, res) => {
    const corpo = req.body as Record<string, string | undefined>;
    const sid = corpo.MessageSid ?? corpo.SmsSid;
    const statusBruto = corpo.MessageStatus ?? corpo.SmsStatus;

    // Responder 200 sempre (mesmo sem casar cobrança) evita o Twilio reenviar em
    // laço; o que não casa fica só sem efeito.
    if (!sid || !statusBruto) {
      res.status(200).json({ recebido: true });
      return;
    }

    const cobranca = await prisma.cobranca.findFirst({ where: { identificadorNoProvedor: sid } });
    if (!cobranca) {
      res.status(200).json({ recebido: true, casou: false });
      return;
    }

    const mapeado = statusDoTwilio(statusBruto);
    const detalhe = corpo.ErrorMessage || (corpo.ErrorCode ? `Twilio ${corpo.ErrorCode}` : null);

    await prisma.transicaoDeCobranca.create({
      data: {
        cobrancaId: cobranca.id,
        status: mapeado ?? cobranca.status,
        statusProvedor: statusBruto,
        detalhe,
        origem: 'PROVEDOR',
      },
    });

    if (mapeado) {
      const novo = proximoStatus(cobranca.status, mapeado);
      if (novo !== cobranca.status || detalhe) {
        await prisma.cobranca.update({
          where: { id: cobranca.id },
          data: { status: novo, ...(detalhe ? { ultimoErro: detalhe } : {}) },
        });
      }
    }

    res.status(200).json({ recebido: true, casou: true });
  }));

  return rotas;
}

// ------------------------------------------------------- linha do tempo (protegido)

interface EventoDaLinha {
  status: StatusCobranca;
  statusProvedor: string | null;
  detalhe: string | null;
  origem: 'SISTEMA' | 'PROVEDOR';
  ocorridoEm: string;
}

export function criarRotasDeTransicoesDeCobranca(): Router {
  const rotas = Router();

  rotas.get('/cobrancas/:id/transicoes', assincrono(async (req, res) => {
    const id = idParam.parse(req.params.id);
    const cobranca = await prisma.cobranca.findUnique({
      where: { id },
      include: { transicoes: { orderBy: { ocorridoEm: 'asc' } } },
    });
    if (!cobranca) {
      res.status(404).json({ erro: { tipo: 'ErroNaoEncontrado', mensagem: 'Cobrança não encontrada.' } });
      return;
    }

    // Marcos internos, reconstruídos dos campos da própria cobrança, somados às
    // transições vindas do provedor — uma linha do tempo única e ordenada.
    const eventos: EventoDaLinha[] = [
      { status: 'PENDENTE', statusProvedor: null, detalhe: 'Cobrança criada', origem: 'SISTEMA', ocorridoEm: cobranca.criadaEm.toISOString() },
    ];
    if (cobranca.enviadaEm) {
      eventos.push({
        status: 'ENVIADA',
        statusProvedor: null,
        detalhe: cobranca.identificadorNoProvedor
          ? `Entregue ao provedor (id ${cobranca.identificadorNoProvedor})`
          : 'Entregue ao provedor de mensagens',
        origem: 'SISTEMA',
        ocorridoEm: cobranca.enviadaEm.toISOString(),
      });
    }
    if (cobranca.status === 'FALHA' && cobranca.ultimoErro) {
      eventos.push({
        status: 'FALHA',
        statusProvedor: null,
        detalhe: cobranca.ultimoErro,
        origem: 'SISTEMA',
        ocorridoEm: (cobranca.enviadaEm ?? cobranca.criadaEm).toISOString(),
      });
    }
    for (const transicao of cobranca.transicoes) {
      eventos.push({
        status: transicao.status,
        statusProvedor: transicao.statusProvedor,
        detalhe: transicao.detalhe,
        origem: transicao.origem,
        ocorridoEm: transicao.ocorridoEm.toISOString(),
      });
    }
    eventos.sort((a, b) => a.ocorridoEm.localeCompare(b.ocorridoEm));

    res.json({
      cobranca: {
        id: cobranca.id,
        canal: cobranca.canal,
        destino: cobranca.destino,
        status: cobranca.status,
        assunto: cobranca.assunto,
        mensagem: cobranca.mensagem,
        valorCobradoCentavos: cobranca.valorCobradoCentavos,
        identificadorNoProvedor: cobranca.identificadorNoProvedor,
        tentativas: cobranca.tentativas,
        ultimoErro: cobranca.ultimoErro,
        criadaEm: cobranca.criadaEm.toISOString(),
        enviadaEm: cobranca.enviadaEm?.toISOString() ?? null,
      },
      transicoes: eventos,
    });
  }));

  return rotas;
}
