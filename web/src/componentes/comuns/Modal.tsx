import { useEffect } from 'react';
import type { ReactNode } from 'react';

interface Props {
  titulo: string;
  descricao?: string;
  largo?: boolean;
  aoFechar: () => void;
  rodape?: ReactNode;
  children: ReactNode;
}

export function Modal({ titulo, descricao, largo, aoFechar, rodape, children }: Props) {
  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') aoFechar();
    };
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [aoFechar]);

  return (
    <div
      className="sobreposicao"
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) aoFechar();
      }}
    >
      <div className={largo ? 'modal modal--largo' : 'modal'}>
        <header className="modal__cabecalho">
          <div>
            <h2>{titulo}</h2>
            {descricao && <div className="texto-suave">{descricao}</div>}
          </div>
          <button type="button" className="modal__fechar" onClick={aoFechar} aria-label="Fechar">
            ×
          </button>
        </header>
        <div className="modal__corpo">{children}</div>
        {rodape && <footer className="modal__rodape">{rodape}</footer>}
      </div>
    </div>
  );
}
