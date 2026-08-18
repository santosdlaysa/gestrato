import { useState } from 'react';
import { Modal } from '@/componentes/comuns/Modal';
import { CampoDeSelecao, CampoDeTexto } from '@/componentes/comuns/Campo';
import { AvisoDeErro } from '@/componentes/comuns/Estados';
import { useAcao } from '@/ganchos/useAcao';
import { atualizarCliente, criarCliente } from '@/lib/api/cadastros';
import type { Cliente, EntradaDeCliente, EntradaDeEndereco, TipoPessoa } from '@/tipos/cadastros';

interface Props {
  cliente: Cliente | null;
  aoFechar: () => void;
  /** Recebe o cliente salvo — usado para selecioná-lo em quem abriu o modal. */
  aoConcluir: (cliente?: Cliente) => void;
}

const TIPOS = [
  { valor: 'FISICA', texto: 'Pessoa física' },
  { valor: 'JURIDICA', texto: 'Pessoa jurídica' },
];

function enderecoInicial(cliente: Cliente | null): EntradaDeEndereco {
  const endereco = cliente?.endereco;
  return {
    logradouro: endereco?.logradouro ?? '',
    numero: endereco?.numero ?? '',
    complemento: endereco?.complemento ?? '',
    bairro: endereco?.bairro ?? '',
    cidade: endereco?.cidade ?? '',
    uf: endereco?.uf ?? '',
    cep: endereco?.cep ?? '',
  };
}

function estadoInicial(cliente: Cliente | null): EntradaDeCliente {
  return {
    nome: cliente?.nome ?? '',
    documento: cliente?.documento ?? '',
    tipoPessoa: cliente?.tipoPessoa ?? 'FISICA',
    email: cliente?.email ?? '',
    telefone: cliente?.telefone ?? '',
    whatsapp: cliente?.whatsapp ?? '',
    endereco: enderecoInicial(cliente),
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

  function atualizarEndereco<C extends keyof EntradaDeEndereco>(campo: C, valor: string) {
    definirDados((atual) => ({ ...atual, endereco: { ...atual.endereco, [campo]: valor } }));
  }

  async function salvar() {
    let salvo: Cliente | undefined;
    const sucesso = await acao.executar(async () => {
      salvo = cliente ? await atualizarCliente(cliente.id, dados) : await criarCliente(dados);
    });
    if (sucesso) {
      aoConcluir(salvo);
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
      <fieldset className="pilha" style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend className="campo__rotulo">Endereço (usado no boleto)</legend>
        <div className="grade grade--2">
          <CampoDeTexto
            rotulo="Logradouro"
            valor={dados.endereco.logradouro}
            aoMudar={(v) => atualizarEndereco('logradouro', v)}
            espacoReservado="Rua, avenida…"
          />
          <CampoDeTexto
            rotulo="Número"
            valor={dados.endereco.numero}
            aoMudar={(v) => atualizarEndereco('numero', v)}
          />
          <CampoDeTexto
            rotulo="Complemento"
            valor={dados.endereco.complemento}
            aoMudar={(v) => atualizarEndereco('complemento', v)}
            espacoReservado="Apto, bloco, quadra…"
          />
          <CampoDeTexto
            rotulo="Bairro"
            valor={dados.endereco.bairro}
            aoMudar={(v) => atualizarEndereco('bairro', v)}
          />
          <CampoDeTexto
            rotulo="Cidade"
            valor={dados.endereco.cidade}
            aoMudar={(v) => atualizarEndereco('cidade', v)}
          />
          <CampoDeTexto
            rotulo="UF"
            valor={dados.endereco.uf}
            aoMudar={(v) => atualizarEndereco('uf', v)}
            espacoReservado="Ex.: RR"
          />
          <CampoDeTexto
            rotulo="CEP"
            valor={dados.endereco.cep}
            aoMudar={(v) => atualizarEndereco('cep', v)}
          />
        </div>
      </fieldset>
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
