import type { Papel } from './usuario';

export interface UsuarioDeAcesso {
  id: string; nome: string; email: string; papel: Papel; ativo: boolean;
  ultimoAcesso: string | null; permissoes: string[];
}
export interface PerfilDeAcesso {
  id: Papel; nome: string; ativo: boolean; usuariosVinculados: number; permissoes: string[];
}
export interface PermissaoDeAcesso {
  id: string; nome: string; perfis: Papel[]; ativo: boolean;
}
