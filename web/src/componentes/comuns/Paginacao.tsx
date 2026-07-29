import { formatarNumero } from '@/lib/formato';

interface Props {
  pagina: number;
  totalDePaginas: number;
  total: number;
  aoMudarPagina: (pagina: number) => void;
}

export function Paginacao({ pagina, totalDePaginas, total, aoMudarPagina }: Props) {
  const paginas = Math.max(totalDePaginas, 1);
  return (
    <div className="paginacao">
      <span>
        {formatarNumero(total)} registro{total === 1 ? '' : 's'} · página {pagina} de {paginas}
      </span>
      <div className="linha">
        <button
          type="button"
          className="botao botao--pequeno"
          disabled={pagina <= 1}
          onClick={() => aoMudarPagina(pagina - 1)}
        >
          ← Anterior
        </button>
        <button
          type="button"
          className="botao botao--pequeno"
          disabled={pagina >= paginas}
          onClick={() => aoMudarPagina(pagina + 1)}
        >
          Próxima →
        </button>
      </div>
    </div>
  );
}
