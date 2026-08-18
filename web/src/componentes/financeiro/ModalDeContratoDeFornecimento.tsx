import { useMemo, useState } from 'react';
import { Modal } from '@/componentes/comuns/Modal';
import { CampoDeDinheiro, CampoDeSelecao, CampoDeTexto } from '@/componentes/comuns/Campo';
import type { Opcao } from '@/componentes/comuns/Campo';
import { AvisoDeErro } from '@/componentes/comuns/Estados';
import { useAcao } from '@/ganchos/useAcao';
import { useRequisicao } from '@/ganchos/useRequisicao';
import { listarFornecedores } from '@/lib/api/contas-a-pagar';
import {
  atualizarContratoDeFornecimento,
  criarContratoDeFornecimento,
} from '@/lib/api/contratos-de-fornecimento';
import { centavosParaCampo } from '@/lib/formato';
import { reaisParaCentavos } from '@/lib/dinheiro';
import type {
  ContratoDeFornecimento,
  EntradaDeContratoDeFornecimento,
  SituacaoDaEmpresa,
  TipoDeItemContrato,
} from '@/tipos/contratos-de-fornecimento';
import type { RespostaDeFornecedores } from '@/tipos/contas-a-pagar';

interface Props {
  contrato: ContratoDeFornecimento | null;
  aoFechar: () => void;
  aoConcluir: () => void;
}

const OPCOES_SITUACAO: Opcao[] = [
  { valor: 'CONTRATANTE', texto: 'Contratante' },
  { valor: 'CONTRATADA', texto: 'Contratada' },
];

const OPCOES_TIPO: Opcao[] = [
  { valor: 'SERVICO', texto: 'Serviço' },
  { valor: 'INSUMO', texto: 'Insumo' },
];

/** Estado local do formulário: valor em reais como texto; datas como "AAAA-MM-DD". */
interface FormularioLocal {
  numero: string;
  documento: string;
  situacaoDaEmpresa: SituacaoDaEmpresa;
  tipoDeItem: TipoDeItemContrato;
  objeto: string;
  empresa: string;
  fornecedorId: string;
  tipoDoContrato: string;
  responsavel: string;
  dataDoContrato: string;
  dataBase: string;
  dataDeInicio: string;
  dataDeTermino: string;
  valor: string;
  observacaoInterna: string;
  ativo: boolean;
}

function estadoInicial(contrato: ContratoDeFornecimento | null): FormularioLocal {
  return {
    numero: contrato?.numero ?? '',
    documento: contrato?.documento ?? '',
    situacaoDaEmpresa: contrato?.situacaoDaEmpresa ?? 'CONTRATANTE',
    tipoDeItem: contrato?.tipoDeItem ?? 'SERVICO',
    objeto: contrato?.objeto ?? '',
    empresa: contrato?.empresa ?? '',
    fornecedorId: contrato?.fornecedorId ?? '',
    tipoDoContrato: contrato?.tipoDoContrato ?? '',
    responsavel: contrato?.responsavel ?? '',
    dataDoContrato: contrato?.dataDoContrato ?? '',
    dataBase: contrato?.dataBase ?? '',
    dataDeInicio: contrato?.dataDeInicio ?? '',
    dataDeTermino: contrato?.dataDeTermino ?? '',
    valor: centavosParaCampo(contrato?.valorCentavos ?? null),
    observacaoInterna: contrato?.observacaoInterna ?? '',
    ativo: contrato?.ativo ?? true,
  };
}

function montarEntrada(form: FormularioLocal): EntradaDeContratoDeFornecimento {
  return {
    numero: form.numero.trim(),
    documento: form.documento.trim() || null,
    situacaoDaEmpresa: form.situacaoDaEmpresa,
    tipoDeItem: form.tipoDeItem,
    objeto: form.objeto.trim(),
    empresa: form.empresa.trim() || null,
    fornecedorId: form.fornecedorId || null,
    tipoDoContrato: form.tipoDoContrato.trim() || null,
    responsavel: form.responsavel.trim() || null,
    dataDoContrato: form.dataDoContrato || null,
    dataBase: form.dataBase || null,
    dataDeInicio: form.dataDeInicio || null,
    dataDeTermino: form.dataDeTermino || null,
    valorCentavos: form.valor.trim() ? reaisParaCentavos(form.valor) : null,
    observacaoInterna: form.observacaoInterna.trim() || null,
    ativo: form.ativo,
  };
}

export function ModalDeContratoDeFornecimento({ contrato, aoFechar, aoConcluir }: Props) {
  const [dados, definirDados] = useState<FormularioLocal>(() => estadoInicial(contrato));
  const acao = useAcao();

  const fornecedores = useRequisicao<RespostaDeFornecedores>(
    (sinal) => listarFornecedores({ ativo: 'true', porPagina: 100 }, sinal),
    [],
  );
  const opcoesDeFornecedor = useMemo<Opcao[]>(
    () => (fornecedores.dados?.itens ?? []).map((f) => ({ valor: f.id, texto: f.nome })),
    [fornecedores.dados],
  );

  function atualizar<C extends keyof FormularioLocal>(campo: C, valor: FormularioLocal[C]) {
    definirDados((atual) => ({ ...atual, [campo]: valor }));
  }

  async function salvar() {
    const entrada = montarEntrada(dados);
    const sucesso = await acao.executar(() =>
      contrato
        ? atualizarContratoDeFornecimento(contrato.id, entrada)
        : criarContratoDeFornecimento(entrada),
    );
    if (sucesso) {
      aoConcluir();
      aoFechar();
    }
  }

  const invalido = !dados.numero.trim() || !dados.objeto.trim();

  return (
    <Modal
      titulo={contrato ? 'Editar contrato de fornecimento' : 'Novo contrato de fornecimento'}
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
            disabled={acao.emAndamento || invalido}
          >
            {acao.emAndamento ? 'Salvando…' : 'Salvar'}
          </button>
        </>
      }
    >
      <AvisoDeErro mensagem={acao.erro} />

      <div className="grade grade--2">
        <CampoDeTexto
          rotulo="Número"
          valor={dados.numero}
          aoMudar={(v) => atualizar('numero', v)}
          espacoReservado="2026/0001"
        />
        <CampoDeTexto
          rotulo="Documento"
          valor={dados.documento}
          aoMudar={(v) => atualizar('documento', v)}
          espacoReservado="Nº do documento"
        />
        <CampoDeSelecao
          rotulo="Situação da empresa"
          valor={dados.situacaoDaEmpresa}
          opcoes={OPCOES_SITUACAO}
          aoMudar={(v) => atualizar('situacaoDaEmpresa', (v || 'CONTRATANTE') as SituacaoDaEmpresa)}
          textoVazio="Contratante"
        />
        <CampoDeSelecao
          rotulo="Tipo de item"
          valor={dados.tipoDeItem}
          opcoes={OPCOES_TIPO}
          aoMudar={(v) => atualizar('tipoDeItem', (v || 'SERVICO') as TipoDeItemContrato)}
          textoVazio="Serviço"
        />
      </div>

      <CampoDeTexto
        rotulo="Objeto"
        valor={dados.objeto}
        aoMudar={(v) => atualizar('objeto', v)}
        espacoReservado="Descrição do serviço ou insumo contratado"
      />

      <div className="grade grade--2">
        <CampoDeTexto
          rotulo="Empresa"
          valor={dados.empresa}
          aoMudar={(v) => atualizar('empresa', v)}
          espacoReservado="Empresa contratante/contratada"
        />
        <CampoDeSelecao
          rotulo="Fornecedor"
          valor={dados.fornecedorId}
          opcoes={opcoesDeFornecedor}
          aoMudar={(v) => atualizar('fornecedorId', v)}
          textoVazio="Sem fornecedor"
        />
        <CampoDeTexto
          rotulo="Tipo do contrato"
          valor={dados.tipoDoContrato}
          aoMudar={(v) => atualizar('tipoDoContrato', v)}
        />
        <CampoDeTexto
          rotulo="Responsável"
          valor={dados.responsavel}
          aoMudar={(v) => atualizar('responsavel', v)}
        />
      </div>

      <div className="grade grade--2">
        <CampoDeTexto
          rotulo="Data do contrato"
          tipo="date"
          valor={dados.dataDoContrato}
          aoMudar={(v) => atualizar('dataDoContrato', v)}
        />
        <CampoDeTexto
          rotulo="Data base"
          tipo="date"
          valor={dados.dataBase}
          aoMudar={(v) => atualizar('dataBase', v)}
        />
        <CampoDeTexto
          rotulo="Data de início"
          tipo="date"
          valor={dados.dataDeInicio}
          aoMudar={(v) => atualizar('dataDeInicio', v)}
        />
        <CampoDeTexto
          rotulo="Data de término"
          tipo="date"
          valor={dados.dataDeTermino}
          aoMudar={(v) => atualizar('dataDeTermino', v)}
        />
      </div>

      <CampoDeDinheiro
        rotulo="Valor (R$)"
        valor={dados.valor}
        aoMudar={(v) => atualizar('valor', v)}
        dica="Opcional"
      />

      <CampoDeTexto
        rotulo="Observação interna"
        valor={dados.observacaoInterna}
        aoMudar={(v) => atualizar('observacaoInterna', v)}
      />

      <label className="linha" style={{ gap: 6 }}>
        <input type="checkbox" checked={dados.ativo} onChange={() => atualizar('ativo', !dados.ativo)} />
        Contrato ativo
      </label>
    </Modal>
  );
}
