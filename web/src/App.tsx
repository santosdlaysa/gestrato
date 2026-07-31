import { Navigate, Route, Routes } from 'react-router-dom';
import type { ReactElement } from 'react';
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
import { Loteamentos } from '@/paginas/Loteamentos';
import { MapaDoLoteamento } from '@/paginas/MapaDoLoteamento';
import { Tela } from '@/paginas/Tela';
import { NaoEncontrada } from '@/paginas/NaoEncontrada';
import { caminhosUnicos } from '@/lib/navegacao';

/**
 * Telas já implementadas. Todo caminho do mapa de navegação que não estiver
 * aqui cai automaticamente em `EmConstrucao` — assim a navegação inteira
 * funciona (zero 404) e novas telas entram só apontando o componente abaixo.
 */
const PAGINAS_PRONTAS: Record<string, ReactElement> = {
  '/': <Dashboard />,
  '/parcelas': <Parcelas />,
  '/cobrancas/manual': <Parcelas modo="manual" />,
  '/regua': <Regua />,
  '/cobrancas': <Cobrancas />,
  '/contratos': <Contratos />,
  '/relatorios': <Relatorios />,
  '/clientes': <Clientes />,
  '/lotes': <Lotes />,
  '/loteamentos': <Loteamentos />,
  '/mapa': <MapaDoLoteamento />,
};

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
        {/* Rotas específicas (ações e detalhe) antes das geradas pelo mapa. */}
        <Route path="/contratos/novo" element={<NovoContrato />} />
        <Route path="/contratos/:id" element={<DetalheDoContrato />} />

        {caminhosUnicos().map((caminho) => (
          <Route
            key={caminho}
            path={caminho}
            element={PAGINAS_PRONTAS[caminho] ?? <Tela />}
          />
        ))}

        <Route path="*" element={<NaoEncontrada />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
