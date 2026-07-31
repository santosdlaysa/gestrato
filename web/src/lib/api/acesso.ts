import { requisitar } from '@/lib/http';
import type { UsuarioDeAcesso, PerfilDeAcesso, PermissaoDeAcesso } from '@/tipos/acesso';
import type { Papel } from '@/tipos/usuario';

export interface EntradaDeUsuario {
  nome: string; email: string; papel: Papel; senha?: string; ativo?: boolean;
}
export function listarUsuarios(sinal?: AbortSignal): Promise<UsuarioDeAcesso[]> { return requisitar('/usuarios', { sinal }); }
export function criarUsuario(entrada: EntradaDeUsuario): Promise<UsuarioDeAcesso> { return requisitar('/usuarios', { metodo: 'POST', corpo: entrada }); }
export function atualizarUsuario(id: string, entrada: EntradaDeUsuario): Promise<UsuarioDeAcesso> { return requisitar(`/usuarios/${id}`, { metodo: 'PUT', corpo: entrada }); }
export function listarPerfis(sinal?: AbortSignal): Promise<PerfilDeAcesso[]> { return requisitar('/perfis', { sinal }); }
export function listarPermissoes(sinal?: AbortSignal): Promise<PermissaoDeAcesso[]> { return requisitar('/permissoes', { sinal }); }
