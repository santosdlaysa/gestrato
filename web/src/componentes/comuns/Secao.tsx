import type { ReactNode } from 'react';

interface Props {
  titulo: string;
  descricao?: ReactNode;
  acoes?: ReactNode;
  children: ReactNode;
}

/**
 * Agrupa um trecho da página sob um título, criando a hierarquia que orienta a
 * leitura ("onde estou / o que olhar agora"). Mais leve que um Painel: não
 * desenha caixa, só separa e nomeia o bloco.
 */
export function Secao({ titulo, descricao, acoes, children }: Props) {
  return (
    <section className="secao">
      <header className="secao__cabecalho">
        <div>
          <h2 className="secao__titulo">{titulo}</h2>
          {descricao && <div className="secao__descricao">{descricao}</div>}
        </div>
        {acoes && <div className="linha">{acoes}</div>}
      </header>
      <div className="secao__corpo">{children}</div>
    </section>
  );
}
