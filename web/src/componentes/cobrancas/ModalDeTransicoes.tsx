import { Modal } from '@/componentes/comuns/Modal';
import { Selo } from '@/componentes/comuns/Selo';
import { ConteudoDaRequisicao } from '@/componentes/comuns/ConteudoDaRequisicao';
import { useRequisicao } from '@/ganchos/useRequisicao';
import { obterTransicoesDeCobranca } from '@/lib/api/cobrancas';
import { formatarDataHora, formatarDinheiro } from '@/lib/formato';
import { rotuloDoCanal } from '@/lib/rotulos';
import type { StatusCobrancaDetalhado } from '@/tipos/cobranca';

const ROTULO_STATUS: Record<StatusCobrancaDetalhado, string> = {
  PENDENTE: 'Criada',
  ENVIADA: 'Enviada',
  ENTREGUE: 'Entregue',
  LIDA: 'Lida',
  NAO_ENTREGUE: 'Não entregue',
  FALHA: 'Falha',
  CANCELADA: 'Cancelada',
};

type Tom = 'ok' | 'atencao' | 'vencido' | 'neutro' | 'info' | 'critico';

const TOM_STATUS: Record<StatusCobrancaDetalhado, Tom> = {
  PENDENTE: 'neutro',
  ENVIADA: 'info',
  ENTREGUE: 'ok',
  LIDA: 'ok',
  NAO_ENTREGUE: 'vencido',
  FALHA: 'critico',
  CANCELADA: 'neutro',
};

/** Resumo honesto do que o status garante — a dúvida do "chegou de verdade?". */
const EXPLICACAO: Record<StatusCobrancaDetalhado, string> = {
  PENDENTE: 'Registrada, ainda não enviada.',
  ENVIADA: 'Entregue ao provedor (Twilio) — ainda não confirma que chegou ao cliente.',
  ENTREGUE: 'O provedor confirmou a entrega no aparelho do cliente.',
  LIDA: 'O cliente abriu/leu a mensagem.',
  NAO_ENTREGUE: 'O provedor não conseguiu entregar ao cliente.',
  FALHA: 'O envio falhou antes de sair.',
  CANCELADA: 'Envio cancelado.',
};

export function ModalDeTransicoes({ cobrancaId, aoFechar }: { cobrancaId: string; aoFechar: () => void }) {
  const requisicao = useRequisicao((sinal) => obterTransicoesDeCobranca(cobrancaId, sinal), [cobrancaId]);

  return (
    <Modal
      titulo="Detalhe da cobrança"
      descricao="Linha do tempo do envio, com a confirmação do provedor de mensagens."
      aoFechar={aoFechar}
      rodape={<button type="button" className="botao botao--primario" onClick={aoFechar}>Fechar</button>}
    >
      <ConteudoDaRequisicao requisicao={requisicao} vazio={() => false}>
        {(dados) => {
          const c = dados.cobranca;
          return (
            <div className="pilha">
              <div className="aviso aviso--info">
                <strong>{ROTULO_STATUS[c.status]}</strong> — {EXPLICACAO[c.status]}
              </div>

              <dl className="ficha grade grade--2" style={{ margin: 0 }}>
                <div><dt>Canal</dt><dd>{rotuloDoCanal(c.canal)}</dd></div>
                <div><dt>Destino</dt><dd>{c.destino}</dd></div>
                <div><dt>Valor cobrado</dt><dd>{formatarDinheiro(c.valorCobradoCentavos)}</dd></div>
                <div><dt>Tentativas</dt><dd>{c.tentativas}</dd></div>
                <div><dt>Id no provedor (Twilio)</dt><dd>{c.identificadorNoProvedor ?? '—'}</dd></div>
                <div><dt>Enviada em</dt><dd>{c.enviadaEm ? formatarDataHora(c.enviadaEm) : '—'}</dd></div>
              </dl>

              {c.ultimoErro && <div className="aviso aviso--erro">Último erro: {c.ultimoErro}</div>}

              <div>
                <h3 style={{ margin: '4px 0 8px' }}>Linha do tempo</h3>
                <ol className="linha-do-tempo">
                  {dados.transicoes.map((evento, indice) => (
                    <li key={`${evento.ocorridoEm}-${indice}`} className="linha-do-tempo__item">
                      <div className="linha-do-tempo__corpo">
                        <div className="linha-do-tempo__cabecalho">
                          <Selo texto={ROTULO_STATUS[evento.status]} tom={TOM_STATUS[evento.status]} />
                          <span className="linha-do-tempo__quando">{formatarDataHora(evento.ocorridoEm)}</span>
                          <Selo texto={evento.origem === 'PROVEDOR' ? 'Twilio' : 'Sistema'} tom="neutro" />
                        </div>
                        {(evento.detalhe || evento.statusProvedor) && (
                          <p className="linha-do-tempo__detalhe">
                            {evento.detalhe}
                            {evento.statusProvedor ? ` (status Twilio: ${evento.statusProvedor})` : ''}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <details>
                <summary>Ver mensagem enviada</summary>
                <pre className="bloco-de-mensagem">{c.mensagem}</pre>
              </details>
            </div>
          );
        }}
      </ConteudoDaRequisicao>
    </Modal>
  );
}
