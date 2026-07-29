import { useState } from 'react';
import { Modal } from '@/componentes/comuns/Modal';
import { CampoDeDinheiro, CampoDeSelecao, CampoDeTexto } from '@/componentes/comuns/Campo';
import { AvisoDeErro } from '@/componentes/comuns/Estados';
import { Demonstrativo } from './Demonstrativo';
import { ResumoDaBaixa } from './ResumoDaBaixa';
import { useAcao } from '@/ganchos/useAcao';
import { darBaixa } from '@/lib/api/parcelas';
import { centavosParaCampo } from '@/lib/formato';
import { reaisParaCentavos } from '@/lib/dinheiro';
import { hojeIso } from '@/lib/datas';
import { nomeDoCliente, numeroDoContrato } from '@/lib/parcela';
import { FORMAS_DE_PAGAMENTO } from '@/tipos/comum';
import type { ParcelaDeCobranca } from '@/tipos/parcela';

interface Props {
  parcela: ParcelaDeCobranca;
  aoFechar: () => void;
  aoConcluir: () => void;
}

const OPCOES_DE_PAGAMENTO = FORMAS_DE_PAGAMENTO.map((forma) => ({
  valor: forma,
  texto: forma.charAt(0) + forma.slice(1).toLowerCase(),
}));

function emCentavos(texto: string): number {
  return reaisParaCentavos(texto) ?? 0;
}

export function ModalDeBaixa({ parcela, aoFechar, aoConcluir }: Props) {
  const demonstrativo = parcela.demonstrativo;
  const totalDevido = demonstrativo?.totalCentavos ?? parcela.valorOriginalCentavos;

  const [principal, definirPrincipal] = useState(() =>
    centavosParaCampo(demonstrativo?.saldoPrincipalCentavos ?? parcela.valorOriginalCentavos),
  );
  const [juros, definirJuros] = useState(() => centavosParaCampo(demonstrativo?.jurosCentavos ?? 0));
  const [multa, definirMulta] = useState(() => centavosParaCampo(demonstrativo?.multaCentavos ?? 0));
  const [desconto, definirDesconto] = useState('0,00');
  const [pagoEm, definirPagoEm] = useState(hojeIso);
  const [formaPagamento, definirFormaPagamento] = useState('PIX');
  const [observacoes, definirObservacoes] = useState('');

  const acao = useAcao();
  const recebido = emCentavos(principal) + emCentavos(juros) + emCentavos(multa);

  async function confirmar() {
    const sucesso = await acao.executar(() =>
      darBaixa(parcela.id, {
        valorPrincipalCentavos: emCentavos(principal),
        valorJurosCentavos: emCentavos(juros),
        valorMultaCentavos: emCentavos(multa),
        valorDescontoCentavos: emCentavos(desconto),
        pagoEm,
        formaPagamento,
        observacoes: observacoes.trim() || null,
      }),
    );
    if (sucesso) aoConcluir();
  }

  return (
    <Modal
      titulo={`Baixa da parcela ${parcela.numero}`}
      descricao={`Contrato ${numeroDoContrato(parcela)} · ${nomeDoCliente(parcela)}`}
      aoFechar={aoFechar}
      rodape={
        <>
          <button type="button" className="botao" onClick={aoFechar} disabled={acao.emAndamento}>
            Cancelar
          </button>
          <button
            type="button"
            className="botao botao--primario"
            onClick={confirmar}
            disabled={acao.emAndamento || recebido <= 0}
          >
            {acao.emAndamento ? 'Registrando…' : 'Confirmar baixa'}
          </button>
        </>
      }
    >
      <AvisoDeErro mensagem={acao.erro} />
      <Demonstrativo
        demonstrativo={demonstrativo}
        valorOriginalCentavos={parcela.valorOriginalCentavos}
      />

      <div className="grade grade--2">
        <CampoDeDinheiro rotulo="Principal (R$)" valor={principal} aoMudar={definirPrincipal} />
        <CampoDeDinheiro rotulo="Juros (R$)" valor={juros} aoMudar={definirJuros} />
        <CampoDeDinheiro rotulo="Multa (R$)" valor={multa} aoMudar={definirMulta} />
        <CampoDeDinheiro rotulo="Desconto (R$)" valor={desconto} aoMudar={definirDesconto} />
        <CampoDeTexto rotulo="Pago em" tipo="date" valor={pagoEm} aoMudar={definirPagoEm} />
        <CampoDeSelecao
          rotulo="Forma de pagamento"
          valor={formaPagamento}
          opcoes={OPCOES_DE_PAGAMENTO}
          aoMudar={definirFormaPagamento}
          textoVazio="Selecione"
        />
      </div>

      <CampoDeTexto
        rotulo="Observações"
        valor={observacoes}
        aoMudar={definirObservacoes}
        espacoReservado="Ex.: comprovante enviado no WhatsApp"
      />

      <ResumoDaBaixa
        totalDevidoCentavos={totalDevido}
        recebidoCentavos={recebido}
        descontoCentavos={emCentavos(desconto)}
      />
    </Modal>
  );
}
