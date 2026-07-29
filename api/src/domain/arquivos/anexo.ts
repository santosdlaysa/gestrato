import { Entidade } from '../shared/entidade.js';
import { ErroDeValidacao } from '../shared/errors.js';
import { Identificador } from '../shared/identificador.js';
import {
  garantirCategoriaCompativel,
  garantirTipoAceito,
  ROTULOS_DE_CATEGORIA,
  TAMANHO_MAXIMO_EM_BYTES,
  type CategoriaDeAnexo,
  type EscopoDoAnexo,
} from './tipos.js';

interface EstadoDoAnexo {
  id: Identificador;
  escopo: EscopoDoAnexo;
  donoId: Identificador;
  categoria: CategoriaDeAnexo;
  nomeOriginal: string;
  chaveNoArmazenamento: string;
  tipoMime: string;
  tamanhoBytes: number;
  descricao: string | null;
  enviadoPor: string | null;
  enviadoEm: Date;
}

/**
 * Metadado de um arquivo guardado — o contrato assinado, o RG do cliente.
 *
 * A entidade nunca carrega o binario: ela guarda a CHAVE que o armazenamento
 * usa para recuperar o conteudo. Assim o mesmo agregado serve para disco local,
 * S3 ou qualquer outro provedor, e listar cem anexos nao carrega cem arquivos
 * na memoria.
 */
export class Anexo extends Entidade {
  private constructor(private readonly estado: EstadoDoAnexo) {
    super(estado.id);
  }

  static novo(entrada: {
    id: Identificador;
    escopo: EscopoDoAnexo;
    donoId: Identificador;
    categoria: CategoriaDeAnexo;
    nomeOriginal: string;
    tipoMime: string;
    tamanhoBytes: number;
    descricao?: string | null;
    enviadoPor?: string | null;
    enviadoEm?: Date;
  }): Anexo {
    const nomeOriginal = sanearNome(entrada.nomeOriginal);
    garantirCategoriaCompativel(entrada.escopo, entrada.categoria);
    const extensao = garantirTipoAceito(entrada.tipoMime);

    if (!Number.isInteger(entrada.tamanhoBytes) || entrada.tamanhoBytes <= 0) {
      throw new ErroDeValidacao('Arquivo vazio ou com tamanho invalido.');
    }
    if (entrada.tamanhoBytes > TAMANHO_MAXIMO_EM_BYTES) {
      throw new ErroDeValidacao(
        `Arquivo de ${formatarTamanho(entrada.tamanhoBytes)} excede o limite de ${formatarTamanho(TAMANHO_MAXIMO_EM_BYTES)}.`,
      );
    }

    return new Anexo({
      id: entrada.id,
      escopo: entrada.escopo,
      donoId: entrada.donoId,
      categoria: entrada.categoria,
      nomeOriginal,
      // A chave e derivada do id, nunca do nome enviado: nome de arquivo do
      // usuario pode conter "../", acento ou caractere que o armazenamento
      // interpreta como caminho.
      chaveNoArmazenamento: `${entrada.escopo.toLowerCase()}/${entrada.donoId.paraString()}/${entrada.id.paraString()}.${extensao}`,
      tipoMime: entrada.tipoMime,
      tamanhoBytes: entrada.tamanhoBytes,
      descricao: entrada.descricao?.trim() || null,
      enviadoPor: entrada.enviadoPor ?? null,
      enviadoEm: entrada.enviadoEm ?? new Date(),
    });
  }

  static restaurar(estado: EstadoDoAnexo): Anexo {
    return new Anexo({ ...estado });
  }

  get escopo(): EscopoDoAnexo {
    return this.estado.escopo;
  }

  get donoId(): Identificador {
    return this.estado.donoId;
  }

  get categoria(): CategoriaDeAnexo {
    return this.estado.categoria;
  }

  get categoriaRotulo(): string {
    return ROTULOS_DE_CATEGORIA[this.estado.categoria];
  }

  get nomeOriginal(): string {
    return this.estado.nomeOriginal;
  }

  get chaveNoArmazenamento(): string {
    return this.estado.chaveNoArmazenamento;
  }

  get tipoMime(): string {
    return this.estado.tipoMime;
  }

  get tamanhoBytes(): number {
    return this.estado.tamanhoBytes;
  }

  get descricao(): string | null {
    return this.estado.descricao;
  }

  get enviadoPor(): string | null {
    return this.estado.enviadoPor;
  }

  get enviadoEm(): Date {
    return this.estado.enviadoEm;
  }

  pertenceA(escopo: EscopoDoAnexo, donoId: string): boolean {
    return this.estado.escopo === escopo && this.estado.donoId.paraString() === donoId;
  }

  paraEstado(): Readonly<EstadoDoAnexo> {
    return { ...this.estado };
  }
}

/**
 * Mantem o nome legivel para quem baixa, sem deixar passar caminho.
 * O nome so serve de rotulo e de sugestao no download — nunca de chave.
 */
function sanearNome(nome: string): string {
  const limpo = (nome ?? '')
    .replace(/[\\/]/g, '_')
    // Remove caracteres de controle, que quebram o cabecalho Content-Disposition.
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim();
  if (!limpo) throw new ErroDeValidacao('Nome do arquivo e obrigatorio.');
  return limpo.slice(0, 180);
}

export function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
