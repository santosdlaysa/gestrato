export type EscopoDeAnexo = 'CLIENTE' | 'CONTRATO';

export interface Anexo {
  id: string;
  escopo: EscopoDeAnexo;
  donoId: string;
  categoria: string;
  categoriaRotulo: string;
  nomeOriginal: string;
  tipoMime: string;
  tamanhoBytes: number;
  descricao: string | null;
  enviadoPor: string;
  enviadoEm: string;
}

export interface EntradaDeAnexo {
  arquivo: File;
  categoria: string;
  descricao?: string;
}
