import type { ReactNode } from 'react';

interface Props {
  titulo?: ReactNode;
  descricao?: ReactNode;
  acoes?: ReactNode;
  semPreenchimento?: boolean;
  rodape?: ReactNode;
  children: ReactNode;
}

export function Painel({
  titulo,
  descricao,
  acoes,
  semPreenchimento = false,
  rodape,
  children,
}: Props) {
  return (
    <section className="painel">
      {(titulo || acoes) && (
        <header className="painel__cabecalho">
          <div>
            {titulo && <h2>{titulo}</h2>}
            {descricao && <div className="texto-suave">{descricao}</div>}
          </div>
          {acoes && <div className="linha">{acoes}</div>}
        </header>
      )}
      {semPreenchimento ? children : <div className="painel__corpo">{children}</div>}
      {rodape && <footer className="painel__rodape">{rodape}</footer>}
    </section>
  );
}
