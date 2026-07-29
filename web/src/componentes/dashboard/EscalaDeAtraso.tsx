import { Painel } from '@/componentes/comuns/Painel';
import { Indicador } from '@/componentes/comuns/Indicador';
import { formatarNumero } from '@/lib/formato';
import { criterioDoDegrau } from '@/lib/politica';
import type { DegrauDeAtraso } from '@/lib/politica';
import type { Dashboard } from '@/tipos/dashboard';

interface Degrau {
  chave: DegrauDeAtraso;
  rotulo: string;
  tom: 'atencao' | 'vencido' | 'critico';
  contagem: (dados: Dashboard) => number | undefined;
}

const DEGRAUS: Degrau[] = [
  {
    chave: 'EM_ATRASO',
    rotulo: 'Em atraso',
    tom: 'atencao',
    contagem: (dados) => dados.contratosEmAtraso,
  },
  {
    chave: 'INADIMPLENTE',
    rotulo: 'Inadimplentes',
    tom: 'vencido',
    contagem: (dados) => dados.contratosInadimplentes,
  },
  {
    chave: 'SUJEITO_A_RETOMADA',
    rotulo: 'Sujeitos a retomada',
    tom: 'critico',
    contagem: (dados) => dados.contratosSujeitosARetomada,
  },
];

export function EscalaDeAtraso({ dados }: { dados: Dashboard }) {
  const politica = dados.politicaDeInadimplencia;

  return (
    <Painel
      titulo="Escala de atraso"
      descricao="Contratos por degrau da política vigente"
    >
      <div className="grade grade--3">
        {DEGRAUS.map((degrau) => (
          <Indicador
            key={degrau.chave}
            rotulo={degrau.rotulo}
            valor={formatarNumero(degrau.contagem(dados) ?? 0)}
            detalhe={criterioDoDegrau(degrau.chave, politica)}
            tom={degrau.tom}
          />
        ))}
      </div>
    </Painel>
  );
}
