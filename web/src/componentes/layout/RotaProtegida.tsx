import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAutenticacao } from '@/contextos/AutenticacaoContexto';
import { EstadoDeCarregamento } from '@/componentes/comuns/Estados';

export function RotaProtegida({ children }: { children: ReactNode }) {
  const { autenticado, verificando } = useAutenticacao();
  const local = useLocation();

  if (verificando) return <EstadoDeCarregamento mensagem="Verificando sessão…" />;
  if (!autenticado) return <Navigate to="/login" replace state={{ de: local.pathname }} />;
  return <>{children}</>;
}
