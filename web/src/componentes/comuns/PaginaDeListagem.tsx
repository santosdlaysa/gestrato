import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CabecalhoDaPagina } from '@/componentes/layout/CabecalhoDaPagina';
import { Painel } from '@/componentes/comuns/Painel';
import { Selo } from '@/componentes/comuns/Selo';
import { Modal } from '@/componentes/comuns/Modal';
import { EstadoVazio } from '@/componentes/comuns/Estados';
import type { TomDoSelo } from '@/lib/rotulos';

export interface ColunaDeListagem {
  titulo: string;
  numerico?: boolean;
  larga?: boolean;
}

export type CelulaDeListagem = string | number | { selo: { texto: string; tom: TomDoSelo } };

export interface ConfigDeListagem {
  titulo: string;
  descricao?: string;
  textoNovo?: string;
  /**
   * Quando definido, o botão de ação vira um link para esta rota (uma tela real)
   * em vez de mostrar o aviso de "em desenvolvimento". Usado para telas de
   * exemplo que já têm equivalente pronto — ex.: "Regra de cobrança" → /regua.
   */
  acaoPara?: string;
  colunas: ColunaDeListagem[];
  /** Cada linha é um array de células alinhado às colunas. */
  linhas: CelulaDeListagem[][];
}

function ehSelo(celula: CelulaDeListagem): celula is { selo: { texto: string; tom: TomDoSelo } } {
  return typeof celula === 'object' && celula !== null && 'selo' in celula;
}

function renderizarCelula(celula: CelulaDeListagem) {
  return ehSelo(celula) ? <Selo texto={celula.selo.texto} tom={celula.selo.tom} /> : celula;
}

function textoDaCelula(celula: CelulaDeListagem): string {
  return ehSelo(celula) ? celula.selo.texto : String(celula);
}

function normalizar(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Tela de listagem genérica (tabela + busca + ação de novo cadastro).
 *
 * Clicar numa linha abre um modal com todos os campos daquele registro — assim
 * todas as telas alimentadas por configuração ganham detalhe sem código extra.
 * Os dados são de exemplo até a API expor os recursos correspondentes.
 */
export function PaginaDeListagem({ config }: { config: ConfigDeListagem }) {
  const [busca, definirBusca] = useState('');
  const [avisoNovo, definirAvisoNovo] = useState(false);
  const [selecionada, definirSelecionada] = useState<CelulaDeListagem[] | null>(null);
  const termo = normalizar(busca.trim());

  const linhasFiltradas = useMemo(() => {
    if (!termo) return config.linhas;
    return config.linhas.filter((linha) =>
      linha.some((celula) => normalizar(textoDaCelula(celula)).includes(termo)),
    );
  }, [config.linhas, termo]);

  return (
    <>
      <CabecalhoDaPagina
        titulo={config.titulo}
        descricao={config.descricao}
        acoes={
          config.acaoPara ? (
            <Link className="botao botao--primario" to={config.acaoPara}>
              + {config.textoNovo ?? 'Novo'}
            </Link>
          ) : (
            <button
              type="button"
              className="botao botao--primario"
              onClick={() => definirAvisoNovo(true)}
            >
              + {config.textoNovo ?? 'Novo'}
            </button>
          )
        }
      />

      <div className="corpo-da-pagina pilha">
        {avisoNovo && (
          <div className="aviso aviso--info" role="status">
            Formulário de cadastro em desenvolvimento. A estrutura da tela já está pronta.
          </div>
        )}

        <Painel>
          <div className="filtros">
            <div className="campo">
              <span className="campo__rotulo">Buscar</span>
              <input
                type="search"
                value={busca}
                onChange={(evento) => definirBusca(evento.target.value)}
                placeholder="Filtrar registros…"
              />
            </div>
          </div>
        </Painel>

        <Painel
          titulo={config.titulo}
          descricao="Dados de exemplo · clique numa linha para ver os detalhes"
          semPreenchimento
          rodape={
            <span className="texto-suave">
              {linhasFiltradas.length} de {config.linhas.length} registro
              {config.linhas.length === 1 ? '' : 's'}
            </span>
          }
        >
          {linhasFiltradas.length === 0 ? (
            <div className="painel__corpo">
              <EstadoVazio
                titulo="Nenhum registro"
                descricao="Ajuste a busca ou cadastre um novo registro."
              />
            </div>
          ) : (
            <div className="rolagem-horizontal">
              <table className="tabela">
                <thead>
                  <tr>
                    {config.colunas.map((coluna) => (
                      <th key={coluna.titulo} className={coluna.numerico ? 'numerico' : undefined}>
                        {coluna.titulo}
                      </th>
                    ))}
                    <th aria-hidden="true" />
                  </tr>
                </thead>
                <tbody>
                  {linhasFiltradas.map((linha, indice) => (
                    <tr
                      key={indice}
                      className="linha-clicavel"
                      tabIndex={0}
                      role="button"
                      aria-label={`Ver detalhes de ${textoDaCelula(linha[0])}`}
                      onClick={() => definirSelecionada(linha)}
                      onKeyDown={(evento) => {
                        if (evento.key === 'Enter' || evento.key === ' ') {
                          evento.preventDefault();
                          definirSelecionada(linha);
                        }
                      }}
                    >
                      {linha.map((celula, coluna) => {
                        const def = config.colunas[coluna];
                        const classe = [
                          def?.numerico ? 'numerico' : '',
                          def?.larga ? 'celula-larga' : '',
                        ]
                          .filter(Boolean)
                          .join(' ');
                        return (
                          <td key={coluna} className={classe || undefined}>
                            {renderizarCelula(celula)}
                          </td>
                        );
                      })}
                      <td className="celula-detalhe" aria-hidden="true">
                        ›
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Painel>
      </div>

      {selecionada && (
        <Modal
          titulo={textoDaCelula(selecionada[0])}
          descricao={config.titulo}
          aoFechar={() => definirSelecionada(null)}
          rodape={
            <div className="linha linha--entre" style={{ width: '100%' }}>
              <span className="texto-fraco">Registro de exemplo</span>
              <button type="button" className="botao" onClick={() => definirSelecionada(null)}>
                Fechar
              </button>
            </div>
          }
        >
          <dl className="detalhes">
            {config.colunas.map((coluna, i) => (
              <div key={coluna.titulo} className="detalhes__item">
                <dt>{coluna.titulo}</dt>
                <dd className={coluna.numerico ? 'numerico' : undefined}>
                  {selecionada[i] !== undefined ? renderizarCelula(selecionada[i]) : '—'}
                </dd>
              </div>
            ))}
          </dl>
        </Modal>
      )}
    </>
  );
}
