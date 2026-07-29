import { Outlet } from 'react-router-dom';
import { BarraLateral } from './BarraLateral';

export function Layout() {
  return (
    <div className="aplicacao">
      <BarraLateral />
      <main className="conteudo">
        <Outlet />
      </main>
    </div>
  );
}
