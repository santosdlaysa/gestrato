import { formatarDinheiro, formatarNumero } from '@/lib/formato';

interface Props {
  quantidade: number;
  valorCentavos: number;
  emAndamento: boolean;
  progresso: string | null;
  podeEmitir: boolean;
  podeCobrar: boolean;
  aoEmitirDocumentos: () => void;
  aoEnviarCobrancas: () => void;
  aoLimparSelecao: () => void;
}

export function AcoesEmLote({
  quantidade,
  valorCentavos,
  emAndamento,
  progresso,
  podeEmitir,
  podeCobrar,
  aoEmitirDocumentos,
  aoEnviarCobrancas,
  aoLimparSelecao,
}: Props) {
  if (quantidade === 0) return null;

  return (
    <div className="barra-de-lote">
      <span>
        <strong>{formatarNumero(quantidade)}</strong> parcela{quantidade === 1 ? '' : 's'}{' '}
        selecionada{quantidade === 1 ? '' : 's'} ·{' '}
        <strong>{formatarDinheiro(valorCentavos)}</strong> atualizado
        {progresso && <span className="texto-suave"> · {progresso}</span>}
      </span>
      <div className="linha">
        {podeEmitir && (
          <button
            type="button"
            className="botao botao--pequeno"
            onClick={aoEmitirDocumentos}
            disabled={emAndamento}
          >
            Emitir documentos
          </button>
        )}
        {podeCobrar && (
          <button
            type="button"
            className="botao botao--pequeno botao--primario"
            onClick={aoEnviarCobrancas}
            disabled={emAndamento}
          >
            Enviar cobrança
          </button>
        )}
        <button
          type="button"
          className="botao botao--pequeno"
          onClick={aoLimparSelecao}
          disabled={emAndamento}
        >
          Limpar seleção
        </button>
      </div>
    </div>
  );
}
