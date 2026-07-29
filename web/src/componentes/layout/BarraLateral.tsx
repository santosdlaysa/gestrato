import { NavLink } from 'react-router-dom';
import { useAutenticacao } from '@/contextos/AutenticacaoContexto';
import { rotuloDoPapel } from '@/lib/permissoes';

interface ItemDeMenu {
  para: string;
  texto: string;
  fim?: boolean;
}

interface GrupoDeMenu {
  titulo: string;
  itens: ItemDeMenu[];
}

const GRUPOS: GrupoDeMenu[] = [
  {
    titulo: 'Cobrança',
    itens: [
      { para: '/', texto: 'Dashboard', fim: true },
      { para: '/parcelas', texto: 'Parcelas' },
      { para: '/regua', texto: 'Régua de cobrança' },
      { para: '/cobrancas', texto: 'Histórico de envios' },
    ],
  },
  {
    titulo: 'Carteira',
    itens: [
      { para: '/contratos', texto: 'Contratos' },
      { para: '/relatorios', texto: 'Relatórios' },
    ],
  },
  {
    titulo: 'Cadastros',
    itens: [
      { para: '/clientes', texto: 'Clientes' },
      { para: '/lotes', texto: 'Lotes' },
    ],
  },
];

function classeDoLink({ isActive }: { isActive: boolean }): string {
  return isActive ? 'barra-lateral__link barra-lateral__link--ativo' : 'barra-lateral__link';
}

export function BarraLateral() {
  const { usuario, sair } = useAutenticacao();

  return (
    <aside className="barra-lateral">
      <div className="barra-lateral__marca">
        <strong>GESTRATO</strong>
        <span>Gestão de cobrança</span>
      </div>

      <nav className="barra-lateral__navegacao">
        {GRUPOS.map((grupo) => (
          <div key={grupo.titulo}>
            <div className="barra-lateral__grupo">{grupo.titulo}</div>
            {grupo.itens.map((item) => (
              <NavLink key={item.para} to={item.para} end={item.fim} className={classeDoLink}>
                {item.texto}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="barra-lateral__rodape">
        <div className="barra-lateral__usuario">{usuario?.nome ?? '—'}</div>
        <div className="barra-lateral__papel">{usuario ? rotuloDoPapel(usuario.papel) : ''}</div>
        <button type="button" className="botao botao--pequeno barra-lateral__sair" onClick={sair}>
          Sair
        </button>
      </div>
    </aside>
  );
}
