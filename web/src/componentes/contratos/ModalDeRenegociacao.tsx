import { useState } from 'react';
import { Modal } from '@/componentes/comuns/Modal';
import { CampoDeDinheiro, CampoDeSelecao, CampoDeTexto } from '@/componentes/comuns/Campo';
import { AvisoDeErro } from '@/componentes/comuns/Estados';
import { SelecaoDeParcelasDoAcordo } from './SelecaoDeParcelasDoAcordo';
import { PreviaDoAcordo, ResumoDoAcordo } from './PreviaDoAcordo';
import { useAcao } from '@/ganchos/useAcao';
import { useSelecao } from '@/ganchos/useSelecao';
import { renegociar } from '@/lib/api/contratos';
import { calcularSaldoRenegociado, montarPreviaDoAcordo } from '@/lib/renegociacao';
import { reaisParaCentavos } from '@/lib/dinheiro';
import { hojeIso } from '@/lib/datas';
import { rotularEnum } from '@/lib/formato';
import { PERIODICIDADES } from '@/tipos/comum';
import type { Periodicidade } from '@/tipos/comum';
import type { Parcela } from '@/tipos/parcela';

interface Props {
  contratoId: string;
  parcelasEmAberto: Parcela[];
  aoFechar: () => void;
  aoConcluir: () => void;
}

const OPCOES_DE_PERIODICIDADE = PERIODICIDADES.map((item) => ({
  valor: item,
  texto: rotularEnum(item),
}));

export function ModalDeRenegociacao({
  contratoId,
  parcelasEmAberto,
  aoFechar,
  aoConcluir,
}: Props) {
  const selecao = useSelecao(parcelasEmAberto.map((parcela) => parcela.id));
  const [incluirEncargos, definirIncluirEncargos] = useState(true);
  const [desconto, definirDesconto] = useState('0,00');
  const [entrada, definirEntrada] = useState('0,00');
  const [dataEntrada, definirDataEntrada] = useState('');
  const [quantidade, definirQuantidade] = useState('12');
  const [primeiroVencimento, definirPrimeiroVencimento] = useState('');
  const [periodicidade, definirPeriodicidade] = useState<Periodicidade>('MENSAL');
  const [acordadoEm, definirAcordadoEm] = useState(hojeIso);
  const [motivo, definirMotivo] = useState('');
  const acao = useAcao();

  const escolhidas = parcelasEmAberto.filter((parcela) => selecao.selecionadas.has(parcela.id));
  const saldo = calcularSaldoRenegociado(escolhidas, incluirEncargos);
  const descontoCentavos = reaisParaCentavos(desconto) ?? 0;
  const entradaCentavos = reaisParaCentavos(entrada) ?? 0;
  const previa = montarPreviaDoAcordo(
    saldo,
    descontoCentavos,
    entradaCentavos,
    Number(quantidade) || 0,
    primeiroVencimento,
    periodicidade,
  );

  async function confirmar() {
    const sucesso = await acao.executar(() =>
      renegociar(contratoId, {
        parcelaIds: escolhidas.map((parcela) => parcela.id),
        incluirEncargos,
        descontoCentavos,
        entradaCentavos,
        dataEntrada: dataEntrada || null,
        quantidadeDeParcelas: Number(quantidade) || 0,
        primeiroVencimento,
        periodicidade,
        acordadoEm,
        motivo: motivo.trim() || null,
      }),
    );
    if (sucesso) {
      aoConcluir();
      aoFechar();
    }
  }

  const pronto = escolhidas.length > 0 && Boolean(primeiroVencimento) && Number(quantidade) > 0;

  return (
    <Modal
      titulo="Renegociar parcelas"
      descricao="As parcelas escolhidas viram RENEGOCIADA e um novo plano é gerado"
      largo
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
            disabled={!pronto || acao.emAndamento}
          >
            {acao.emAndamento ? 'Registrando…' : 'Confirmar acordo'}
          </button>
        </>
      }
    >
      <AvisoDeErro mensagem={acao.erro} />

      <div>
        <div className="linha linha--entre" style={{ marginBottom: 6 }}>
          <strong>Parcelas em aberto</strong>
          <label className="linha" style={{ gap: 6 }}>
            <input
              type="checkbox"
              checked={incluirEncargos}
              onChange={() => definirIncluirEncargos((atual) => !atual)}
            />
            Incluir multa e juros no saldo
          </label>
        </div>
        <SelecaoDeParcelasDoAcordo
          parcelas={parcelasEmAberto}
          selecionadas={selecao.selecionadas}
          aoAlternar={selecao.alternar}
          aoAlternarTodas={selecao.alternarTodas}
        />
      </div>

      <ResumoDoAcordo
        saldoCentavos={saldo}
        descontoCentavos={descontoCentavos}
        entradaCentavos={entradaCentavos}
      />

      <div className="grade grade--3">
        <CampoDeDinheiro rotulo="Desconto (R$)" valor={desconto} aoMudar={definirDesconto} />
        <CampoDeDinheiro rotulo="Entrada (R$)" valor={entrada} aoMudar={definirEntrada} />
        <CampoDeTexto
          rotulo="Data da entrada"
          tipo="date"
          valor={dataEntrada}
          aoMudar={definirDataEntrada}
        />
        <CampoDeTexto
          rotulo="Qtde. de parcelas"
          tipo="number"
          valor={quantidade}
          aoMudar={definirQuantidade}
        />
        <CampoDeTexto
          rotulo="1º vencimento"
          tipo="date"
          valor={primeiroVencimento}
          aoMudar={definirPrimeiroVencimento}
        />
        <CampoDeSelecao
          rotulo="Periodicidade"
          valor={periodicidade}
          opcoes={OPCOES_DE_PERIODICIDADE}
          aoMudar={(valor) => definirPeriodicidade(valor as Periodicidade)}
          textoVazio="Selecione"
        />
        <CampoDeTexto
          rotulo="Acordado em"
          tipo="date"
          valor={acordadoEm}
          aoMudar={definirAcordadoEm}
        />
        <CampoDeTexto rotulo="Motivo" valor={motivo} aoMudar={definirMotivo} />
      </div>

      <div>
        <span className="campo__rotulo">Prévia estimada do novo plano</span>
        <PreviaDoAcordo parcelas={previa} />
      </div>
    </Modal>
  );
}
