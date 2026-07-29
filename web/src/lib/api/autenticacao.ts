import { requisitar } from '../http';
import type { RespostaDeLogin, Usuario } from '@/tipos/usuario';

export function entrar(email: string, senha: string): Promise<RespostaDeLogin> {
  return requisitar<RespostaDeLogin>('/auth/login', {
    metodo: 'POST',
    corpo: { email, senha },
  });
}

export function buscarUsuarioAtual(sinal?: AbortSignal): Promise<Usuario> {
  return requisitar<Usuario>('/auth/eu', { sinal });
}
