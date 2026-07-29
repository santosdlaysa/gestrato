import type { ReactNode } from 'react';
import { EstadoDeCarregamento, EstadoDeErro, EstadoVazio } from './Estados';
import type { Requisicao } from '@/ganchos/useRequisicao';

interface Props<T> {
  requisicao: Requisicao<T>;
  vazio?: (dados: T) => boolean;
  tituloDoVazio?: string;
  descricaoDoVazio?: string;
  children: (dados: T) => ReactNode;
}

/** Resolve carregando / erro / vazio antes de entregar os dados ao consumidor. */
export function ConteudoDaRequisicao<T>({
  requisicao,
  vazio,
  tituloDoVazio,
  descricaoDoVazio,
  children,
}: Props<T>) {
  if (requisicao.carregando && requisicao.dados === null) return <EstadoDeCarregamento />;
  if (requisicao.erro) {
    return <EstadoDeErro mensagem={requisicao.erro} aoTentarNovamente={requisicao.recarregar} />;
  }
  if (requisicao.dados === null) return <EstadoVazio />;
  if (vazio?.(requisicao.dados)) {
    return <EstadoVazio titulo={tituloDoVazio} descricao={descricaoDoVazio} />;
  }
  return <>{children(requisicao.dados)}</>;
}
