import { Link } from 'react-router-dom';
import { Painel } from '@/componentes/comuns/Painel';
import { formatarDinheiro, formatarNumero } from '@/lib/formato';
import type { BlocoDeParcelas } from '@/tipos/dashboard';

interface PropsDoBloco {
  titulo: string;
  bloco: BlocoDeParcelas | undefined;
  destino: string;
  tom: 'vencido' | 'atencao' | 'neutro';
}

function Bloco({ titulo, bloco, destino, tom }: PropsDoBloco) {
  const classeDoValor =
    tom === 'vencido' ? 'texto-vencido' : tom === 'atencao' ? 'texto-atencao' : '';

  return (
    <Painel
      titulo={titulo}
      acoes={
        <Link className="botao botao--pequeno" to={destino}>
          Abrir na cobrança
        </Link>
      }
    >
      <div className="linha linha--entre">
        <div>
          <div className="definicao__rotulo">Parcelas</div>
          <div className="definicao__valor">{formatarNumero(bloco?.quantidade ?? 0)}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="definicao__rotulo">Valor</div>
          <div className={`definicao__valor ${classeDoValor}`}>
            {formatarDinheiro(bloco?.valorCentavos ?? 0)}
          </div>
        </div>
      </div>
    </Painel>
  );
}

interface Props {
  vencemHoje: BlocoDeParcelas | undefined;
  vencidas: BlocoDeParcelas | undefined;
  proximos7Dias: BlocoDeParcelas | undefined;
}

export function BlocosDeVencimento({ vencemHoje, vencidas, proximos7Dias }: Props) {
  return (
    <div className="grade grade--3">
      <Bloco
        titulo="Vencidas"
        bloco={vencidas}
        destino="/parcelas?situacao=VENCIDA"
        tom="vencido"
      />
      <Bloco
        titulo="Vencem hoje"
        bloco={vencemHoje}
        destino="/parcelas?situacao=VENCE_HOJE"
        tom="atencao"
      />
      <Bloco
        titulo="Próximos 7 dias"
        bloco={proximos7Dias}
        destino="/parcelas?situacao=A_VENCER"
        tom="neutro"
      />
    </div>
  );
}
