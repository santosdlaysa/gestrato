import { formatarDinheiro } from '@/lib/formato';
import { Selo } from '@/componentes/comuns/Selo';

interface Props {
  totalDevidoCentavos: number;
  recebidoCentavos: number;
  descontoCentavos: number;
}

export function ResumoDaBaixa({
  totalDevidoCentavos,
  recebidoCentavos,
  descontoCentavos,
}: Props) {
  const saldo = totalDevidoCentavos - recebidoCentavos - descontoCentavos;
  const parcial = saldo > 0;
  const excedente = saldo < 0;

  return (
    <div className="demonstrativo">
      <div className="demonstrativo__linha">
        <span>Total devido</span>
        <span>{formatarDinheiro(totalDevidoCentavos)}</span>
      </div>
      <div className="demonstrativo__linha">
        <span>Valor recebido</span>
        <span className="texto-ok">{formatarDinheiro(recebidoCentavos)}</span>
      </div>
      <div className="demonstrativo__linha">
        <span>Desconto concedido</span>
        <span>{descontoCentavos > 0 ? `− ${formatarDinheiro(descontoCentavos)}` : formatarDinheiro(0)}</span>
      </div>
      <div className="demonstrativo__linha demonstrativo__linha--total">
        <span>
          {excedente ? 'Excedente' : 'Saldo restante'}{' '}
          {parcial && <Selo texto="Baixa parcial" tom="atencao" />}
          {!parcial && !excedente && <Selo texto="Quita a parcela" tom="ok" />}
        </span>
        <span className={parcial ? 'texto-atencao' : 'texto-ok'}>
          {formatarDinheiro(Math.abs(saldo))}
        </span>
      </div>
    </div>
  );
}
