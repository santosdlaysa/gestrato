import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CabecalhoDaPagina } from '@/componentes/layout/CabecalhoDaPagina';

/**
 * Mapa do loteamento — diferencial do Gestrato.
 *
 * Cada lote pintado pela situação financeira do contrato. Clicar abre o
 * contrato correspondente. Por enquanto os dados são um mock determinístico;
 * quando a API expuser a planta, basta trocar `QUADRAS` pela consulta real.
 */

type Situacao = 'quitado' | 'em-dia' | 'vencendo' | 'inadimplente' | 'disponivel' | 'reservado';

interface Lote {
  id: string;
  numero: number;
  situacao: Situacao;
}

const LEGENDA: { situacao: Situacao; texto: string; cor: string }[] = [
  { situacao: 'quitado', texto: 'Quitado', cor: '#14683c' },
  { situacao: 'em-dia', texto: 'Em dia', cor: '#c99700' },
  { situacao: 'vencendo', texto: 'Vencendo', cor: '#d97706' },
  { situacao: 'inadimplente', texto: 'Inadimplente', cor: '#b3261e' },
  { situacao: 'disponivel', texto: 'Disponível', cor: '#5f6d7e' },
  { situacao: 'reservado', texto: 'Reservado', cor: '#2a5b9b' },
];

const COR: Record<Situacao, string> = Object.fromEntries(
  LEGENDA.map((item) => [item.situacao, item.cor]),
) as Record<Situacao, string>;

const ROTULO: Record<Situacao, string> = Object.fromEntries(
  LEGENDA.map((item) => [item.situacao, item.texto]),
) as Record<Situacao, string>;

// Padrão determinístico de situações — distribui as cores de forma variada
// sem depender de aleatoriedade (que quebraria a estabilidade da tela).
const CICLO: Situacao[] = [
  'em-dia',
  'quitado',
  'inadimplente',
  'em-dia',
  'reservado',
  'vencendo',
  'em-dia',
  'disponivel',
  'quitado',
  'inadimplente',
  'em-dia',
  'disponivel',
];

function montarQuadra(nome: string, quantidade: number, deslocamento: number): {
  nome: string;
  lotes: Lote[];
} {
  const lotes: Lote[] = Array.from({ length: quantidade }, (_, indice) => ({
    id: `${nome}-${indice + 1}`,
    numero: indice + 1,
    situacao: CICLO[(indice + deslocamento) % CICLO.length],
  }));
  return { nome, lotes };
}

const QUADRAS = [
  montarQuadra('A', 20, 0),
  montarQuadra('B', 20, 5),
  montarQuadra('C', 16, 2),
  montarQuadra('D', 16, 8),
];

export function MapaDoLoteamento() {
  const [selecionado, definirSelecionado] = useState<{ quadra: string; lote: Lote } | null>(null);

  const totais = useMemo(() => {
    const contagem = {} as Record<Situacao, number>;
    for (const quadra of QUADRAS) {
      for (const lote of quadra.lotes) {
        contagem[lote.situacao] = (contagem[lote.situacao] ?? 0) + 1;
      }
    }
    return contagem;
  }, []);

  const ocupado = selecionado && selecionado.lote.situacao !== 'disponivel';

  return (
    <>
      <CabecalhoDaPagina
        titulo="Mapa do loteamento"
        descricao="Loteamento Residencial Bela Vista · situação por lote em tempo real"
      />

      <div className="corpo-da-pagina">
        <div className="mapa-legenda">
          {LEGENDA.map((item) => (
            <span key={item.situacao} className="mapa-legenda__item">
              <span className="mapa-legenda__cor" style={{ background: item.cor }} />
              {item.texto}
              <strong className="numerico">{totais[item.situacao] ?? 0}</strong>
            </span>
          ))}
        </div>

        <div className="mapa-planta">
          <div className="mapa-quadras">
            {QUADRAS.map((quadra) => (
              <section key={quadra.nome} className="mapa-quadra">
                <header className="mapa-quadra__titulo">Quadra {quadra.nome}</header>
                <div className="mapa-quadra__lotes">
                  {quadra.lotes.map((lote) => {
                    const ativo = selecionado?.lote.id === lote.id;
                    return (
                      <button
                        key={lote.id}
                        type="button"
                        className={`mapa-lote${ativo ? ' mapa-lote--ativo' : ''}`}
                        style={{ background: COR[lote.situacao] }}
                        onClick={() => definirSelecionado({ quadra: quadra.nome, lote })}
                        title={`Quadra ${quadra.nome} · Lote ${lote.numero} — ${ROTULO[lote.situacao]}`}
                        aria-label={`Lote ${lote.numero}, ${ROTULO[lote.situacao]}`}
                      >
                        {lote.numero}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          <aside className="mapa-detalhe">
            {selecionado ? (
              <>
                <div className="mapa-detalhe__cabecalho">
                  <span
                    className="mapa-detalhe__marcador"
                    style={{ background: COR[selecionado.lote.situacao] }}
                  />
                  <div>
                    <strong>
                      Quadra {selecionado.quadra} · Lote {selecionado.lote.numero}
                    </strong>
                    <span className="texto-suave">{ROTULO[selecionado.lote.situacao]}</span>
                  </div>
                </div>

                {ocupado ? (
                  <>
                    <p className="texto-suave">
                      Lote vinculado a um contrato ativo. Abra o contrato para ver parcelas,
                      boletos e histórico de cobrança.
                    </p>
                    <Link className="botao botao--primario" to="/contratos">
                      Abrir contrato
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="texto-suave">
                      Lote disponível para venda. Inicie uma reserva ou uma nova proposta.
                    </p>
                    <Link className="botao" to="/comercial/reserva-de-lotes">
                      Reservar lote
                    </Link>
                  </>
                )}
              </>
            ) : (
              <p className="texto-suave">
                Selecione um lote no mapa para ver a situação e abrir o contrato.
              </p>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}
