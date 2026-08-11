import type { Permissao } from './usuario';

export interface UsuarioDeAcesso {
  id: string;
  nome: string;
  email: string;
  perfilId: string;
  perfilNome: string;
  ativo: boolean;
  ultimoAcesso: string | null;
  permissoes: Permissao[];
}

export interface PerfilDeAcesso {
  id: string;
  nome: string;
  descricao: string | null;
  sistema: boolean;
  usuariosVinculados: number;
  permissoes: Permissao[];
}

export interface PermissaoDeAcesso {
  id: Permissao;
  nome: string;
  /** Nomes dos perfis que reúnem esta permissão. */
  perfis: string[];
}
