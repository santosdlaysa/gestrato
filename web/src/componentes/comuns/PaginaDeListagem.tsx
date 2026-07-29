import { useMemo, useState } from 'react';
import { CabecalhoDaPagina } from '@/componentes/layout/CabecalhoDaPagina';
import { Painel } from '@/componentes/comuns/Painel';
import { Selo } from '@/componentes/comuns/Selo';
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
  colunas: ColunaDeListagem[];
  /** Cada linha é um array de células alinhado às colunas. */
  linhas: CelulaDeListagem[][];
}

function ehSelo(celula: CelulaDeListagem): celula is { selo: { texto: string; tom: TomDoSelo } } {
  return typeof celula === 'object' && celula !== null && 'selo' in celula;
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
 * Alimentada por configuração (ver `src/lib/telas.tsx`), permite materializar
 * dezenas de telas tabulares sem duplicar layout. Os dados são de exemplo até
 * a API expor os recursos correspondentes.
 */
export function PaginaDeListagem({ config }: { config: ConfigDeListagem }) {
  const [busca, definirBusca] = useState('');
  const [avisoNovo, definirAvisoNovo] = useState(false);
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
          <button
            type="button"
            className="botao botao--primario"
            onClick={() => definirAvisoNovo(true)}
          >
            + {config.textoNovo ?? 'Novo'}
          </button>
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
          descricao="Dados de exemplo"
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
                  </tr>
                </thead>
                <tbody>
                  {linhasFiltradas.map((linha, indice) => (
                    <tr key={indice}>
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
                            {ehSelo(celula) ? (
                              <Selo texto={celula.selo.texto} tom={celula.selo.tom} />
                            ) : (
                              celula
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Painel>
      </div>
    </>
  );
}
