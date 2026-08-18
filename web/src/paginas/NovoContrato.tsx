import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CabecalhoDaPagina } from '@/componentes/layout/CabecalhoDaPagina';
import { AvisoDeErro } from '@/componentes/comuns/Estados';
import { FormularioDeContrato } from '@/componentes/contratos/FormularioDeContrato';
import { PreviaDoPlano } from '@/componentes/contratos/PreviaDoPlano';
import { ModalDeCliente } from '@/componentes/cadastros/ModalDeCliente';
import { ModalDeLote } from '@/componentes/cadastros/ModalDeLote';
import type { Opcao } from '@/componentes/comuns/Campo';
import type { Cliente, Lote } from '@/tipos/cadastros';
import { useRequisicao } from '@/ganchos/useRequisicao';
import { useValorAtrasado } from '@/ganchos/useValorAtrasado';
import { useAcao } from '@/ganchos/useAcao';
import {
  useOpcoesDeClientes,
  useOpcoesDeCorretores,
  useOpcoesDeLotes,
  useOpcoesDeLoteamentos,
} from '@/ganchos/useOpcoesDeCadastro';
import { criarContrato, simularContrato } from '@/lib/api/contratos';
import {
  FORMULARIO_INICIAL,
  faltamCamposObrigatorios,
  montarEntradaDeContrato,
  podeSimular,
} from '@/lib/contrato';
import type { FormularioDeContrato as Formulario } from '@/lib/contrato';
import type { SimulacaoDeContrato } from '@/tipos/contrato';

/** Junta cadastros criados agora (extras) à lista carregada, sem duplicar. */
function mesclarOpcoes(extras: Opcao[], base: Opcao[]): Opcao[] {
  const vistos = new Set(extras.map((opcao) => opcao.valor));
  return [...extras, ...base.filter((opcao) => !vistos.has(opcao.valor))];
}

function rotuloDoLote(lote: Lote): string {
  return `${lote.loteamento ?? ''} ${lote.quadra ? `Q${lote.quadra}` : ''} L${lote.numero}`.trim();
}

export function NovoContrato() {
  const navegar = useNavigate();
  const [formulario, definirFormulario] = useState<Formulario>(FORMULARIO_INICIAL);
  const [erroDeValidacao, definirErroDeValidacao] = useState<string | null>(null);
  const acao = useAcao();

  const clientes = useOpcoesDeClientes();
  const loteamentos = useOpcoesDeLoteamentos();
  const lotes = useOpcoesDeLotes(formulario.loteamentoId);
  const corretores = useOpcoesDeCorretores();

  // Cadastros feitos pelos modais desta tela: entram nas opções na hora, sem
  // recarregar a lista inteira, e já ficam selecionados no contrato.
  const [clientesExtras, definirClientesExtras] = useState<Opcao[]>([]);
  const [lotesExtras, definirLotesExtras] = useState<Opcao[]>([]);
  const [modalClienteAberto, definirModalClienteAberto] = useState(false);
  const [modalLoteAberto, definirModalLoteAberto] = useState(false);

  const opcoesDeClientes = useMemo(
    () => mesclarOpcoes(clientesExtras, clientes),
    [clientesExtras, clientes],
  );
  const opcoesDeLotes = useMemo(() => mesclarOpcoes(lotesExtras, lotes), [lotesExtras, lotes]);

  function atualizar<C extends keyof Formulario>(campo: C, valor: Formulario[C]) {
    definirFormulario((atual) => ({ ...atual, [campo]: valor }));
    definirErroDeValidacao(null);
  }

  function aoCriarCliente(cliente?: Cliente) {
    if (!cliente) return;
    definirClientesExtras((atuais) => [{ valor: cliente.id, texto: cliente.nome }, ...atuais]);
    atualizar('clienteId', cliente.id);
  }

  function aoCriarLote(lote?: Lote) {
    if (!lote) return;
    definirLotesExtras((atuais) => [{ valor: lote.id, texto: rotuloDoLote(lote) }, ...atuais]);
    definirFormulario((atual) => ({
      ...atual,
      loteamentoId: lote.loteamentoId ?? atual.loteamentoId,
      loteId: lote.id,
    }));
    definirErroDeValidacao(null);
  }

  const simulavel = podeSimular(formulario);
  const entrada = useMemo(() => montarEntradaDeContrato(formulario), [formulario]);
  const chaveDaSimulacao = useValorAtrasado(
    JSON.stringify({
      valorTotalCentavos: entrada.valorTotalCentavos,
      valorEntradaCentavos: entrada.valorEntradaCentavos,
      quantidadeDeParcelas: entrada.quantidadeDeParcelas,
      valorDaParcelaCentavos: entrada.valorDaParcelaCentavos,
      primeiroVencimento: entrada.primeiroVencimento,
      periodicidade: entrada.periodicidade,
      dataEntrada: entrada.dataEntrada,
    }),
    500,
  );

  const simulacao = useRequisicao<SimulacaoDeContrato | null>(
    (sinal) => (simulavel ? simularContrato(entrada, sinal) : Promise.resolve(null)),
    [chaveDaSimulacao, simulavel],
  );

  async function salvar() {
    const problema = faltamCamposObrigatorios(formulario);
    if (problema) {
      definirErroDeValidacao(problema);
      return;
    }
    await acao.executar(async () => {
      const contrato = await criarContrato(montarEntradaDeContrato(formulario));
      navegar(contrato?.id ? `/contratos/${contrato.id}` : '/contratos');
    });
  }

  return (
    <>
      <CabecalhoDaPagina
        titulo="Novo contrato"
        descricao="A prévia do plano é recalculada automaticamente enquanto você preenche"
        acoes={
          <>
            <button type="button" className="botao" onClick={() => navegar('/contratos')}>
              Cancelar
            </button>
            <button
              type="button"
              className="botao botao--primario"
              onClick={salvar}
              disabled={acao.emAndamento}
            >
              {acao.emAndamento ? 'Salvando…' : 'Salvar contrato'}
            </button>
          </>
        }
      />

      <div className="corpo-da-pagina pilha">
        <AvisoDeErro mensagem={erroDeValidacao ?? acao.erro} />
        <div className="grade grade--2" style={{ alignItems: 'start' }}>
          <FormularioDeContrato
            formulario={formulario}
            atualizar={atualizar}
            clientes={opcoesDeClientes}
            loteamentos={loteamentos}
            lotes={opcoesDeLotes}
            corretores={corretores}
            aoNovoCliente={() => definirModalClienteAberto(true)}
            aoNovoLote={() => definirModalLoteAberto(true)}
          />
          <PreviaDoPlano requisicao={simulacao} habilitada={simulavel} />
        </div>
      </div>

      {modalClienteAberto && (
        <ModalDeCliente
          cliente={null}
          aoFechar={() => definirModalClienteAberto(false)}
          aoConcluir={aoCriarCliente}
        />
      )}
      {modalLoteAberto && (
        <ModalDeLote
          lote={null}
          loteamentos={loteamentos}
          aoFechar={() => definirModalLoteAberto(false)}
          aoConcluir={aoCriarLote}
        />
      )}
    </>
  );
}
