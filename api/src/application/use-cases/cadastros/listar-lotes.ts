import type { Pagina } from '../../ports/comuns.js';
import type { FiltroDeLotes, RepositorioDeLotes } from '../../ports/repositorios.js';
import type { ContextoDeLotes, LoteDetalhado } from './contexto-de-lotes.js';

export class ListarLotes {
  constructor(
    private readonly lotes: RepositorioDeLotes,
    private readonly contexto: ContextoDeLotes,
  ) {}

  async executar(filtro: FiltroDeLotes): Promise<Pagina<LoteDetalhado>> {
    const pagina = await this.lotes.listar(filtro);
    return { ...pagina, itens: await this.contexto.daPagina(pagina.itens, filtro) };
  }
}
