import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { entrar as autenticar, buscarUsuarioAtual } from '@/lib/api/autenticacao';
import { definirTratadorDeSessaoExpirada } from '@/lib/http';
import {
  gravarToken,
  gravarUsuario,
  lerToken,
  lerUsuarioSalvo,
  limparSessao,
} from '@/lib/armazenamento';
import type { Usuario } from '@/tipos/usuario';

interface ValorDaAutenticacao {
  usuario: Usuario | null;
  autenticado: boolean;
  verificando: boolean;
  entrar: (email: string, senha: string) => Promise<void>;
  sair: () => void;
}

const Contexto = createContext<ValorDaAutenticacao | null>(null);

export function ProvedorDeAutenticacao({ children }: { children: ReactNode }) {
  /**
   * O usuário salvo só vale acompanhado do token.
   *
   * Sem esta guarda, um `localStorage` com usuário mas sem token deixaria o app
   * "autenticado": o guarda de rota liberaria as páginas, elas buscariam dados
   * sem `Authorization` e a API responderia 401 em laço. Quem manda é o token —
   * o usuário gravado é só um cache para evitar piscar a tela no recarregamento.
   */
  const [usuario, definirUsuario] = useState<Usuario | null>(() =>
    lerToken() ? lerUsuarioSalvo<Usuario>() : null,
  );
  const [verificando, definirVerificando] = useState<boolean>(() => Boolean(lerToken()));

  const sair = useCallback(() => {
    limparSessao();
    definirUsuario(null);
  }, []);

  useEffect(() => definirTratadorDeSessaoExpirada(() => definirUsuario(null)), []);

  useEffect(() => {
    if (!lerToken()) {
      definirVerificando(false);
      return;
    }
    const controlador = new AbortController();
    buscarUsuarioAtual(controlador.signal)
      .then((atual) => {
        gravarUsuario(atual);
        definirUsuario(atual);
      })
      .catch(() => {
        /* 401 já limpa a sessão no cliente HTTP */
      })
      .finally(() => {
        if (!controlador.signal.aborted) definirVerificando(false);
      });
    return () => controlador.abort();
  }, []);

  const entrar = useCallback(async (email: string, senha: string) => {
    const resposta = await autenticar(email, senha);
    gravarToken(resposta.token);
    gravarUsuario(resposta.usuario);
    definirUsuario(resposta.usuario);
  }, []);

  const valor = useMemo<ValorDaAutenticacao>(
    () => ({ usuario, autenticado: Boolean(usuario), verificando, entrar, sair }),
    [usuario, verificando, entrar, sair],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAutenticacao(): ValorDaAutenticacao {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('useAutenticacao exige o ProvedorDeAutenticacao acima na árvore.');
  return valor;
}

/** Permissoes efetivas do usuario logado — fonte unica para o gating do front. */
export function usePermissoes() {
  return useAutenticacao().usuario?.permissoes;
}
