import { useCallback, useState } from 'react';
import { mensagemDeErro } from '@/lib/http';

export interface Acao {
  executar: (tarefa: () => Promise<unknown>) => Promise<boolean>;
  emAndamento: boolean;
  erro: string | null;
  limparErro: () => void;
}

/** Estado compartilhado de operações de escrita (POST/PUT) disparadas por botões. */
export function useAcao(): Acao {
  const [emAndamento, definirEmAndamento] = useState(false);
  const [erro, definirErro] = useState<string | null>(null);

  const executar = useCallback(async (tarefa: () => Promise<unknown>) => {
    definirEmAndamento(true);
    definirErro(null);
    try {
      await tarefa();
      return true;
    } catch (falha: unknown) {
      definirErro(mensagemDeErro(falha));
      return false;
    } finally {
      definirEmAndamento(false);
    }
  }, []);

  const limparErro = useCallback(() => definirErro(null), []);

  return { executar, emAndamento, erro, limparErro };
}
