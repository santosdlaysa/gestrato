import { useState } from 'react';
import { Modal } from '@/componentes/comuns/Modal';
import { CampoDeTexto } from '@/componentes/comuns/Campo';
import { AvisoDeErro } from '@/componentes/comuns/Estados';
import { useAcao } from '@/ganchos/useAcao';
import { atualizarFornecedor, criarFornecedor } from '@/lib/api/contas-a-pagar';
import type { EntradaDeFornecedor, Fornecedor } from '@/tipos/contas-a-pagar';

interface Props {
  fornecedor: Fornecedor | null;
  aoFechar: () => void;
  aoConcluir: () => void;
}

export function ModalDeFornecedor({ fornecedor, aoFechar, aoConcluir }: Props) {
  const [dados, definirDados] = useState<EntradaDeFornecedor>({
    nome: fornecedor?.nome ?? '',
    documento: fornecedor?.documento ?? '',
    email: fornecedor?.email ?? '',
    telefone: fornecedor?.telefone ?? '',
    ativo: fornecedor?.ativo ?? true,
    observacoes: fornecedor?.observacoes ?? '',
  });
  const acao = useAcao();
  const atualizar = <K extends keyof EntradaDeFornecedor>(campo: K, valor: EntradaDeFornecedor[K]) =>
    definirDados((atual) => ({ ...atual, [campo]: valor }));

  async function salvar() {
    const sucesso = await acao.executar(() =>
      fornecedor ? atualizarFornecedor(fornecedor.id, dados) : criarFornecedor(dados),
    );
    if (sucesso) {
      aoConcluir();
      aoFechar();
    }
  }

  return (
    <Modal
      titulo={`${fornecedor ? 'Editar' : 'Novo'} fornecedor`}
      aoFechar={aoFechar}
      rodape={<><button type="button" className="botao" onClick={aoFechar}>Cancelar</button><button type="button" className="botao botao--primario" onClick={salvar} disabled={acao.emAndamento || !dados.nome.trim()}>Salvar</button></>}
    >
      <AvisoDeErro mensagem={acao.erro} />
      <div className="grade grade--2">
        <CampoDeTexto rotulo="Nome" valor={dados.nome} aoMudar={(valor) => atualizar('nome', valor)} />
        <CampoDeTexto rotulo="Documento" valor={dados.documento ?? ''} aoMudar={(valor) => atualizar('documento', valor)} />
        <CampoDeTexto rotulo="E-mail" tipo="email" valor={dados.email ?? ''} aoMudar={(valor) => atualizar('email', valor)} />
        <CampoDeTexto rotulo="Telefone" valor={dados.telefone ?? ''} aoMudar={(valor) => atualizar('telefone', valor)} />
      </div>
      <CampoDeTexto rotulo="Observações" valor={dados.observacoes ?? ''} aoMudar={(valor) => atualizar('observacoes', valor)} />
      <label className="linha" style={{ gap: 6 }}><input type="checkbox" checked={dados.ativo} onChange={() => atualizar('ativo', !dados.ativo)} /> Ativo</label>
    </Modal>
  );
}
