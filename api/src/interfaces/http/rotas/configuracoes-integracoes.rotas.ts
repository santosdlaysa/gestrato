import { Router } from 'express';
import type { Container } from '../../../composicao/container.js';
import { ambiente } from '../../../infrastructure/config/ambiente.js';
import { assincrono } from '../utilitarios/manipulador-assincrono.js';
import type { RequisicaoAutenticada } from '../tipos.js';

type Situacao = 'CONFIGURADO' | 'NAO_CONFIGURADO' | 'NAO_SUPORTADO';

interface Integracao {
  chave: string;
  nome: string;
  situacao: Situacao;
  detalhe: string;
}

/**
 * Estado seguro das integrações. Segredos nunca são devolvidos: a tela precisa
 * saber se há um adaptador e configuração suficientes, não conhecer credenciais.
 */
export function criarRotasDeConfiguracoesEIntegracoes(container: Container): Router {
  const rotas = Router();

  rotas.get('/configuracoes/status', assincrono<RequisicaoAutenticada>(async (_req, res) => {
    const canais = container.mensageria.canaisSuportados();
    const gatewayFake = container.gateway.nome === 'fake';
    const mensageriaConsole = container.mensageria.nome === 'console';

    const integracoes: Integracao[] = [
      {
        chave: 'asaas', nome: 'Asaas',
        situacao: gatewayFake ? 'NAO_CONFIGURADO' : 'CONFIGURADO',
        detalhe: gatewayFake ? 'O gateway atual é o adaptador de desenvolvimento.' : `Gateway ativo: ${container.gateway.nome}.`,
      },
      ...['inter', 'sicredi', 'cora', 'sicoob'].map((chave) => ({
        chave, nome: chave === 'inter' ? 'Banco Inter' : (chave[0]?.toUpperCase() ?? '') + chave.slice(1),
        situacao: 'NAO_SUPORTADO' as Situacao,
        detalhe: 'Não há adaptador bancário implementado no backend.',
      })),
      {
        chave: 'whatsapp', nome: 'WhatsApp',
        situacao: canais.includes('WHATSAPP') && !mensageriaConsole ? 'CONFIGURADO' : mensageriaConsole ? 'NAO_CONFIGURADO' : 'NAO_SUPORTADO',
        detalhe: mensageriaConsole ? 'Mensageria em modo console; não envia mensagens reais.' : canais.includes('WHATSAPP') ? `Adaptador ativo: ${container.mensageria.nome}.` : 'O canal não está configurado.',
      },
      {
        chave: 'twilio', nome: 'Twilio',
        situacao: container.mensageria.nome === 'twilio' ? 'CONFIGURADO' : 'NAO_CONFIGURADO',
        detalhe: container.mensageria.nome === 'twilio' ? `Canais ativos: ${canais.join(', ') || 'nenhum'}.` : 'TWILIO não é o provedor de mensageria ativo.',
      },
      ...['zenvia', 'resend', 'viacep', 'receita-federal', 'serasa'].map((chave) => ({
        chave, nome: chave === 'viacep' ? 'ViaCEP' : chave === 'resend' ? 'Resend' : chave === 'serasa' ? 'Serasa' : chave === 'zenvia' ? 'Zenvia' : 'Receita Federal',
        situacao: 'NAO_SUPORTADO' as Situacao,
        detalhe: 'Não há integração implementada no backend.',
      })),
      { chave: 'apis-proprias', nome: 'APIs próprias', situacao: 'NAO_CONFIGURADO', detalhe: 'A API própria existe, mas ainda não há gestão de chaves neste módulo.' },
    ];

    res.json({
      empresa: {
        nome: ambiente.nomeDaEmpresa,
        fusoHorario: ambiente.fusoHorario,
        ambiente: ambiente.ambienteDeExecucao,
        urlPublica: ambiente.urlPublica,
        armazenamento: ambiente.armazenamentoDeArquivos,
      },
      mensageria: { provedor: container.mensageria.nome, canais },
      gateway: { provedor: container.gateway.nome },
      integracoes,
      bloqueios: [
        'Credenciais e parâmetros são carregados por variáveis de ambiente; não há edição persistida pela interface.',
        'Integrações marcadas como não suportadas precisam de um adaptador backend antes de receberem formulário ou ação.',
      ],
    });
  }));

  return rotas;
}
