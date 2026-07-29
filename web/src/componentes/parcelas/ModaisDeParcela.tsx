import { ModalDeBaixa } from './ModalDeBaixa';
import { ModalDeCobranca } from './ModalDeCobranca';
import { ModalDeDocumento } from './ModalDeDocumento';
import type { ParcelaDeCobranca } from '@/tipos/parcela';

export type TipoDeModalDeParcela = 'baixa' | 'documento' | 'cobranca';

export interface AlvoDeModal {
  tipo: TipoDeModalDeParcela;
  parcela: ParcelaDeCobranca;
}

interface Props {
  alvo: AlvoDeModal | null;
  aoFechar: () => void;
  aoConcluir: () => void;
}

export function ModaisDeParcela({ alvo, aoFechar, aoConcluir }: Props) {
  if (!alvo) return null;

  if (alvo.tipo === 'baixa') {
    return (
      <ModalDeBaixa
        parcela={alvo.parcela}
        aoFechar={aoFechar}
        aoConcluir={() => {
          aoConcluir();
          aoFechar();
        }}
      />
    );
  }

  if (alvo.tipo === 'documento') {
    return <ModalDeDocumento parcela={alvo.parcela} aoFechar={aoFechar} aoConcluir={aoConcluir} />;
  }

  return (
    <ModalDeCobranca
      parcela={alvo.parcela}
      aoFechar={aoFechar}
      aoConcluir={() => {
        aoConcluir();
        aoFechar();
      }}
    />
  );
}
