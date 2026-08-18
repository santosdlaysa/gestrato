export type Permissao =
  | 'CADASTRAR'
  | 'GERIR_CONTRATOS'
  | 'RECEBER_PAGAMENTO'
  | 'EMITIR_DOCUMENTO'
  | 'ENVIAR_COBRANCA'
  | 'CONFIGURAR_REGUA'
  | 'RENEGOCIAR'
  | 'ANEXAR_ARQUIVO'
  | 'REMOVER_ANEXO'
  | 'GERIR_USUARIOS'
  // Modelo por modulo (ver/editar) — Financeiro e o primeiro migrado.
  | 'VER_FINANCEIRO'
  | 'EDITAR_FINANCEIRO'
  // Visibilidade por modulo do menu (ver `PERMISSAO_POR_MODULO`).
  | 'VER_DASHBOARD'
  | 'VER_COMERCIAL'
  | 'VER_CLIENTES'
  | 'VER_CONTRATOS'
  | 'VER_LOTEAMENTOS'
  | 'VER_COBRANCAS'
  | 'VER_DOCUMENTOS'
  | 'VER_CRM'
  | 'VER_MOBILE'
  | 'VER_PORTAL_CLIENTE'
  | 'VER_PORTAL_CORRETOR'
  // Confinamento (transitorio): restringe o usuario ao modulo Financeiro.
  | 'SOMENTE_FINANCEIRO';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfilId: string;
  perfilNome: string;
  permissoes: Permissao[];
}

export interface RespostaDeLogin {
  token: string;
  usuario: Usuario;
}
