import type { ReactNode } from 'react';
import { Painel } from '@/componentes/comuns/Painel';
import { ConteudoDaRequisicao } from '@/componentes/comuns/ConteudoDaRequisicao';
import { AvisoDeErro } from '@/componentes/comuns/Estados';
import { useAcao } from '@/ganchos/useAcao';
import { exportarRelatorioEmCsv } from '@/lib/api/relatorios';
import type { Parametros } from '@/lib/http';
import type { Requisicao } from '@/ganchos/useRequisicao';

interface Props<T> {
  titulo: string;
  descricao?: string;
  caminho: string;
  parametros: Parametros;
  filtros?: ReactNode;
  requisicao: Requisicao<T>;
  vazio: (dados: T) => boolean;
  children: (dados: T) => ReactNode;
}

export function PainelDeRelatorio<T>({
  titulo,
  descricao,
  caminho,
  parametros,
  filtros,
  requisicao,
  vazio,
  children,
}: Props<T>) {
  const exportacao = useAcao();

  return (
    <div className="pilha">
      {filtros && <Painel>{filtros}</Painel>}
      <AvisoDeErro mensagem={exportacao.erro} />
      <Painel
        titulo={titulo}
        descricao={descricao}
        semPreenchimento
        acoes={
          <button
            type="button"
            className="botao"
            disabled={exportacao.emAndamento}
            onClick={() => exportacao.executar(() => exportarRelatorioEmCsv(caminho, parametros))}
          >
            {exportacao.emAndamento ? 'Exportando…' : 'Exportar CSV'}
          </button>
        }
      >
        <ConteudoDaRequisicao
          requisicao={requisicao}
          vazio={vazio}
          tituloDoVazio="Sem dados"
          descricaoDoVazio="O relatório não retornou registros para os filtros informados."
        >
          {children}
        </ConteudoDaRequisicao>
      </Painel>
    </div>
  );
}
