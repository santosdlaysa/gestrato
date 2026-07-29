import { useCallback, useState } from 'react';

export interface OperacaoEmLote {
  executar: (ids: string[], tarefa: (id: string) => Promise<unknown>, rotulo: string) => Promise<void>;
  emAndamento: boolean;
  progresso: string | null;
  erro: string | null;
}

/**
 * Roda a mesma operação sobre vários ids em série — evita rajadas contra a API
 * e permite mostrar o progresso item a item.
 */
export function useLote(): OperacaoEmLote {
  const [emAndamento, definirEmAndamento] = useState(false);
  const [progresso, definirProgresso] = useState<string | null>(null);
  const [erro, definirErro] = useState<string | null>(null);

  const executar = useCallback(
    async (ids: string[], tarefa: (id: string) => Promise<unknown>, rotulo: string) => {
      definirEmAndamento(true);
      definirErro(null);
      let concluidas = 0;
      let falhas = 0;

      for (const id of ids) {
        definirProgresso(`${rotulo}: ${concluidas + falhas + 1} de ${ids.length}`);
        try {
          await tarefa(id);
          concluidas += 1;
        } catch {
          falhas += 1;
        }
      }

      definirEmAndamento(false);
      definirProgresso(`${rotulo}: ${concluidas} concluída(s), ${falhas} falha(s)`);
      if (falhas > 0) definirErro(`${falhas} operação(ões) falharam. Verifique o histórico.`);
    },
    [],
  );

  return { executar, emAndamento, progresso, erro };
}
