import type { Permissao } from '@/tipos/usuario';

/**
 * Permissoes efetivas do usuario logado — a mesma lista que o backend usa para
 * autorizar. Antes o front reimplementava a matriz por papel; agora ele apenas
 * consulta as permissoes que a API entrega, sem risco de divergir da regra real.
 */
type Permissoes = readonly Permissao[] | undefined;

function tem(permissoes: Permissoes, permissao: Permissao): boolean {
  return permissoes !== undefined && permissoes.includes(permissao);
}

/** Permissoes que representam alguma forma de escrita/operacao. */
const PERMISSOES_DE_ESCRITA: Permissao[] = [
  'CADASTRAR',
  'GERIR_CONTRATOS',
  'RECEBER_PAGAMENTO',
  'EMITIR_DOCUMENTO',
  'ENVIAR_COBRANCA',
  'CONFIGURAR_REGUA',
  'RENEGOCIAR',
  'ANEXAR_ARQUIVO',
  'REMOVER_ANEXO',
];

/** Verdadeiro quando o usuario tem ao menos uma permissao de escrita. */
export function podeEscrever(permissoes: Permissoes): boolean {
  return permissoes !== undefined && permissoes.some((p) => PERMISSOES_DE_ESCRITA.includes(p));
}

export function podeDarBaixa(permissoes: Permissoes): boolean {
  return tem(permissoes, 'RECEBER_PAGAMENTO');
}

export function podeOperarCobranca(permissoes: Permissoes): boolean {
  return tem(permissoes, 'ENVIAR_COBRANCA');
}

export function podeGerenciarRegua(permissoes: Permissoes): boolean {
  return tem(permissoes, 'CONFIGURAR_REGUA');
}

export function podeConfigurarRegua(permissoes: Permissoes): boolean {
  return tem(permissoes, 'CONFIGURAR_REGUA');
}

export function podeGerenciarContratos(permissoes: Permissoes): boolean {
  return tem(permissoes, 'GERIR_CONTRATOS');
}

export function podeEnviarAnexo(permissoes: Permissoes): boolean {
  return tem(permissoes, 'ANEXAR_ARQUIVO');
}

export function podeRemoverAnexo(permissoes: Permissoes): boolean {
  return tem(permissoes, 'REMOVER_ANEXO');
}

export function podeGerirUsuarios(permissoes: Permissoes): boolean {
  return tem(permissoes, 'GERIR_USUARIOS');
}
