import { useState } from 'react';
import type { ReactNode } from 'react';
import { Painel } from '@/componentes/comuns/Painel';
import { ConteudoDaRequisicao } from '@/componentes/comuns/ConteudoDaRequisicao';
import { ModalDeConfirmacao } from '@/componentes/comuns/ModalDeConfirmacao';
import { AvisoDeErro } from '@/componentes/comuns/Estados';
import type { Opcao } from '@/componentes/comuns/Campo';
import { FormularioDeEnvio } from './FormularioDeEnvio';
import { TabelaDeAnexos } from './TabelaDeAnexos';
import { useRequisicao } from '@/ganchos/useRequisicao';
import { useAcao } from '@/ganchos/useAcao';
import { baixarAnexo, listarAnexos, removerAnexo } from '@/lib/api/anexos';
import { podeEnviarAnexo, podeRemoverAnexo } from '@/lib/permissoes';
import { usePermissoes } from '@/contextos/AutenticacaoContexto';
import type { Anexo, EscopoDeAnexo } from '@/tipos/anexo';

interface Props {
  escopo: EscopoDeAnexo;
  donoId: string;
  categorias: Opcao[];
  titulo?: string;
  descricao?: string;
  acoes?: ReactNode;
  filtroDeCategoria?: string[];
}

const TITULO_PADRAO: Record<EscopoDeAnexo, string> = {
  CLIENTE: 'Documentos do cliente',
  CONTRATO: 'Documentos do contrato',
};

export function PainelDeAnexos({ escopo, donoId, categorias, titulo, descricao, acoes, filtroDeCategoria }: Props) {
  const papel = usePermissoes();
  const [aRemover, definirARemover] = useState<Anexo | null>(null);
  const download = useAcao();
  const remocao = useAcao();

  const requisicao = useRequisicao((sinal) => listarAnexos(escopo, donoId, sinal), [escopo, donoId]);
  const filtrarAnexos = (itens: Anexo[]) =>
    filtroDeCategoria ? itens.filter((item) => filtroDeCategoria.includes(item.categoria)) : itens;

  async function confirmarRemocao() {
    if (!aRemover) return;
    const sucesso = await remocao.executar(() => removerAnexo(aRemover.id));
    if (!sucesso) return;
    definirARemover(null);
    requisicao.recarregar();
  }

  function abrirRemocao(anexo: Anexo) {
    remocao.limparErro();
    definirARemover(anexo);
  }

  return (
    <Painel titulo={titulo ?? TITULO_PADRAO[escopo]} descricao={descricao} acoes={acoes}>
      <div className="anexos">
        {podeEnviarAnexo(papel) && (
          <FormularioDeEnvio
            escopo={escopo}
            donoId={donoId}
            categorias={categorias}
            aoEnviar={requisicao.recarregar}
          />
        )}

        <AvisoDeErro mensagem={download.erro} />

        <ConteudoDaRequisicao
          requisicao={requisicao}
          vazio={(itens) => filtrarAnexos(itens).length === 0}
          tituloDoVazio="Sem documentos"
          descricaoDoVazio="Nenhum arquivo anexado até agora."
        >
          {(itens) => (
            <TabelaDeAnexos
              anexos={filtrarAnexos(itens)}
              podeRemover={podeRemoverAnexo(papel)}
              ocupado={download.emAndamento}
              aoBaixar={(anexo) => void download.executar(() => baixarAnexo(anexo))}
              aoRemover={abrirRemocao}
            />
          )}
        </ConteudoDaRequisicao>
      </div>

      {aRemover && (
        <ModalDeConfirmacao
          titulo="Remover documento"
          mensagem={`O arquivo "${aRemover.nomeOriginal}" será apagado definitivamente. Confirma a remoção?`}
          textoDeConfirmacao="Remover"
          perigo
          emAndamento={remocao.emAndamento}
          erro={remocao.erro}
          aoFechar={() => definirARemover(null)}
          aoConfirmar={confirmarRemocao}
        />
      )}
    </Painel>
  );
}
