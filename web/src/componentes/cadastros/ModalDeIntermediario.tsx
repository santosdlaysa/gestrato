import { useState } from 'react';
import { Modal } from '@/componentes/comuns/Modal';
import { CampoDeSelecao, CampoDeTexto } from '@/componentes/comuns/Campo';
import { AvisoDeErro } from '@/componentes/comuns/Estados';
import { useAcao } from '@/ganchos/useAcao';
import { atualizarCorretor, atualizarParceiro, criarCorretor, criarParceiro } from '@/lib/api/cadastros';
import type { Corretor, EntradaDeCorretor, EntradaDeParceiro, Parceiro } from '@/tipos/cadastros';

type Registro = Corretor | Parceiro;
interface Props {
  tipo: 'corretor' | 'parceiro';
  registro: Registro | null;
  aoFechar: () => void;
  aoConcluir: () => void;
}

interface DadosDoFormulario {
  nome: string;
  documento: string;
  email: string;
  telefone: string;
  ativo: boolean;
  percentualDeComissao: number;
  tipo: string;
  observacoes: string;
}

function dadosIniciais(tipo: Props['tipo'], registro: Registro | null): DadosDoFormulario {
  const corretor = tipo === 'corretor';
  const dadosCorretor = registro && 'percentualDeComissao' in registro ? registro : null;
  const dadosParceiro = registro && 'tipo' in registro ? registro : null;
  return {
    nome: registro?.nome ?? '',
    documento: registro?.documento ?? '',
    email: registro?.email ?? '',
    telefone: registro?.telefone ?? '',
    ativo: registro?.ativo ?? true,
    percentualDeComissao: corretor ? dadosCorretor?.percentualDeComissao ?? 0 : 0,
    tipo: !corretor ? dadosParceiro?.tipo ?? 'OUTRO' : 'OUTRO',
    observacoes: !corretor ? dadosParceiro?.observacoes ?? '' : '',
  };
}

export function ModalDeIntermediario({ tipo, registro, aoFechar, aoConcluir }: Props) {
  const corretor = tipo === 'corretor';
  const [dados, definirDados] = useState(() => dadosIniciais(tipo, registro));
  const acao = useAcao();
  const atualizar = <K extends keyof DadosDoFormulario>(campo: K, valor: DadosDoFormulario[K]) =>
    definirDados((atual) => ({ ...atual, [campo]: valor }));

  async function salvar() {
    const sucesso = await acao.executar(() => {
      if (corretor) {
        const entrada: EntradaDeCorretor = {
          nome: dados.nome,
          documento: dados.documento || null,
          email: dados.email || null,
          telefone: dados.telefone || null,
          ativo: dados.ativo,
          percentualDeComissao: dados.percentualDeComissao,
        };
        return registro ? atualizarCorretor(registro.id, entrada) : criarCorretor(entrada);
      }
      const entrada: EntradaDeParceiro = {
        nome: dados.nome,
        documento: dados.documento || null,
        email: dados.email || null,
        telefone: dados.telefone || null,
        ativo: dados.ativo,
        tipo: dados.tipo,
        observacoes: dados.observacoes || null,
      };
      return registro ? atualizarParceiro(registro.id, entrada) : criarParceiro(entrada);
    });
    if (sucesso) {
      aoConcluir();
      aoFechar();
    }
  }

  return (
    <Modal
      titulo={`${registro ? 'Editar' : 'Novo'} ${corretor ? 'corretor' : 'parceiro'}`}
      aoFechar={aoFechar}
      rodape={
        <>
          <button type="button" className="botao" onClick={aoFechar}>Cancelar</button>
          <button type="button" className="botao botao--primario" onClick={salvar} disabled={acao.emAndamento || !dados.nome.trim()}>
            Salvar
          </button>
        </>
      }
    >
      <AvisoDeErro mensagem={acao.erro} />
      <div className="grade grade--2">
        <CampoDeTexto rotulo="Nome" valor={dados.nome} aoMudar={(valor) => atualizar('nome', valor)} />
        <CampoDeTexto rotulo="Documento" valor={dados.documento} aoMudar={(valor) => atualizar('documento', valor)} />
        <CampoDeTexto rotulo="E-mail" tipo="email" valor={dados.email} aoMudar={(valor) => atualizar('email', valor)} />
        <CampoDeTexto rotulo="Telefone" valor={dados.telefone} aoMudar={(valor) => atualizar('telefone', valor)} />
        {corretor ? (
          <CampoDeTexto rotulo="Comissão (%)" tipo="number" valor={String(dados.percentualDeComissao)} aoMudar={(valor) => atualizar('percentualDeComissao', Number(valor) || 0)} />
        ) : (
          <CampoDeSelecao
            rotulo="Tipo"
            valor={dados.tipo}
            opcoes={[
              { valor: 'INDICADOR', texto: 'Indicador' },
              { valor: 'IMOBILIARIA', texto: 'Imobiliária' },
              { valor: 'OUTRO', texto: 'Outro' },
            ]}
            aoMudar={(valor) => atualizar('tipo', valor)}
          />
        )}
      </div>
      {!corretor && <CampoDeTexto rotulo="Observações" valor={dados.observacoes} aoMudar={(valor) => atualizar('observacoes', valor)} />}
      <label className="linha" style={{ gap: 6 }}>
        <input type="checkbox" checked={dados.ativo} onChange={() => atualizar('ativo', !dados.ativo)} /> Ativo
      </label>
    </Modal>
  );
}
