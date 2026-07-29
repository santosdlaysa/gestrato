import { useLocation } from 'react-router-dom';
import { PaginaDeListagem } from '@/componentes/comuns/PaginaDeListagem';
import { EmConstrucao } from '@/paginas/EmConstrucao';
import { LISTAGENS } from '@/lib/telas';

/**
 * Dispatcher das rotas ainda sem página dedicada.
 *
 * Se existe uma listagem configurada para o caminho, mostra a tela pronta;
 * caso contrário, cai no placeholder "Em construção".
 */
export function Tela() {
  const local = useLocation();
  const config = LISTAGENS[local.pathname];
  return config ? <PaginaDeListagem config={config} /> : <EmConstrucao />;
}
