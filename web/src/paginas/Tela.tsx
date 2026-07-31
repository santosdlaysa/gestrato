import { useLocation } from 'react-router-dom';
import { PaginaDeListagem } from '@/componentes/comuns/PaginaDeListagem';
import { EmConstrucao } from '@/paginas/EmConstrucao';
import { LISTAGENS } from '@/lib/telas';
import { Financeiro } from './Financeiro';
import { ConfiguracoesEIntegracoes } from './ConfiguracoesEIntegracoes';

/**
 * Dispatcher das rotas ainda sem página dedicada.
 *
 * Se existe uma listagem configurada para o caminho, mostra a tela pronta;
 * caso contrário, cai no placeholder "Em construção".
 */
export function Tela() {
  const local = useLocation();
  if (local.pathname.startsWith('/financeiro/')) return <Financeiro />;
  if (local.pathname.startsWith('/configuracoes') || local.pathname.startsWith('/integracoes')) return <ConfiguracoesEIntegracoes />;
  const config = LISTAGENS[local.pathname];
  return config ? <PaginaDeListagem config={config} /> : <EmConstrucao />;
}
