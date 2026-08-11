import { useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAutenticacao } from '@/contextos/AutenticacaoContexto';
import { MODULOS, moduloDoCaminho } from '@/lib/navegacao';
import type { Modulo } from '@/lib/navegacao';
import type { Permissao } from '@/tipos/usuario';
import { IconeDoModulo } from './IconeDoModulo';

function classeDoLink({ isActive }: { isActive: boolean }): string {
  return isActive ? 'barra-lateral__link barra-lateral__link--ativo' : 'barra-lateral__link';
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function moduloDisponivel(modulo: Modulo, permissoes: readonly Permissao[] | undefined): boolean {
  return !modulo.permissao || (permissoes?.includes(modulo.permissao) ?? false);
}

/** Filtra um módulo pelos itens que casam com o termo de busca. */
function filtrarModulo(
  modulo: Modulo,
  termo: string,
  permissoes: readonly Permissao[] | undefined,
): Modulo | null {
  if (!moduloDisponivel(modulo, permissoes)) return null;
  if (!termo) return modulo;
  const secoes = modulo.secoes
    .map((secao) => ({
      ...secao,
      itens: secao.itens.filter((item) => normalizar(item.texto).includes(termo)),
    }))
    .filter((secao) => secao.itens.length > 0);
  if (normalizar(modulo.titulo).includes(termo)) return modulo;
  return secoes.length > 0 ? { ...modulo, secoes } : null;
}

export function BarraLateral() {
  const { usuario, sair } = useAutenticacao();
  const local = useLocation();
  const [busca, definirBusca] = useState('');
  const termo = normalizar(busca.trim());

  const moduloAtivo = moduloDoCaminho(local.pathname);
  const [abertos, definirAbertos] = useState<Set<string>>(
    () => new Set(moduloAtivo ? [moduloAtivo.id] : ['dashboard']),
  );

  const modulosVisiveis = useMemo(
    () =>
      MODULOS.map((modulo) => filtrarModulo(modulo, termo, usuario?.permissoes)).filter(
        (m): m is Modulo => m !== null,
      ),
    [termo, usuario?.permissoes],
  );

  function alternar(id: string) {
    definirAbertos((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  }

  return (
    <aside className="barra-lateral">
      <div className="barra-lateral__marca">
        <strong>GESTRATO</strong>
        <span>ERP para loteadoras</span>
      </div>

      <div className="barra-lateral__busca">
        <input
          type="search"
          value={busca}
          onChange={(evento) => definirBusca(evento.target.value)}
          placeholder="Buscar no menu…"
          aria-label="Buscar no menu"
        />
      </div>

      <nav className="barra-lateral__navegacao">
        {modulosVisiveis.map((modulo) => {
          const expandido = Boolean(termo) || abertos.has(modulo.id);
          return (
            <div key={modulo.id} className="barra-lateral__modulo">
              <button
                type="button"
                className={
                  moduloAtivo?.id === modulo.id
                    ? 'barra-lateral__cabecalho barra-lateral__cabecalho--ativo'
                    : 'barra-lateral__cabecalho'
                }
                onClick={() => alternar(modulo.id)}
                aria-expanded={expandido}
              >
                <span className="barra-lateral__icone">
                  <IconeDoModulo id={modulo.id} />
                </span>
                <span className="barra-lateral__titulo">{modulo.titulo}</span>
                <svg
                  className={`barra-lateral__seta${expandido ? ' barra-lateral__seta--aberta' : ''}`}
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </button>

              {expandido && (
                <div className="barra-lateral__itens">
                  {modulo.secoes.map((secao, indice) => (
                    <div key={secao.subtitulo ?? indice}>
                      {secao.subtitulo && (
                        <div className="barra-lateral__subtitulo">{secao.subtitulo}</div>
                      )}
                      {secao.itens.map((item) => (
                        <NavLink
                          key={`${modulo.id}:${item.para}`}
                          to={item.para}
                          end={item.para === '/'}
                          className={classeDoLink}
                        >
                          {item.texto}
                        </NavLink>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {modulosVisiveis.length === 0 && (
          <p className="barra-lateral__vazio">Nada encontrado para “{busca}”.</p>
        )}
      </nav>

      <div className="barra-lateral__rodape">
        <div className="barra-lateral__usuario">{usuario?.nome ?? '—'}</div>
        <div className="barra-lateral__papel">{usuario?.perfilNome ?? ''}</div>
        <button type="button" className="botao botao--pequeno barra-lateral__sair" onClick={sair}>
          Sair
        </button>
      </div>
    </aside>
  );
}
