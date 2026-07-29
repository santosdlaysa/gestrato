import type {
  RepositorioDaRegua,
  RepositorioDeModelosDeMensagem,
} from '../../../../application/ports/repositorios.js';
import { ReguaDeCobranca } from '../../../../domain/cobranca/regua-de-cobranca.js';
import type { ModeloDeMensagem } from '../../../../domain/cobranca/redator-de-mensagens.js';
import type { ClientePrisma } from '../cliente-prisma.js';
import { mapeadorDeEventoDaRegua, mapeadorDeModelo } from '../mappers/cobranca.mapper.js';

export class RepositorioDaReguaPrisma implements RepositorioDaRegua {
  constructor(private readonly prisma: ClientePrisma) {}

  /**
   * Banco vazio devolve a regua padrao em vez de "nenhuma cobranca configurada".
   * Uma loteadora que ainda nao mexeu na configuracao deve cobrar do mesmo
   * jeito — silencio aqui significaria inadimplencia sem aviso.
   */
  async obter(): Promise<ReguaDeCobranca> {
    const linhas = await this.prisma.eventoDeRegua.findMany({
      orderBy: [{ gatilho: 'asc' }, { dias: 'asc' }],
    });
    if (linhas.length === 0) return ReguaDeCobranca.padrao();
    return ReguaDeCobranca.de(linhas.map(mapeadorDeEventoDaRegua.paraDominio));
  }

  /**
   * Substitui a regua inteira. E deliberadamente um "apaga e grava": editar
   * evento a evento abriria espaco para estado intermediario inconsistente
   * (duas etapas com a mesma chave) enquanto o job roda.
   */
  async substituir(regua: ReguaDeCobranca): Promise<void> {
    await this.prisma.eventoDeRegua.deleteMany({});
    if (regua.eventos.length === 0) return;
    await this.prisma.eventoDeRegua.createMany({
      data: regua.eventos.map(mapeadorDeEventoDaRegua.paraPersistencia),
    });
  }
}

export class RepositorioDeModelosPrisma implements RepositorioDeModelosDeMensagem {
  constructor(private readonly prisma: ClientePrisma) {}

  async porChave(chave: string): Promise<ModeloDeMensagem | null> {
    const linha = await this.prisma.modeloDeMensagem.findUnique({ where: { chave } });
    return linha ? mapeadorDeModelo.paraDominio(linha) : null;
  }

  async listar(): Promise<ModeloDeMensagem[]> {
    const linhas = await this.prisma.modeloDeMensagem.findMany({ orderBy: { chave: 'asc' } });
    return linhas.map(mapeadorDeModelo.paraDominio);
  }

  async mapa(): Promise<Map<string, ModeloDeMensagem>> {
    const modelos = await this.listar();
    return new Map(modelos.map((modelo) => [modelo.chave, modelo]));
  }

  async salvar(modelo: ModeloDeMensagem): Promise<void> {
    await this.prisma.modeloDeMensagem.upsert({
      where: { chave: modelo.chave },
      create: {
        chave: modelo.chave,
        descricao: modelo.chave,
        assunto: modelo.assunto,
        corpo: modelo.corpo,
      },
      update: { assunto: modelo.assunto, corpo: modelo.corpo },
    });
  }
}
