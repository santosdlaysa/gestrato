import { Painel } from '@/componentes/comuns/Painel';
import { EstadoDeCarregamento, EstadoDeErro, EstadoVazio } from '@/componentes/comuns/Estados';
import { formatarData, formatarDinheiro, formatarNumero, rotularEnum } from '@/lib/formato';
import type { SimulacaoDeContrato } from '@/tipos/contrato';
import type { Requisicao } from '@/ganchos/useRequisicao';

interface Props {
  requisicao: Requisicao<SimulacaoDeContrato | null>;
  habilitada: boolean;
}

function valorDaParcela(parcela: { valorCentavos?: number; valorOriginalCentavos?: number }): number {
  return parcela.valorCentavos ?? parcela.valorOriginalCentavos ?? 0;
}

function Totais({ simulacao }: { simulacao: SimulacaoDeContrato }) {
  const parcelas = simulacao.parcelas ?? [];
  const resumo = simulacao.resumo;
  const somaDoPlano =
    resumo?.somaDoPlanoCentavos ??
    parcelas.reduce((soma, parcela) => soma + valorDaParcela(parcela), 0);
  const parcelasDoFinanciamento = parcelas.filter((parcela) => parcela.tipo === 'FINANCIAMENTO');

  return (
    <div className="definicoes" style={{ marginBottom: 12 }}>
      <div>
        <div className="definicao__rotulo">Entrada</div>
        <div className="definicao__valor">
          {formatarDinheiro(resumo?.valorEntradaCentavos ?? 0)}
        </div>
      </div>
      <div>
        <div className="definicao__rotulo">Financiado</div>
        <div className="definicao__valor">
          {formatarDinheiro(resumo?.valorFinanciadoCentavos ?? 0)}
        </div>
      </div>
      <div>
        <div className="definicao__rotulo">Parcelas</div>
        <div className="definicao__valor">
          {formatarNumero(resumo?.quantidadeDeParcelas ?? parcelasDoFinanciamento.length)}
        </div>
      </div>
      <div>
        <div className="definicao__rotulo">Valor da parcela</div>
        <div className="definicao__valor">
          {formatarDinheiro(
            resumo?.primeiraParcelaCentavos ??
              (parcelasDoFinanciamento[0] ? valorDaParcela(parcelasDoFinanciamento[0]) : 0),
          )}
        </div>
      </div>
      <div>
        <div className="definicao__rotulo">Total do plano</div>
        <div className="definicao__valor">{formatarDinheiro(somaDoPlano)}</div>
      </div>
    </div>
  );
}

export function PreviaDoPlano({ requisicao, habilitada }: Props) {
  return (
    <Painel
      titulo="Prévia das parcelas"
      descricao="Gerada por POST /contratos/simular, sem salvar nada"
      semPreenchimento
    >
      <div className="painel__corpo">
        {!habilitada && (
          <EstadoVazio
            titulo="Preencha o plano"
            descricao="Informe valor total, quantidade de parcelas e o primeiro vencimento para ver a prévia."
          />
        )}
        {habilitada && requisicao.carregando && <EstadoDeCarregamento mensagem="Simulando…" />}
        {habilitada && requisicao.erro && (
          <EstadoDeErro mensagem={requisicao.erro} aoTentarNovamente={requisicao.recarregar} />
        )}
        {habilitada && !requisicao.carregando && !requisicao.erro && requisicao.dados && (
          <Totais simulacao={requisicao.dados} />
        )}
      </div>

      {habilitada && (requisicao.dados?.parcelas ?? []).length > 0 && (
        <div className="rolagem-horizontal" style={{ maxHeight: 420, overflowY: 'auto' }}>
          <table className="tabela tabela--compacta">
            <thead>
              <tr>
                <th className="numerico">Nº</th>
                <th>Tipo</th>
                <th>Descrição</th>
                <th className="numerico">Vencimento</th>
                <th className="numerico">Valor</th>
              </tr>
            </thead>
            <tbody>
              {(requisicao.dados?.parcelas ?? []).map((parcela, indice) => (
                <tr key={`${parcela.numero}-${indice}`}>
                  <td className="numerico">{parcela.numero}</td>
                  <td>{rotularEnum(parcela.tipo)}</td>
                  <td className="celula-larga">{parcela.descricao ?? '—'}</td>
                  <td className="numerico">{formatarData(parcela.vencimento)}</td>
                  <td className="numerico">{formatarDinheiro(valorDaParcela(parcela))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Painel>
  );
}
