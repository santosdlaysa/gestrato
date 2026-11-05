import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { TomDoSelo } from '@/lib/rotulos';

interface Props {
  rotulo: string;
  valor: string;
  detalhe?: ReactNode;
  tom?: TomDoSelo;
  /** Legenda em `title` para indicadores cuja definição não é óbvia. */
  titulo?: string;
  /** Cartão maior, para os poucos KPIs que abrem a página. */
  destaque?: boolean;
  /** Lista que compõe o número; o cartão inteiro vira link para ela. */
  destino?: string;
}

export function Indicador({
  rotulo,
  valor,
  detalhe,
  tom = 'neutro',
  titulo,
  destaque = false,
  destino,
}: Props) {
  const classe = `indicador indicador--${tom}${destaque ? ' indicador--destaque' : ''}`;
  const conteudo = (
    <>
      <div className="indicador__rotulo">{rotulo}</div>
      <div className="indicador__valor">{valor}</div>
      {detalhe && <div className="indicador__detalhe">{detalhe}</div>}
    </>
  );

  if (destino) {
    return (
      <Link className={`${classe} indicador--link`} to={destino} title={titulo ?? 'Ver detalhes'}>
        {conteudo}
      </Link>
    );
  }

  return (
    <div className={classe} title={titulo}>
      {conteudo}
    </div>
  );
}

interface PropsDaBarra {
  proporcao: number;
  tom?: 'vencido' | 'info' | 'ok' | 'atencao';
  titulo?: string;
}

/** Barra proporcional em CSS puro (0 a 1). */
export function BarraProporcional({ proporcao, tom = 'vencido', titulo }: PropsDaBarra) {
  const percentual = Math.max(0, Math.min(1, proporcao)) * 100;
  const modificador = tom === 'vencido' ? '' : ` barra__preenchimento--${tom}`;
  return (
    <div className="barra" title={titulo}>
      <div
        className={`barra__preenchimento${modificador}`}
        style={{ width: `${percentual.toFixed(1)}%` }}
      />
    </div>
  );
}
