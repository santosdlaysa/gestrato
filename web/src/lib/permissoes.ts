import type { Papel } from '@/tipos/usuario';

const OPERADORES_FINANCEIROS: Papel[] = ['ADMINISTRADOR', 'FINANCEIRO'];

export function podeEscrever(papel: Papel | undefined): boolean {
  return papel !== undefined && papel !== 'CONSULTA';
}

export function podeDarBaixa(papel: Papel | undefined): boolean {
  return papel !== undefined && OPERADORES_FINANCEIROS.includes(papel);
}

export function podeOperarCobranca(papel: Papel | undefined): boolean {
  return papel !== undefined && OPERADORES_FINANCEIROS.includes(papel);
}

export function podeGerenciarRegua(papel: Papel | undefined): boolean {
  return papel !== undefined && OPERADORES_FINANCEIROS.includes(papel);
}

/** Equivale à permissão `CONFIGURAR_REGUA` exigida pela API. */
export function podeConfigurarRegua(papel: Papel | undefined): boolean {
  return papel !== undefined && OPERADORES_FINANCEIROS.includes(papel);
}

export function podeGerenciarContratos(papel: Papel | undefined): boolean {
  return podeEscrever(papel);
}

/** Vendedor anexa documentos do que vende; CONSULTA apenas visualiza e baixa. */
export function podeEnviarAnexo(papel: Papel | undefined): boolean {
  return podeEscrever(papel);
}

/** Apagar documento é irreversível: fica com quem responde pelo financeiro. */
export function podeRemoverAnexo(papel: Papel | undefined): boolean {
  return papel !== undefined && OPERADORES_FINANCEIROS.includes(papel);
}

export function rotuloDoPapel(papel: Papel): string {
  const rotulos: Record<Papel, string> = {
    ADMINISTRADOR: 'Administrador',
    FINANCEIRO: 'Financeiro',
    VENDEDOR: 'Vendedor',
    CONSULTA: 'Consulta',
  };
  return rotulos[papel];
}
