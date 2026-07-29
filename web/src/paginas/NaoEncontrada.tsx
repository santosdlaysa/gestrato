import { Link } from 'react-router-dom';
import { CabecalhoDaPagina } from '@/componentes/layout/CabecalhoDaPagina';
import { EstadoVazio } from '@/componentes/comuns/Estados';

export function NaoEncontrada() {
  return (
    <>
      <CabecalhoDaPagina titulo="Página não encontrada" />
      <div className="corpo-da-pagina">
        <EstadoVazio
          titulo="404"
          descricao="O endereço acessado não existe."
          acao={
            <Link className="botao" to="/">
              Ir para o dashboard
            </Link>
          }
        />
      </div>
    </>
  );
}
