import { baixarArquivo, requisitar } from '../http';
import type { Anexo, EntradaDeAnexo, EscopoDeAnexo } from '@/tipos/anexo';

const RECURSO_DO_ESCOPO: Record<EscopoDeAnexo, string> = {
  CLIENTE: 'clientes',
  CONTRATO: 'contratos',
};

function caminhoDaColecao(escopo: EscopoDeAnexo, donoId: string): string {
  return `/${RECURSO_DO_ESCOPO[escopo]}/${donoId}/anexos`;
}

export function listarAnexos(
  escopo: EscopoDeAnexo,
  donoId: string,
  sinal?: AbortSignal,
): Promise<Anexo[]> {
  return requisitar<Anexo[]>(caminhoDaColecao(escopo, donoId), { sinal });
}

export function enviarAnexo(
  escopo: EscopoDeAnexo,
  donoId: string,
  entrada: EntradaDeAnexo,
): Promise<Anexo> {
  const formulario = new FormData();
  formulario.append('arquivo', entrada.arquivo);
  formulario.append('categoria', entrada.categoria);
  if (entrada.descricao) formulario.append('descricao', entrada.descricao);

  // O cliente HTTP reconhece o FormData e deixa o navegador montar o
  // Content-Type com o boundary do multipart.
  return requisitar<Anexo>(caminhoDaColecao(escopo, donoId), {
    metodo: 'POST',
    corpo: formulario,
  });
}

export function removerAnexo(id: string): Promise<void> {
  return requisitar<void>(`/anexos/${id}`, { metodo: 'DELETE' });
}

export function baixarAnexo(anexo: Anexo): Promise<void> {
  return baixarArquivo(`/anexos/${anexo.id}/conteudo`, {}, anexo.nomeOriginal);
}
