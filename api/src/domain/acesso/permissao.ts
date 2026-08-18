import { ErroDeValidacao } from '../shared/errors.js';

/**
 * As permissoes sao capacidades do sistema — cada uma corresponde a uma acao que
 * o codigo verifica (ex.: `exigirPermissao('RECEBER_PAGAMENTO')`). Esta lista e
 * fixa no dominio porque e o codigo que a consome; o que e configuravel (e mora
 * no banco) e QUAIS permissoes cada perfil reune. Ver `Perfil`.
 */
export const PERMISSOES = [
  'CADASTRAR',
  'GERIR_CONTRATOS',
  'RECEBER_PAGAMENTO',
  'EMITIR_DOCUMENTO',
  'ENVIAR_COBRANCA',
  'CONFIGURAR_REGUA',
  'RENEGOCIAR',
  'ANEXAR_ARQUIVO',
  'REMOVER_ANEXO',
  'GERIR_USUARIOS',

  // --- Modelo por modulo (ver/editar) -------------------------------------
  // Estamos migrando o controle de acesso de permissoes por ACAO (acima) para
  // permissoes por MODULO, cada uma em dois niveis: VER (ler/enxergar) e EDITAR
  // (escrever). O Financeiro e o primeiro modulo migrado; os demais entram em
  // seguida. EDITAR pressupoe VER (perfis recebem os dois juntos).
  'VER_FINANCEIRO',
  'EDITAR_FINANCEIRO',

  // Visibilidade por modulo do menu: cada uma libera um modulo da barra lateral
  // para o perfil que a possui. Modulos SEM permissao mapeada continuam visiveis
  // a qualquer autenticado (ver `PERMISSAO_POR_MODULO` no front). O par
  // VER/EDITAR so existe onde ha escrita distinta (por ora, Financeiro).
  'VER_DASHBOARD',
  'VER_COMERCIAL',
  'VER_CLIENTES',
  'VER_CONTRATOS',
  'VER_LOTEAMENTOS',
  'VER_COBRANCAS',
  'VER_DOCUMENTOS',
  'VER_CRM',
  'VER_MOBILE',
  'VER_PORTAL_CLIENTE',
  'VER_PORTAL_CORRETOR',

  // Confinamento (transitorio): diferente das demais, NAO concede acao — ela
  // RESTRINGE. Quem a possui fica preso ao modulo Financeiro (menu e API),
  // mesmo nos modulos ainda nao migrados. Sai de cena quando todos os modulos
  // tiverem VER/EDITAR proprios. Nunca deve entrar em perfis amplos (Admin).
  'SOMENTE_FINANCEIRO',
] as const;
export type Permissao = (typeof PERMISSOES)[number];

export function ehPermissao(valor: string): valor is Permissao {
  return (PERMISSOES as readonly string[]).includes(valor);
}

export function garantirPermissao(valor: string): Permissao {
  if (!ehPermissao(valor)) {
    throw new ErroDeValidacao(
      `Permissao invalida: "${valor}". Esperado uma de: ${PERMISSOES.join(', ')}.`,
    );
  }
  return valor;
}

/** Filtra strings arbitrarias para permissoes validas e sem repeticao. */
export function normalizarPermissoes(valores: readonly string[]): Permissao[] {
  const validas = valores.filter(ehPermissao) as Permissao[];
  return [...new Set(validas)];
}

const ROTULOS: Record<Permissao, string> = {
  CADASTRAR: 'Cadastrar',
  GERIR_CONTRATOS: 'Gerir contratos',
  RECEBER_PAGAMENTO: 'Receber pagamento',
  EMITIR_DOCUMENTO: 'Emitir documento',
  ENVIAR_COBRANCA: 'Enviar cobrança',
  CONFIGURAR_REGUA: 'Configurar régua',
  RENEGOCIAR: 'Renegociar',
  ANEXAR_ARQUIVO: 'Anexar arquivo',
  REMOVER_ANEXO: 'Remover anexo',
  GERIR_USUARIOS: 'Gerir usuários',
  VER_FINANCEIRO: 'Financeiro — ver',
  EDITAR_FINANCEIRO: 'Financeiro — editar',
  VER_DASHBOARD: 'Dashboard — ver',
  VER_COMERCIAL: 'Comercial — ver',
  VER_CLIENTES: 'Clientes — ver',
  VER_CONTRATOS: 'Contratos — ver',
  VER_LOTEAMENTOS: 'Loteamentos — ver',
  VER_COBRANCAS: 'Cobranças — ver',
  VER_DOCUMENTOS: 'Documentos e relatórios — ver',
  VER_CRM: 'CRM — ver',
  VER_MOBILE: 'Aplicativo mobile — ver',
  VER_PORTAL_CLIENTE: 'Portal do cliente — ver',
  VER_PORTAL_CORRETOR: 'Portal do corretor — ver',
  SOMENTE_FINANCEIRO: 'Somente financeiro (acesso restrito)',
};

export function rotuloDaPermissao(permissao: Permissao): string {
  return ROTULOS[permissao];
}
