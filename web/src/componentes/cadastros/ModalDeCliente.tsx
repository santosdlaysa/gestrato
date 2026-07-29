import { useState } from 'react';
import { Modal } from '@/componentes/comuns/Modal';
import { CampoDeSelecao, CampoDeTexto } from '@/componentes/comuns/Campo';
import { AvisoDeErro } from '@/componentes/comuns/Estados';
import { useAcao } from '@/ganchos/useAcao';
import { atualizarCliente, criarCliente } from '@/lib/api/cadastros';
import type { Cliente, EntradaDeCliente, TipoPessoa } from '@/tipos/cadastros';

interface Props {
  cliente: Cliente | null;
  aoFechar: () => void;
  aoConcluir: () => void;
}

const TIPOS = [
  { valor: 'FISICA', texto: 'Pessoa física' },
  { valor: 'JURIDICA', texto: 'Pessoa jurídica' },
];

function estadoInicial(cliente: Cliente | null): EntradaDeCliente {
  return {
    nome: cliente?.nome ?? '',
    documento: cliente?.documento ?? '',
    tipoPessoa: cliente?.tipoPessoa ?? 'FISICA',
    email: cliente?.email ?? '',
    telefone: cliente?.telefone ?? '',
    whatsapp: cliente?.whatsapp ?? '',
    observacoes: cliente?.observacoes ?? '',
    ativo: cliente?.ativo ?? true,
  };
}

export function ModalDeCliente({ cliente, aoFechar, aoConcluir }: Props) {
  const [dados, definirDados] = useState<EntradaDeCliente>(() => estadoInicial(cliente));
  const acao = useAcao();

  function atualizar<C extends keyof EntradaDeCliente>(campo: C, valor: EntradaDeCliente[C]) {
    definirDados((atual) => ({ ...atual, [campo]: valor }));
  }

  async function salvar() {
    const sucesso = await acao.executar(() =>
      cliente ? atualizarCliente(cliente.id, dados) : criarCliente(dados),
    );
    if (sucesso) {
      aoConcluir();
      aoFechar();
    }
  }

  return (
    <Modal
      titulo={cliente ? 'Editar cliente' : 'Novo cliente'}
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
            disabled={acao.emAndamento || !dados.nome.trim()}
          >
            {acao.emAndamento ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <AvisoDeErro mensagem={acao.erro} />
      <div className="grade grade--2">
        <CampoDeTexto rotulo="Nome" valor={dados.nome} aoMudar={(v) => atualizar('nome', v)} />
        <CampoDeTexto
          rotulo="Documento"
          valor={dados.documento}
          aoMudar={(v) => atualizar('documento', v)}
          espacoReservado="CPF ou CNPJ"
        />
        <CampoDeSelecao
          rotulo="Tipo de pessoa"
          valor={dados.tipoPessoa}
          opcoes={TIPOS}
          aoMudar={(v) => atualizar('tipoPessoa', v as TipoPessoa)}
          textoVazio="Selecione"
        />
        <CampoDeTexto
          rotulo="E-mail"
          tipo="email"
          valor={dados.email ?? ''}
          aoMudar={(v) => atualizar('email', v)}
        />
        <CampoDeTexto
          rotulo="Telefone"
          valor={dados.telefone ?? ''}
          aoMudar={(v) => atualizar('telefone', v)}
        />
        <CampoDeTexto
          rotulo="WhatsApp"
          valor={dados.whatsapp ?? ''}
          aoMudar={(v) => atualizar('whatsapp', v)}
        />
      </div>
      <CampoDeTexto
        rotulo="Observações"
        valor={dados.observacoes ?? ''}
        aoMudar={(v) => atualizar('observacoes', v)}
      />
      <label className="linha" style={{ gap: 6 }}>
        <input
          type="checkbox"
          checked={dados.ativo}
          onChange={() => atualizar('ativo', !dados.ativo)}
        />
        Cliente ativo
      </label>
    </Modal>
  );
}
