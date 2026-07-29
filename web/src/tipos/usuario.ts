export type Papel = 'ADMINISTRADOR' | 'FINANCEIRO' | 'VENDEDOR' | 'CONSULTA';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
}

export interface RespostaDeLogin {
  token: string;
  usuario: Usuario;
}
