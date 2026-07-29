const CHAVE_DO_TOKEN = 'gestrato.token';
const CHAVE_DO_USUARIO = 'gestrato.usuario';

export function lerToken(): string | null {
  return localStorage.getItem(CHAVE_DO_TOKEN);
}

export function gravarToken(token: string): void {
  localStorage.setItem(CHAVE_DO_TOKEN, token);
}

export function lerUsuarioSalvo<T>(): T | null {
  const bruto = localStorage.getItem(CHAVE_DO_USUARIO);
  if (!bruto) return null;
  try {
    return JSON.parse(bruto) as T;
  } catch {
    return null;
  }
}

export function gravarUsuario(usuario: unknown): void {
  localStorage.setItem(CHAVE_DO_USUARIO, JSON.stringify(usuario));
}

export function limparSessao(): void {
  localStorage.removeItem(CHAVE_DO_TOKEN);
  localStorage.removeItem(CHAVE_DO_USUARIO);
}
