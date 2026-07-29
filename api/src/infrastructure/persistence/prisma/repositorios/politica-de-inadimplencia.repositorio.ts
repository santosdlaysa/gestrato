import type { RepositorioDaPoliticaDeInadimplencia } from '../../../../application/ports/repositorios.js';
import { PoliticaDeInadimplencia } from '../../../../domain/contratos/politica-de-inadimplencia.js';
import type { ClientePrisma } from '../cliente-prisma.js';

/** Configuracao de linha unica — a escala vale para a loteadora inteira. */
const CHAVE_UNICA = 'padrao';

export class RepositorioDaPoliticaDeInadimplenciaPrisma implements RepositorioDaPoliticaDeInadimplencia {
  constructor(private readonly prisma: ClientePrisma) {}

  /**
   * Sem linha gravada, devolve a politica padrao em vez de falhar. Uma
   * loteadora que ainda nao configurou a escala precisa continuar enxergando
   * inadimplencia — silencio aqui esconderia exatamente quem parou de pagar.
   */
  async obter(): Promise<PoliticaDeInadimplencia> {
    const linha = await this.prisma.politicaDeInadimplencia.findUnique({ where: { id: CHAVE_UNICA } });
    if (!linha) return PoliticaDeInadimplencia.PADRAO;

    return PoliticaDeInadimplencia.de({
      diasParaInadimplencia: linha.diasParaInadimplencia,
      diasParaRetomadaDoLote: linha.diasParaRetomadaDoLote,
    });
  }

  async salvar(politica: PoliticaDeInadimplencia): Promise<void> {
    const dados = politica.paraEstado();
    await this.prisma.politicaDeInadimplencia.upsert({
      where: { id: CHAVE_UNICA },
      create: { id: CHAVE_UNICA, ...dados },
      update: dados,
    });
  }
}
