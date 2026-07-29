import { useState } from 'react';
import { Modal } from '@/componentes/comuns/Modal';
import { CampoDeSelecao } from '@/componentes/comuns/Campo';
import { AvisoDeErro } from '@/componentes/comuns/Estados';
import { useAcao } from '@/ganchos/useAcao';
import { emitirDocumento, reemitirDocumento } from '@/lib/api/parcelas';
import { formatarDinheiro } from '@/lib/formato';
import { nomeDoCliente, numeroDoContrato, valorAtualizadoCentavos } from '@/lib/parcela';
import { TIPOS_DE_DOCUMENTO } from '@/tipos/parcela';
import type { DocumentoDeCobranca, ParcelaDeCobranca, TipoDeDocumento } from '@/tipos/parcela';

interface Props {
  parcela: ParcelaDeCobranca;
  aoFechar: () => void;
  aoConcluir: () => void;
}

const OPCOES = TIPOS_DE_DOCUMENTO.map((tipo) => ({
  valor: tipo,
  texto: tipo === 'BOLETO_COM_PIX' ? 'Boleto com Pix' : tipo === 'BOLETO' ? 'Boleto' : 'Pix',
}));

function LinhaCopiavel({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  if (!valor) return null;
  return (
    <div className="campo">
      <span className="campo__rotulo">{rotulo}</span>
      <div className="linha" style={{ alignItems: 'flex-start' }}>
        <code className="mono" style={{ flex: 1 }}>
          {valor}
        </code>
        <button
          type="button"
          className="botao botao--pequeno"
          onClick={() => void navigator.clipboard?.writeText(valor)}
        >
          Copiar
        </button>
      </div>
    </div>
  );
}

export function ModalDeDocumento({ parcela, aoFechar, aoConcluir }: Props) {
  const jaTemDocumento = Boolean(parcela.documentoVigente);
  const [tipo, definirTipo] = useState<TipoDeDocumento>('BOLETO_COM_PIX');
  const [emitido, definirEmitido] = useState<DocumentoDeCobranca | null>(
    parcela.documentoVigente ?? null,
  );
  const acao = useAcao();

  async function emitir() {
    const enviar = jaTemDocumento ? reemitirDocumento : emitirDocumento;
    await acao.executar(async () => {
      const documento = await enviar(parcela.id, tipo);
      definirEmitido(documento);
      aoConcluir();
    });
  }

  return (
    <Modal
      titulo={jaTemDocumento ? 'Reemitir documento' : 'Emitir documento'}
      descricao={`Parcela ${parcela.numero} · Contrato ${numeroDoContrato(parcela)} · ${nomeDoCliente(parcela)}`}
      aoFechar={aoFechar}
      rodape={
        <>
          <button type="button" className="botao" onClick={aoFechar}>
            Fechar
          </button>
          <button
            type="button"
            className="botao botao--primario"
            onClick={emitir}
            disabled={acao.emAndamento}
          >
            {acao.emAndamento ? 'Emitindo…' : jaTemDocumento ? 'Reemitir' : 'Emitir'}
          </button>
        </>
      }
    >
      <AvisoDeErro mensagem={acao.erro} />
      <div className="aviso aviso--info">
        Valor atualizado do documento: <strong>{formatarDinheiro(valorAtualizadoCentavos(parcela))}</strong>
        {jaTemDocumento && ' · o documento vigente será cancelado.'}
      </div>

      <CampoDeSelecao
        rotulo="Tipo de documento"
        valor={tipo}
        opcoes={OPCOES}
        aoMudar={(valor) => definirTipo(valor as TipoDeDocumento)}
        textoVazio="Selecione"
      />

      {emitido && (
        <div className="pilha" style={{ gap: 10 }}>
          <LinhaCopiavel rotulo="Linha digitável" valor={emitido.linhaDigitavel} />
          <LinhaCopiavel rotulo="Pix copia e cola" valor={emitido.pixCopiaECola} />
          {emitido.urlDoDocumento && (
            <a
              className="botao"
              href={emitido.urlDoDocumento}
              target="_blank"
              rel="noreferrer noopener"
            >
              Abrir documento
            </a>
          )}
        </div>
      )}
    </Modal>
  );
}
