import { useEffect, useState } from 'react';
import { Painel } from '@/componentes/comuns/Painel';
import { Campo, CampoDeTexto } from '@/componentes/comuns/Campo';
import { AvisoDeErro, AvisoDeSucesso, EstadoVazio } from '@/componentes/comuns/Estados';
import { useAcao } from '@/ganchos/useAcao';
import { salvarModelo } from '@/lib/api/regua';
import { aplicarExemplos } from '@/lib/mensagens';
import { VARIAVEIS_DE_MENSAGEM } from '@/tipos/cobranca';
import type { ModeloDeMensagem } from '@/tipos/cobranca';

interface Props {
  modelos: ModeloDeMensagem[];
  somenteLeitura: boolean;
  aoSalvar: () => void;
}

export function EditorDeModelos({ modelos, somenteLeitura, aoSalvar }: Props) {
  const [chave, definirChave] = useState(modelos[0]?.chave ?? '');
  const [assunto, definirAssunto] = useState('');
  const [corpo, definirCorpo] = useState('');
  const [salvo, definirSalvo] = useState(false);
  const acao = useAcao();

  const selecionado = modelos.find((modelo) => modelo.chave === chave) ?? null;

  useEffect(() => {
    if (!selecionado) return;
    definirAssunto(selecionado.assunto ?? '');
    definirCorpo(selecionado.corpo ?? '');
    definirSalvo(false);
  }, [selecionado]);

  if (modelos.length === 0) {
    return (
      <Painel titulo="Modelos de mensagem">
        <EstadoVazio
          titulo="Nenhum modelo cadastrado"
          descricao="A API não retornou modelos de mensagem."
        />
      </Painel>
    );
  }

  async function salvar() {
    const sucesso = await acao.executar(() => salvarModelo(chave, { assunto, corpo }));
    if (sucesso) {
      definirSalvo(true);
      aoSalvar();
    }
  }

  function inserirVariavel(variavel: string) {
    definirCorpo((atual) => `${atual}{{${variavel}}}`);
  }

  return (
    <Painel
      titulo="Modelos de mensagem"
      descricao="Conteúdo enviado em cada etapa da régua"
      acoes={
        !somenteLeitura && (
          <button
            type="button"
            className="botao botao--primario"
            onClick={salvar}
            disabled={acao.emAndamento || !corpo.trim()}
          >
            {acao.emAndamento ? 'Salvando…' : 'Salvar modelo'}
          </button>
        )
      }
    >
      <div className="pilha" style={{ gap: 12 }}>
        <AvisoDeErro mensagem={acao.erro} />
        <AvisoDeSucesso mensagem={salvo ? 'Modelo salvo.' : null} />

        <div className="grade grade--2">
          <Campo rotulo="Modelo">
            {(id) => (
              <select id={id} value={chave} onChange={(evento) => definirChave(evento.target.value)}>
                {modelos.map((modelo) => (
                  <option key={modelo.chave} value={modelo.chave}>
                    {modelo.nome ?? modelo.chave}
                  </option>
                ))}
              </select>
            )}
          </Campo>
          <CampoDeTexto
            rotulo="Assunto (e-mail)"
            valor={assunto}
            aoMudar={definirAssunto}
            desabilitado={somenteLeitura}
          />
        </div>

        <Campo rotulo="Corpo da mensagem">
          {(id) => (
            <textarea
              id={id}
              value={corpo}
              disabled={somenteLeitura}
              onChange={(evento) => definirCorpo(evento.target.value)}
            />
          )}
        </Campo>

        <div className="campo">
          <span className="campo__rotulo">Variáveis disponíveis</span>
          <div className="variaveis">
            {VARIAVEIS_DE_MENSAGEM.map((variavel) => (
              <button
                key={variavel}
                type="button"
                className="variavel"
                disabled={somenteLeitura}
                onClick={() => inserirVariavel(variavel)}
              >
                {`{{${variavel}}}`}
              </button>
            ))}
          </div>
        </div>

        <div className="campo">
          <span className="campo__rotulo">Prévia com dados de exemplo</span>
          <div className="previa">{aplicarExemplos(corpo) || 'Escreva o corpo da mensagem.'}</div>
        </div>
      </div>
    </Painel>
  );
}
