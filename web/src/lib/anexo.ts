import type { Opcao } from '@/componentes/comuns/Campo';

/** Mesmos limites aplicados pela API; validar antes evita subir 10 MB para receber 422. */
export const TAMANHO_MAXIMO_EM_BYTES = 10 * 1024 * 1024;

export const TIPOS_ACEITOS: readonly string[] = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

/** Filtro do seletor de arquivos do sistema — não substitui a validação. */
export const ACEITE_DO_SELETOR = TIPOS_ACEITOS.join(',');

export const CATEGORIAS_DE_CLIENTE: Opcao[] = [
  { valor: 'RG', texto: 'RG ou CNH' },
  { valor: 'CPF', texto: 'CPF ou CNPJ' },
  { valor: 'COMPROVANTE_RESIDENCIA', texto: 'Comprovante de residência' },
  { valor: 'COMPROVANTE_RENDA', texto: 'Comprovante de renda' },
  { valor: 'CERTIDAO', texto: 'Certidão civil' },
  { valor: 'OUTRO', texto: 'Outro' },
];

export const CATEGORIAS_DE_CONTRATO: Opcao[] = [
  { valor: 'CONTRATO_ASSINADO', texto: 'Contrato assinado' },
  { valor: 'ADITIVO', texto: 'Aditivo' },
  { valor: 'TERMO_DE_RENEGOCIACAO', texto: 'Termo de renegociação' },
  { valor: 'DISTRATO', texto: 'Distrato' },
  { valor: 'TERMO_DE_QUITACAO', texto: 'Termo de quitação' },
  { valor: 'COMPROVANTE_PAGAMENTO', texto: 'Comprovante de pagamento' },
  { valor: 'OUTRO', texto: 'Outro' },
];

const UMA_CASA = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

export function formatarTamanho(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const emKb = bytes / 1024;
  if (emKb < 1024) return `${UMA_CASA.format(emKb)} KB`;
  return `${UMA_CASA.format(emKb / 1024)} MB`;
}

/** Devolve a mensagem do problema encontrado ou `null` quando o arquivo pode subir. */
export function validarArquivo(arquivo: File): string | null {
  if (!TIPOS_ACEITOS.includes(arquivo.type)) {
    return 'Formato não aceito. Envie PDF, JPEG, PNG ou WebP.';
  }
  if (arquivo.size > TAMANHO_MAXIMO_EM_BYTES) {
    return `Arquivo de ${formatarTamanho(arquivo.size)}. O limite é ${formatarTamanho(TAMANHO_MAXIMO_EM_BYTES)}.`;
  }
  return null;
}
