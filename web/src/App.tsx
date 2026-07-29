import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from '@/componentes/layout/Layout';
import { RotaProtegida } from '@/componentes/layout/RotaProtegida';
import { Login } from '@/paginas/Login';
import { Dashboard } from '@/paginas/Dashboard';
import { Parcelas } from '@/paginas/Parcelas';
import { Regua } from '@/paginas/Regua';
import { Cobrancas } from '@/paginas/Cobrancas';
import { Contratos } from '@/paginas/Contratos';
import { NovoContrato } from '@/paginas/NovoContrato';
import { DetalheDoContrato } from '@/paginas/DetalheDoContrato';
import { Relatorios } from '@/paginas/Relatorios';
import { Clientes } from '@/paginas/Clientes';
import { Lotes } from '@/paginas/Lotes';
import { NaoEncontrada } from '@/paginas/NaoEncontrada';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RotaProtegida>
            <Layout />
          </RotaProtegida>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/parcelas" element={<Parcelas />} />
        <Route path="/regua" element={<Regua />} />
        <Route path="/cobrancas" element={<Cobrancas />} />
        <Route path="/contratos" element={<Contratos />} />
        <Route path="/contratos/novo" element={<NovoContrato />} />
        <Route path="/contratos/:id" element={<DetalheDoContrato />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/lotes" element={<Lotes />} />
        <Route path="*" element={<NaoEncontrada />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
