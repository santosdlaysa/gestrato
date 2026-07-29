import { useEffect, useState } from 'react';
import { Painel } from '@/componentes/comuns/Painel';
import { CampoDeTexto } from '@/componentes/comuns/Campo';
import { AvisoDeErro, AvisoDeSucesso, EstadoDeCarregamento } from '@/componentes/comuns/Estados';
import { EscalaDeSituacoes } from './EscalaDeSituacoes';
import { useRequisicao } from '@/ganchos/useRequisicao';
import { useAcao } from '@/ganchos/useAcao';
import { buscarPolitica, salvarPolitica } from '@/lib/api/politica';
import { AVISO_DE_RETOMADA_MANUAL, descreverEscala } from '@/lib/politica';
import type { PoliticaDeInadimplencia as Politica } from '@/tipos/politica';

function paraNumero(texto: string): number {
  const valor = Number(texto);
  return Number.isFinite(valor) ? valor : 0;
}

export function PoliticaDeInadimplencia({ editavel }: { editavel: boolean }) {
  const requisicao = useRequisicao((sinal) => buscarPolitica(sinal), []);
  const [inadimplencia, definirInadimplencia] = useState('');
  const [retomada, definirRetomada] = useState('');
  const [salvo, definirSalvo] = useState(false);
  const acao = useAcao();

  useEffect(() => {
    if (!requisicao.dados) return;
    definirInadimplencia(String(requisicao.dados.diasParaInadimplencia ?? ''));
    definirRetomada(String(requisicao.dados.diasParaRetomadaDoLote ?? ''));
    definirSalvo(false);
  }, [requisicao.dados]);

  const editada: Politica = {
    diasParaInadimplencia: paraNumero(inadimplencia),
    diasParaRetomadaDoLote: paraNumero(retomada),
  };
  const frase = descreverEscala(editada);

  async function salvar() {
    const sucesso = await acao.executar(() => salvarPolitica(editada));
    if (sucesso) {
      definirSalvo(true);
      requisicao.recarregar();
    }
  }

  return (
    <Painel
      titulo="Política de inadimplência"
      descricao="Define a partir de quantos dias de atraso o contrato muda de situação"
      acoes={
        editavel && (
          <button
            type="button"
            className="botao botao--primario"
            onClick={salvar}
            disabled={acao.emAndamento}
          >
            {acao.emAndamento ? 'Salvando…' : 'Salvar política'}
          </button>
        )
      }
    >
      {requisicao.carregando && !requisicao.dados ? (
        <EstadoDeCarregamento mensagem="Carregando política…" />
      ) : (
        <div className="pilha" style={{ gap: 12 }}>
          <AvisoDeErro mensagem={acao.erro ?? requisicao.erro} />
          <AvisoDeSucesso mensagem={salvo ? 'Política atualizada.' : null} />

          <div className="grade grade--2">
            <CampoDeTexto
              rotulo="Considerar inadimplente a partir de (dias de atraso)"
              tipo="number"
              valor={inadimplencia}
              aoMudar={(valor) => {
                definirInadimplencia(valor);
                definirSalvo(false);
              }}
              desabilitado={!editavel}
            />
            <CampoDeTexto
              rotulo="Lote sujeito a retomada a partir de (dias de atraso)"
              tipo="number"
              valor={retomada}
              aoMudar={(valor) => {
                definirRetomada(valor);
                definirSalvo(false);
              }}
              desabilitado={!editavel}
            />
          </div>

          {frase ? (
            <div className="aviso aviso--info">{frase}</div>
          ) : (
            <div className="aviso aviso--erro">
              A retomada precisa vir depois do prazo de inadimplência para a escala fazer sentido.
            </div>
          )}

          <EscalaDeSituacoes politica={editada} />

          <p className="texto-fraco" style={{ margin: 0 }}>
            {AVISO_DE_RETOMADA_MANUAL}
          </p>
        </div>
      )}
    </Painel>
  );
}
