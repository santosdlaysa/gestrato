import { Anexo } from '../../../domain/arquivos/anexo.js';
import {
  garantirCategoriaDeAnexo,
  type CategoriaDeAnexo,
  type EscopoDoAnexo,
} from '../../../domain/arquivos/tipos.js';
import { ErroNaoEncontrado } from '../../../domain/shared/errors.js';
import { Identificador } from '../../../domain/shared/identificador.js';
import type { GeradorDeIdentificador } from '../../ports/comuns.js';
import type { ArmazenamentoDeArquivos } from '../../ports/armazenamento-de-arquivos.js';
import type { Repositorios } from '../../ports/repositorios.js';

export interface EntradaDeAnexo {
  readonly escopo: EscopoDoAnexo;
  readonly donoId: string;
  readonly categoria: string;
  readonly nomeOriginal: string;
  readonly tipoMime: string;
  readonly conteudo: Buffer;
  readonly descricao: string | null;
  readonly enviadoPor: string | null;
}

export interface ConteudoDoAnexo {
  readonly anexo: Anexo;
  readonly conteudo: Buffer;
}

/**
 * Envia um arquivo e registra seus metadados.
 *
 * A ordem importa: o dono e conferido primeiro, o binario vai para o
 * armazenamento e so entao a linha e gravada. Se a gravacao falhar, o arquivo
 * orfao e removido — melhor perder o upload do que deixar lixo acumulando no
 * armazenamento sem nada que o referencie.
 */
export class AnexarArquivo {
  constructor(
    private readonly repositorios: Repositorios,
    private readonly armazenamento: ArmazenamentoDeArquivos,
    private readonly geradorDeIdentificador: GeradorDeIdentificador,
  ) {}

  async executar(entrada: EntradaDeAnexo): Promise<Anexo> {
    await garantirQueODonoExiste(this.repositorios, entrada.escopo, entrada.donoId);

    const anexo = Anexo.novo({
      id: Identificador.de(this.geradorDeIdentificador.gerar()),
      escopo: entrada.escopo,
      donoId: Identificador.de(entrada.donoId),
      categoria: garantirCategoriaDeAnexo(entrada.categoria),
      nomeOriginal: entrada.nomeOriginal,
      tipoMime: entrada.tipoMime,
      tamanhoBytes: entrada.conteudo.byteLength,
      descricao: entrada.descricao,
      enviadoPor: entrada.enviadoPor,
    });

    await this.armazenamento.salvar(anexo.chaveNoArmazenamento, entrada.conteudo, anexo.tipoMime);

    try {
      await this.repositorios.anexos.salvar(anexo);
    } catch (erro) {
      await this.armazenamento.remover(anexo.chaveNoArmazenamento).catch(() => undefined);
      throw erro;
    }

    return anexo;
  }
}

export class ListarAnexos {
  constructor(private readonly repositorios: Repositorios) {}

  async executar(escopo: EscopoDoAnexo, donoId: string): Promise<Anexo[]> {
    await garantirQueODonoExiste(this.repositorios, escopo, donoId);
    return this.repositorios.anexos.porDono(escopo, donoId);
  }
}

/** Entrega o binario. O acesso passa pela API justamente para exigir token. */
export class BaixarAnexo {
  constructor(
    private readonly repositorios: Repositorios,
    private readonly armazenamento: ArmazenamentoDeArquivos,
  ) {}

  async executar(id: string): Promise<ConteudoDoAnexo> {
    const anexo = await this.repositorios.anexos.porId(id);
    if (!anexo) throw new ErroNaoEncontrado('Anexo', id);

    if (!(await this.armazenamento.existe(anexo.chaveNoArmazenamento))) {
      throw new ErroNaoEncontrado(
        'Conteudo do anexo',
        `${anexo.nomeOriginal} — o registro existe, mas o arquivo nao foi encontrado no armazenamento`,
      );
    }

    return { anexo, conteudo: await this.armazenamento.ler(anexo.chaveNoArmazenamento) };
  }
}

/**
 * Remove metadado e binario.
 *
 * O registro sai primeiro: se a exclusao do binario falhar, sobra um arquivo
 * inacessivel no armazenamento — chato, mas inofensivo. Na ordem inversa,
 * ficaria uma linha apontando para um arquivo que nao existe mais, e toda
 * tentativa de baixar quebraria.
 */
export class RemoverAnexo {
  constructor(
    private readonly repositorios: Repositorios,
    private readonly armazenamento: ArmazenamentoDeArquivos,
  ) {}

  async executar(id: string): Promise<void> {
    const anexo = await this.repositorios.anexos.porId(id);
    if (!anexo) throw new ErroNaoEncontrado('Anexo', id);

    await this.repositorios.anexos.remover(id);
    await this.armazenamento.remover(anexo.chaveNoArmazenamento).catch((erro: unknown) => {
      console.warn(
        `[anexos] registro ${id} removido, mas o binario ${anexo.chaveNoArmazenamento} permaneceu:`,
        erro instanceof Error ? erro.message : erro,
      );
    });
  }
}

/** Anexo pendurado em cliente ou contrato inexistente vira lixo invisivel. */
async function garantirQueODonoExiste(
  repositorios: Repositorios,
  escopo: EscopoDoAnexo,
  donoId: string,
): Promise<void> {
  const dono =
    escopo === 'CLIENTE'
      ? await repositorios.clientes.porId(donoId)
      : await repositorios.contratos.porId(donoId);

  if (!dono) {
    throw new ErroNaoEncontrado(escopo === 'CLIENTE' ? 'Cliente' : 'Contrato', donoId);
  }
}

export type { CategoriaDeAnexo, EscopoDoAnexo };
