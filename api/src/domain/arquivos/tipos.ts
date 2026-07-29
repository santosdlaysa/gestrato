import { ErroDeValidacao } from '../shared/errors.js';

export const ESCOPOS_DE_ANEXO = ['CLIENTE', 'CONTRATO'] as const;
export type EscopoDoAnexo = (typeof ESCOPOS_DE_ANEXO)[number];

export const CATEGORIAS_DE_ANEXO = [
  'RG',
  'CPF',
  'COMPROVANTE_RESIDENCIA',
  'COMPROVANTE_RENDA',
  'CERTIDAO',
  'CONTRATO_ASSINADO',
  'ADITIVO',
  'TERMO_DE_RENEGOCIACAO',
  'DISTRATO',
  'TERMO_DE_QUITACAO',
  'COMPROVANTE_PAGAMENTO',
  'OUTRO',
] as const;
export type CategoriaDeAnexo = (typeof CATEGORIAS_DE_ANEXO)[number];

export const ROTULOS_DE_CATEGORIA: Record<CategoriaDeAnexo, string> = {
  RG: 'RG ou CNH',
  CPF: 'CPF ou CNPJ',
  COMPROVANTE_RESIDENCIA: 'Comprovante de residencia',
  COMPROVANTE_RENDA: 'Comprovante de renda',
  CERTIDAO: 'Certidao civil',
  CONTRATO_ASSINADO: 'Contrato assinado',
  ADITIVO: 'Aditivo',
  TERMO_DE_RENEGOCIACAO: 'Termo de renegociacao',
  DISTRATO: 'Distrato',
  TERMO_DE_QUITACAO: 'Termo de quitacao',
  COMPROVANTE_PAGAMENTO: 'Comprovante de pagamento',
  OUTRO: 'Outro',
};

/**
 * Categoria de documento de pessoa nao faz sentido pendurada num contrato, e
 * vice-versa. Restringir aqui evita um acervo em que ninguem acha nada.
 */
const CATEGORIAS_POR_ESCOPO: Record<EscopoDoAnexo, readonly CategoriaDeAnexo[]> = {
  CLIENTE: ['RG', 'CPF', 'COMPROVANTE_RESIDENCIA', 'COMPROVANTE_RENDA', 'CERTIDAO', 'OUTRO'],
  CONTRATO: [
    'CONTRATO_ASSINADO',
    'ADITIVO',
    'TERMO_DE_RENEGOCIACAO',
    'DISTRATO',
    'TERMO_DE_QUITACAO',
    'COMPROVANTE_PAGAMENTO',
    'OUTRO',
  ],
};

export function categoriasDoEscopo(escopo: EscopoDoAnexo): readonly CategoriaDeAnexo[] {
  return CATEGORIAS_POR_ESCOPO[escopo];
}

export function garantirEscopoDeAnexo(valor: string): EscopoDoAnexo {
  if (!(ESCOPOS_DE_ANEXO as readonly string[]).includes(valor)) {
    throw new ErroDeValidacao(`Escopo de anexo invalido: "${valor}".`);
  }
  return valor as EscopoDoAnexo;
}

export function garantirCategoriaDeAnexo(valor: string): CategoriaDeAnexo {
  if (!(CATEGORIAS_DE_ANEXO as readonly string[]).includes(valor)) {
    throw new ErroDeValidacao(`Categoria de anexo invalida: "${valor}".`);
  }
  return valor as CategoriaDeAnexo;
}

export function garantirCategoriaCompativel(
  escopo: EscopoDoAnexo,
  categoria: CategoriaDeAnexo,
): void {
  if (!categoriasDoEscopo(escopo).includes(categoria)) {
    throw new ErroDeValidacao(
      `A categoria "${ROTULOS_DE_CATEGORIA[categoria]}" nao se aplica a ${escopo.toLowerCase()}. ` +
        `Categorias validas: ${categoriasDoEscopo(escopo).map((c) => ROTULOS_DE_CATEGORIA[c]).join(', ')}.`,
    );
  }
}

/** Tipos aceitos e a extensao usada ao guardar o arquivo. */
export const TIPOS_ACEITOS: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export const TAMANHO_MAXIMO_EM_BYTES = 10 * 1024 * 1024;

export function garantirTipoAceito(tipoMime: string): string {
  const extensao = TIPOS_ACEITOS[tipoMime];
  if (!extensao) {
    throw new ErroDeValidacao(
      `Tipo de arquivo nao aceito: ${tipoMime}. Envie PDF, JPEG, PNG ou WebP.`,
    );
  }
  return extensao;
}
