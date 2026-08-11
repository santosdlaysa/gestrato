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
  | 'GERIR_USUARIOS';

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
