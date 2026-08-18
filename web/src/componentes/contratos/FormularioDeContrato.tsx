import { CampoDeDinheiro, CampoDeSelecao, CampoDeTexto } from '@/componentes/comuns/Campo';
import type { Opcao } from '@/componentes/comuns/Campo';
import { Painel } from '@/componentes/comuns/Painel';
import { FORMAS_DE_PAGAMENTO, PERIODICIDADES } from '@/tipos/comum';
import type { Periodicidade } from '@/tipos/comum';
import { rotularEnum } from '@/lib/formato';
import type { FormularioDeContrato as Formulario } from '@/lib/contrato';

const OPCOES_DE_PERIODICIDADE = PERIODICIDADES.map((item) => ({
  valor: item,
  texto: rotularEnum(item),
}));

const OPCOES_DE_PAGAMENTO = FORMAS_DE_PAGAMENTO.map((item) => ({
  valor: item,
  texto: rotularEnum(item),
}));

interface Props {
  formulario: Formulario;
  atualizar: <C extends keyof Formulario>(campo: C, valor: Formulario[C]) => void;
  clientes: Opcao[];
  loteamentos: Opcao[];
  lotes: Opcao[];
  corretores: Opcao[];
  /** Abre o cadastro rápido de cliente sem sair da tela de contrato. */
  aoNovoCliente?: () => void;
  /** Abre o cadastro rápido de lote sem sair da tela de contrato. */
  aoNovoLote?: () => void;
}

export function FormularioDeContrato({
  formulario,
  atualizar,
  clientes,
  loteamentos,
  lotes,
  corretores,
  aoNovoCliente,
  aoNovoLote,
}: Props) {
  return (
    <div className="pilha">
      <Painel titulo="Partes e imóvel">
        <div className="grade grade--3">
          <CampoDeTexto
            rotulo="Número do contrato"
            valor={formulario.numero}
            aoMudar={(valor) => atualizar('numero', valor)}
            espacoReservado="2026/0001"
          />
          <div className="campo">
            <CampoDeSelecao
              rotulo="Cliente"
              valor={formulario.clienteId}
              opcoes={clientes}
              aoMudar={(valor) => atualizar('clienteId', valor)}
              textoVazio="Selecione o cliente"
            />
            {aoNovoCliente && (
              <button
                type="button"
                className="botao botao--fantasma botao--pequeno"
                onClick={aoNovoCliente}
                style={{ marginTop: 4, alignSelf: 'flex-start' }}
              >
                + Novo cliente
              </button>
            )}
          </div>
          <CampoDeSelecao
            rotulo="Corretor"
            valor={formulario.corretorId}
            opcoes={corretores}
            aoMudar={(valor) => atualizar('corretorId', valor)}
            textoVazio="Sem corretor"
          />
          <CampoDeSelecao
            rotulo="Loteamento"
            valor={formulario.loteamentoId}
            opcoes={loteamentos}
            aoMudar={(valor) => {
              atualizar('loteamentoId', valor);
              atualizar('loteId', '');
            }}
            textoVazio="Todos"
          />
          <div className="campo">
            <CampoDeSelecao
              rotulo="Lote"
              valor={formulario.loteId}
              opcoes={lotes}
              aoMudar={(valor) => atualizar('loteId', valor)}
              textoVazio="Selecione o lote"
            />
            {aoNovoLote && (
              <button
                type="button"
                className="botao botao--fantasma botao--pequeno"
                onClick={aoNovoLote}
                style={{ marginTop: 4, alignSelf: 'flex-start' }}
              >
                + Novo lote
              </button>
            )}
          </div>
          <CampoDeTexto
            rotulo="Data de assinatura"
            tipo="date"
            valor={formulario.dataAssinatura}
            aoMudar={(valor) => atualizar('dataAssinatura', valor)}
          />
        </div>
      </Painel>

      <Painel titulo="Plano de pagamento">
        <div className="grade grade--3">
          <CampoDeDinheiro
            rotulo="Valor total (R$)"
            valor={formulario.valorTotal}
            aoMudar={(valor) => atualizar('valorTotal', valor)}
          />
          <CampoDeDinheiro
            rotulo="Entrada (R$)"
            valor={formulario.valorEntrada}
            aoMudar={(valor) => atualizar('valorEntrada', valor)}
          />
          <CampoDeTexto
            rotulo="Data da entrada"
            tipo="date"
            valor={formulario.dataEntrada}
            aoMudar={(valor) => atualizar('dataEntrada', valor)}
          />
          <CampoDeSelecao
            rotulo="Forma da entrada"
            valor={formulario.formaPagamentoEntrada}
            opcoes={OPCOES_DE_PAGAMENTO}
            aoMudar={(valor) => atualizar('formaPagamentoEntrada', valor)}
            textoVazio="Não informada"
          />
          <CampoDeTexto
            rotulo="Quantidade de parcelas"
            tipo="number"
            valor={formulario.quantidadeDeParcelas}
            aoMudar={(valor) => atualizar('quantidadeDeParcelas', valor)}
          />
          <CampoDeDinheiro
            rotulo="Valor da parcela (R$)"
            valor={formulario.valorDaParcela}
            aoMudar={(valor) => atualizar('valorDaParcela', valor)}
            dica="Deixe vazio para a API calcular"
          />
          <CampoDeTexto
            rotulo="Primeiro vencimento"
            tipo="date"
            valor={formulario.primeiroVencimento}
            aoMudar={(valor) => atualizar('primeiroVencimento', valor)}
          />
          <CampoDeSelecao
            rotulo="Periodicidade"
            valor={formulario.periodicidade}
            opcoes={OPCOES_DE_PERIODICIDADE}
            aoMudar={(valor) => atualizar('periodicidade', valor as Periodicidade)}
            textoVazio="Selecione"
          />
          <CampoDeTexto
            rotulo="Índice de reajuste"
            valor={formulario.indiceReajuste}
            aoMudar={(valor) => atualizar('indiceReajuste', valor)}
            espacoReservado="IGPM"
          />
        </div>
      </Painel>

      <Painel titulo="Encargos por atraso">
        <div className="grade grade--3">
          <CampoDeTexto
            rotulo="Multa (%)"
            valor={formulario.multaPorAtrasoPercentual}
            aoMudar={(valor) => atualizar('multaPorAtrasoPercentual', valor)}
          />
          <CampoDeTexto
            rotulo="Juros ao mês (%)"
            valor={formulario.jurosAoMesPercentual}
            aoMudar={(valor) => atualizar('jurosAoMesPercentual', valor)}
          />
          <CampoDeTexto
            rotulo="Dias de carência"
            tipo="number"
            valor={formulario.diasDeCarencia}
            aoMudar={(valor) => atualizar('diasDeCarencia', valor)}
          />
        </div>
        <div style={{ marginTop: 12 }}>
          <CampoDeTexto
            rotulo="Observações"
            valor={formulario.observacoes}
            aoMudar={(valor) => atualizar('observacoes', valor)}
          />
        </div>
      </Painel>
    </div>
  );
}
