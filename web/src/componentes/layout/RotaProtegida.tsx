import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAutenticacao } from '@/contextos/AutenticacaoContexto';
import { EstadoDeCarregamento } from '@/componentes/comuns/Estados';
import {
  ROTA_INICIAL_FINANCEIRO,
  caminhoLiberadoNoFinanceiro,
  estaConfinadoAoFinanceiro,
} from '@/lib/permissoes';

export function RotaProtegida({ children }: { children: ReactNode }) {
  const { autenticado, verificando, usuario } = useAutenticacao();
  const local = useLocation();

  if (verificando) return <EstadoDeCarregamento mensagem="Verificando sessão…" />;
  if (!autenticado) return <Navigate to="/login" replace state={{ de: local.pathname }} />;

  // Confinamento: usuario restrito ao Financeiro nao acessa rotas fora dele,
  // nem digitando a URL direto — cai na home financeira. O backend tambem barra.
  if (estaConfinadoAoFinanceiro(usuario?.permissoes) && !caminhoLiberadoNoFinanceiro(local.pathname)) {
    return <Navigate to={ROTA_INICIAL_FINANCEIRO} replace />;
  }

  return <>{children}</>;
}
