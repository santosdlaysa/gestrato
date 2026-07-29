import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, isAbsolute, join, normalize, resolve, sep } from 'node:path';
import type { ArmazenamentoDeArquivos } from '../../application/ports/armazenamento-de-arquivos.js';
import { ErroDeValidacao } from '../../domain/shared/errors.js';

/**
 * Guarda os arquivos em disco, sob um diretorio raiz.
 *
 * Serve para desenvolvimento e para servidores com disco persistente. NAO serve
 * para Render, Heroku ou Fly no plano padrao: nessas plataformas o sistema de
 * arquivos e efemero e todo deploy apaga os anexos. Para producao ali, use um
 * provedor externo implementando `ArmazenamentoDeArquivos`.
 */
export class ArmazenamentoLocal implements ArmazenamentoDeArquivos {
  readonly nome = 'local';
  private readonly raiz: string;

  constructor(diretorio: string) {
    this.raiz = isAbsolute(diretorio) ? normalize(diretorio) : resolve(process.cwd(), diretorio);
  }

  async salvar(chave: string, conteudo: Buffer, _tipoMime: string): Promise<void> {
    const caminho = this.caminhoDe(chave);
    await mkdir(dirname(caminho), { recursive: true });
    await writeFile(caminho, conteudo);
  }

  async ler(chave: string): Promise<Buffer> {
    return readFile(this.caminhoDe(chave));
  }

  async remover(chave: string): Promise<void> {
    // `force` evita erro quando o arquivo ja nao existe — remover o que sumiu
    // e sucesso, nao falha.
    await rm(this.caminhoDe(chave), { force: true });
  }

  async existe(chave: string): Promise<boolean> {
    return existsSync(this.caminhoDe(chave));
  }

  /**
   * Resolve a chave dentro da raiz e confirma que nao escapou dela.
   *
   * As chaves sao geradas pelo dominio a partir de identificadores, entao nao
   * deveriam conter "..". A checagem existe porque o custo de estar errado aqui
   * e leitura ou escrita arbitraria no disco do servidor.
   */
  private caminhoDe(chave: string): string {
    const completo = resolve(join(this.raiz, chave));
    if (completo !== this.raiz && !completo.startsWith(this.raiz + sep)) {
      throw new ErroDeValidacao(`Chave de arquivo invalida: ${chave}`);
    }
    return completo;
  }
}
