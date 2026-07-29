import type { ReactNode } from 'react';

interface Props {
  titulo: string;
  descricao?: string;
  acoes?: ReactNode;
}

export function CabecalhoDaPagina({ titulo, descricao, acoes }: Props) {
  return (
    <header className="cabecalho-da-pagina">
      <div>
        <h1>{titulo}</h1>
        {descricao && <p className="cabecalho-da-pagina__descricao">{descricao}</p>}
      </div>
      {acoes && <div className="linha">{acoes}</div>}
    </header>
  );
}
