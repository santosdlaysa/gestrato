import type { RespostaPaginada } from '@/tipos/comum';

/** Aceita tanto lista pura quanto resposta paginada e devolve sempre um array. */
export function extrairItens<T>(resposta: T[] | RespostaPaginada<T> | null | undefined): T[] {
  if (!resposta) return [];
  if (Array.isArray(resposta)) return resposta;
  return Array.isArray(resposta.itens) ? resposta.itens : [];
}

/** Índice id → rótulo, para resolver nomes que a listagem devolve só como id. */
export function mapaDeOpcoes(opcoes: { valor: string; texto: string }[]): Map<string, string> {
  return new Map(opcoes.map((opcao) => [opcao.valor, opcao.texto]));
}

export function alternarNoConjunto(conjunto: Set<string>, chave: string): Set<string> {
  const proximo = new Set(conjunto);
  if (proximo.has(chave)) proximo.delete(chave);
  else proximo.add(chave);
  return proximo;
}
