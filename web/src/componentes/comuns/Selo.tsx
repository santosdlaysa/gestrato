import type { TomDoSelo } from '@/lib/rotulos';

interface Props {
  texto: string;
  tom?: TomDoSelo;
  titulo?: string;
}

export function Selo({ texto, tom = 'neutro', titulo }: Props) {
  return (
    <span className={`selo selo--${tom}`} title={titulo}>
      {texto}
    </span>
  );
}
