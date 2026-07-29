import { Link, useLocation } from 'react-router-dom';
import { CabecalhoDaPagina } from '@/componentes/layout/CabecalhoDaPagina';
import { IconeDoModulo } from '@/componentes/layout/IconeDoModulo';
import { localizar } from '@/lib/navegacao';

/**
 * Página placeholder para funcionalidades ainda não implementadas.
 *
 * Descobre o contexto (módulo + tela) a partir do caminho atual usando o mapa
 * de navegação, então cada rota recém-criada já aparece com título e trilha
 * corretos, sem precisar de um componente dedicado.
 */
export function EmConstrucao() {
  const local = useLocation();
  const contexto = localizar(local.pathname);

  const tituloTela = contexto?.folha.texto ?? 'Módulo';
  const modulo = contexto?.modulo;

  return (
    <>
      <CabecalhoDaPagina
        titulo={tituloTela}
        descricao={modulo ? `Gestrato · ${modulo.titulo}` : 'Gestrato'}
      />
      <div className="corpo-da-pagina">
        <div className="em-construcao">
          <span className="em-construcao__icone">
            {modulo ? <IconeDoModulo id={modulo.id} tamanho={30} /> : null}
          </span>
          <span className="selo selo--construcao">Em construção</span>
          <h2 className="em-construcao__titulo">{tituloTela}</h2>
          <p className="em-construcao__texto">
            Esta tela faz parte do módulo{' '}
            <strong>{modulo?.titulo ?? 'Gestrato'}</strong> e já está reservada no mapa do
            sistema. A implementação chega em breve.
          </p>
          <Link className="botao botao--primario" to="/">
            Voltar ao dashboard
          </Link>
        </div>
      </div>
    </>
  );
}
