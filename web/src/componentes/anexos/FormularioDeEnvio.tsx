import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Campo, CampoDeSelecao, CampoDeTexto } from '@/componentes/comuns/Campo';
import type { Opcao } from '@/componentes/comuns/Campo';
import { AvisoDeErro } from '@/componentes/comuns/Estados';
import { useAcao } from '@/ganchos/useAcao';
import { enviarAnexo } from '@/lib/api/anexos';
import { ACEITE_DO_SELETOR, formatarTamanho, validarArquivo } from '@/lib/anexo';
import type { EscopoDeAnexo } from '@/tipos/anexo';

interface Props {
  escopo: EscopoDeAnexo;
  donoId: string;
  categorias: Opcao[];
  aoEnviar: () => void;
}

export function FormularioDeEnvio({ escopo, donoId, categorias, aoEnviar }: Props) {
  const [arquivo, definirArquivo] = useState<File | null>(null);
  const [categoria, definirCategoria] = useState('');
  const [descricao, definirDescricao] = useState('');
  const [erroDoArquivo, definirErroDoArquivo] = useState<string | null>(null);
  const campoDeArquivo = useRef<HTMLInputElement>(null);
  const acao = useAcao();

  function selecionar(lista: FileList | null) {
    const escolhido = lista?.item(0) ?? null;
    definirArquivo(escolhido);
    definirErroDoArquivo(escolhido ? validarArquivo(escolhido) : null);
    acao.limparErro();
  }

  function limpar() {
    definirArquivo(null);
    definirCategoria('');
    definirDescricao('');
    definirErroDoArquivo(null);
    // O <input type="file"> não é controlado: sem limpar o valor, o nome do
    // arquivo já enviado continua visível na caixa de seleção.
    if (campoDeArquivo.current) campoDeArquivo.current.value = '';
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!arquivo || !categoria || erroDoArquivo) return;
    const sucesso = await acao.executar(() =>
      enviarAnexo(escopo, donoId, {
        arquivo,
        categoria,
        descricao: descricao.trim() || undefined,
      }),
    );
    if (!sucesso) return;
    limpar();
    aoEnviar();
  }

  const bloqueado = acao.emAndamento;
  const impedido = !arquivo || !categoria || Boolean(erroDoArquivo) || bloqueado;

  return (
    <form className="anexos__formulario" onSubmit={enviar}>
      <AvisoDeErro mensagem={acao.erro} />
      <div className="anexos__campos">
        <Campo
          rotulo="Arquivo"
          dica="PDF, JPEG, PNG ou WebP · até 10 MB"
          erro={erroDoArquivo}
        >
          {(id) => (
            <input
              id={id}
              ref={campoDeArquivo}
              type="file"
              accept={ACEITE_DO_SELETOR}
              disabled={bloqueado}
              onChange={(evento) => selecionar(evento.target.files)}
            />
          )}
        </Campo>
        <CampoDeSelecao
          rotulo="Categoria"
          valor={categoria}
          opcoes={categorias}
          aoMudar={definirCategoria}
          textoVazio="Selecione"
          desabilitado={bloqueado}
        />
        <CampoDeTexto
          rotulo="Descrição (opcional)"
          valor={descricao}
          aoMudar={definirDescricao}
          espacoReservado="Ex.: via assinada em cartório"
          desabilitado={bloqueado}
        />
      </div>
      <div className="anexos__envio">
        <span className="texto-suave">
          {bloqueado && arquivo
            ? `Enviando ${arquivo.name} (${formatarTamanho(arquivo.size)})…`
            : arquivo && !erroDoArquivo
              ? `${arquivo.name} · ${formatarTamanho(arquivo.size)}`
              : ''}
        </span>
        <button type="submit" className="botao botao--primario" disabled={impedido}>
          {bloqueado ? 'Enviando…' : 'Enviar documento'}
        </button>
      </div>
    </form>
  );
}
