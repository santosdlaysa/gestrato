/**
 * Porta de armazenamento de binarios.
 *
 * O sistema guarda no banco apenas metadados e a chave; o conteudo vive aqui.
 * Mesma estrategia do gateway de cobranca: trocar disco local por S3, R2 ou
 * Backblaze e implementar esta interface e mudar uma linha na composicao —
 * nenhuma regra de negocio muda.
 *
 * Atencao operacional: disco local NAO serve para producao em plataformas com
 * sistema de arquivos efemero (Render, Heroku, Fly), onde cada deploy apaga os
 * arquivos. Nesses casos e obrigatorio um provedor externo.
 */
export interface ArmazenamentoDeArquivos {
  /** Nome curto registrado nos logs (`local`, `s3`, `r2`). */
  readonly nome: string;

  salvar(chave: string, conteudo: Buffer, tipoMime: string): Promise<void>;

  ler(chave: string): Promise<Buffer>;

  /** Nao lanca quando a chave nao existe — remover o que ja sumiu e sucesso. */
  remover(chave: string): Promise<void>;

  existe(chave: string): Promise<boolean>;
}
