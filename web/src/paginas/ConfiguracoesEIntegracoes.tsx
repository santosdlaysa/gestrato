import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CabecalhoDaPagina } from '@/componentes/layout/CabecalhoDaPagina';
import { Painel } from '@/componentes/comuns/Painel';
import { Selo } from '@/componentes/comuns/Selo';
import { EstadoVazio } from '@/componentes/comuns/Estados';
import { buscarStatusDeConfiguracoesEIntegracoes } from '@/lib/api/configuracoes-integracoes';
import { mensagemDeErro, foiCancelada } from '@/lib/http';
import type { IntegracaoDoStatus, StatusDeConfiguracoesEIntegracoes } from '@/tipos/configuracoes-integracoes';

const ROTULOS: Record<string, string> = {
  empresa: 'Empresa', logo: 'Logo', smtp: 'SMTP', whatsapp: 'WhatsApp', pix: 'Pix',
  bancos: 'Bancos', apis: 'APIs', logs: 'Logs', integracoes: 'Integrações',
};

function chaveDaRota(caminho: string): string | null {
  const partes = caminho.split('/').filter(Boolean);
  return partes[0] === 'integracoes' ? partes[1] ?? null : null;
}

function textoDaSituacao(situacao: IntegracaoDoStatus['situacao']): string {
  return situacao === 'CONFIGURADO' ? 'Configurado' : situacao === 'NAO_CONFIGURADO' ? 'Não configurado' : 'Sem backend';
}

function tomDaSituacao(situacao: IntegracaoDoStatus['situacao']): 'ok' | 'atencao' | 'neutro' {
  return situacao === 'CONFIGURADO' ? 'ok' : situacao === 'NAO_CONFIGURADO' ? 'atencao' : 'neutro';
}

export function ConfiguracoesEIntegracoes() {
  const local = useLocation();
  const [status, definirStatus] = useState<StatusDeConfiguracoesEIntegracoes | null>(null);
  const [erro, definirErro] = useState<string | null>(null);

  useEffect(() => {
    const controlador = new AbortController();
    buscarStatusDeConfiguracoesEIntegracoes(controlador.signal)
      .then(definirStatus)
      .catch((falha) => { if (!foiCancelada(falha)) definirErro(mensagemDeErro(falha)); });
    return () => controlador.abort();
  }, []);

  const chave = chaveDaRota(local.pathname);
  const integracao = useMemo(() => status?.integracoes.find((item) => item.chave === chave), [chave, status]);
  const partesDaRota = local.pathname.split('/').filter(Boolean);
  const segmento = partesDaRota[partesDaRota.length - 1] ?? 'configuracoes';
  const titulo = integracao?.nome ?? ROTULOS[segmento] ?? 'Configurações';

  return (
    <>
      <CabecalhoDaPagina titulo={titulo} descricao="Estado real do backend e parâmetros carregados no ambiente" />
      <div className="corpo-da-pagina pilha">
        {erro && <div className="aviso aviso--erro" role="alert">{erro}</div>}
        {!status && !erro && <div className="aviso aviso--info" role="status">Consultando configuração do servidor…</div>}
        {status && integracao && (
          <Painel titulo={integracao.nome} descricao="Esta integração não possui dados de exemplo.">
            <div className="linha linha--entre"><Selo texto={textoDaSituacao(integracao.situacao)} tom={tomDaSituacao(integracao.situacao)} /><span className="texto-suave">{integracao.detalhe}</span></div>
          </Painel>
        )}
        {status && !integracao && (
          <>
            <Painel titulo="Ambiente da aplicação" descricao="Valores efetivamente lidos pelo backend">
              <dl className="detalhes">
                <div className="detalhes__item"><dt>Empresa</dt><dd>{status.empresa.nome}</dd></div>
                <div className="detalhes__item"><dt>Fuso horário</dt><dd>{status.empresa.fusoHorario}</dd></div>
                <div className="detalhes__item"><dt>Ambiente</dt><dd>{status.empresa.ambiente}</dd></div>
                <div className="detalhes__item"><dt>Armazenamento</dt><dd>{status.empresa.armazenamento}</dd></div>
                <div className="detalhes__item"><dt>Mensageria</dt><dd>{status.mensageria.provedor}</dd></div>
                <div className="detalhes__item"><dt>Gateway de cobrança</dt><dd>{status.gateway.provedor}</dd></div>
              </dl>
            </Painel>
            <Painel titulo="Limitações conhecidas" descricao="Pendências que impedem edição ou conexão por esta tela"><ul>{status.bloqueios.map((bloqueio) => <li key={bloqueio}>{bloqueio}</li>)}</ul></Painel>
          </>
        )}
        {status && !integracao && segmento !== 'integracoes' && (
          <Painel titulo="Edição indisponível" descricao="Não há endpoint de gravação para esta configuração.">
            <EstadoVazio titulo="Configuração somente informativa" descricao="O backend ainda lê este parâmetro exclusivamente pelas variáveis de ambiente. Nenhum formulário foi criado para evitar salvar dados sem suporte." />
          </Painel>
        )}
      </div>
    </>
  );
}
