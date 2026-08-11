import { requisitar } from '@/lib/http';
import type { UsuarioDeAcesso, PerfilDeAcesso, PermissaoDeAcesso } from '@/tipos/acesso';
import type { Permissao } from '@/tipos/usuario';

export interface EntradaDeUsuario {
  nome: string;
  email: string;
  perfilId: string;
  senha?: string;
  ativo?: boolean;
}

export interface EntradaDePerfil {
  nome: string;
  descricao?: string | null;
  permissoes: Permissao[];
}

// ------------------------------------------------------------- usuarios

export function listarUsuarios(sinal?: AbortSignal): Promise<UsuarioDeAcesso[]> {
  return requisitar('/usuarios', { sinal });
}
export function criarUsuario(entrada: EntradaDeUsuario): Promise<UsuarioDeAcesso> {
  return requisitar('/usuarios', { metodo: 'POST', corpo: entrada });
}
export function atualizarUsuario(id: string, entrada: EntradaDeUsuario): Promise<UsuarioDeAcesso> {
  return requisitar(`/usuarios/${id}`, { metodo: 'PUT', corpo: entrada });
}
export function redefinirSenha(id: string, senha: string): Promise<unknown> {
  return requisitar(`/usuarios/${id}/senha`, { metodo: 'PUT', corpo: { senha } });
}
export function excluirUsuario(id: string): Promise<unknown> {
  return requisitar(`/usuarios/${id}`, { metodo: 'DELETE' });
}

// --------------------------------------------------------------- perfis

export function listarPerfis(sinal?: AbortSignal): Promise<PerfilDeAcesso[]> {
  return requisitar('/perfis', { sinal });
}
export function criarPerfil(entrada: EntradaDePerfil): Promise<PerfilDeAcesso> {
  return requisitar('/perfis', { metodo: 'POST', corpo: entrada });
}
export function atualizarPerfil(id: string, entrada: EntradaDePerfil): Promise<PerfilDeAcesso> {
  return requisitar(`/perfis/${id}`, { metodo: 'PUT', corpo: entrada });
}
export function excluirPerfil(id: string): Promise<unknown> {
  return requisitar(`/perfis/${id}`, { metodo: 'DELETE' });
}

// ----------------------------------------------------------- permissoes

export function listarPermissoes(sinal?: AbortSignal): Promise<PermissaoDeAcesso[]> {
  return requisitar('/permissoes', { sinal });
}
