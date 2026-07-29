import { useState } from 'react';
import { Modal } from '@/componentes/comuns/Modal';
import { CampoDeDinheiro, CampoDeSelecao, CampoDeTexto } from '@/componentes/comuns/Campo';
import type { Opcao } from '@/componentes/comuns/Campo';
import { AvisoDeErro } from '@/componentes/comuns/Estados';
import { useAcao } from '@/ganchos/useAcao';
import { atualizarLote, criarLote } from '@/lib/api/cadastros';
import { reaisParaCentavos } from '@/lib/dinheiro';
import { centavosParaCampo, rotularEnum } from '@/lib/formato';
import { SITUACOES_DO_LOTE } from '@/tipos/cadastros';
import type { Lote, SituacaoDoLote } from '@/tipos/cadastros';

interface Props {
  lote: Lote | null;
  loteamentos: Opcao[];
  aoFechar: () => void;
  aoConcluir: () => void;
}

const OPCOES_DE_SITUACAO = SITUACOES_DO_LOTE.map((situacao) => ({
  valor: situacao,
  texto: rotularEnum(situacao),
}));

export function ModalDeLote({ lote, loteamentos, aoFechar, aoConcluir }: Props) {
  const [loteamentoId, definirLoteamentoId] = useState(lote?.loteamentoId ?? '');
  const [numero, definirNumero] = useState(lote?.numero ?? '');
  const [quadra, definirQuadra] = useState(lote?.quadra ?? '');
  const [area, definirArea] = useState(String(lote?.areaEmMetrosQuadrados ?? ''));
  const [valor, definirValor] = useState(centavosParaCampo(lote?.valorDeTabelaCentavos ?? 0));
  const [situacao, definirSituacao] = useState<SituacaoDoLote>(lote?.situacao ?? 'DISPONIVEL');
  const [descricao, definirDescricao] = useState(lote?.descricao ?? '');
  const acao = useAcao();

  async function salvar() {
    const corpo: Partial<Lote> = {
      loteamentoId: loteamentoId || null,
      numero,
      quadra: quadra || null,
      areaEmMetrosQuadrados: area ? Number(area.replace(',', '.')) : null,
      valorDeTabelaCentavos: reaisParaCentavos(valor) ?? 0,
      situacao,
      descricao: descricao.trim() || null,
    };
    const sucesso = await acao.executar(() =>
      lote ? atualizarLote(lote.id, corpo) : criarLote(corpo),
    );
    if (sucesso) {
      aoConcluir();
      aoFechar();
    }
  }

  return (
    <Modal
      titulo={lote ? 'Editar lote' : 'Novo lote'}
      aoFechar={aoFechar}
      rodape={
        <>
          <button type="button" className="botao" onClick={aoFechar} disabled={acao.emAndamento}>
            Cancelar
          </button>
          <button
            type="button"
            className="botao botao--primario"
            onClick={salvar}
            disabled={acao.emAndamento || !numero.trim()}
          >
            {acao.emAndamento ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <AvisoDeErro mensagem={acao.erro} />
      <div className="grade grade--2">
        <CampoDeSelecao
          rotulo="Loteamento"
          valor={loteamentoId}
          opcoes={loteamentos}
          aoMudar={definirLoteamentoId}
          textoVazio="Selecione"
        />
        <CampoDeTexto rotulo="Quadra" valor={quadra} aoMudar={definirQuadra} />
        <CampoDeTexto rotulo="Número do lote" valor={numero} aoMudar={definirNumero} />
        <CampoDeTexto rotulo="Área (m²)" valor={area} aoMudar={definirArea} />
        <CampoDeDinheiro rotulo="Valor de tabela (R$)" valor={valor} aoMudar={definirValor} />
        <CampoDeSelecao
          rotulo="Situação"
          valor={situacao}
          opcoes={OPCOES_DE_SITUACAO}
          aoMudar={(item) => definirSituacao(item as SituacaoDoLote)}
          textoVazio="Selecione"
        />
      </div>
      <CampoDeTexto rotulo="Descrição" valor={descricao} aoMudar={definirDescricao} />
    </Modal>
  );
}
