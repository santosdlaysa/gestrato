import { useState } from 'react';
import { PainelDeRelatorio } from './PainelDeRelatorio';
import { CampoDeTexto } from '@/componentes/comuns/Campo';
import { useRequisicao } from '@/ganchos/useRequisicao';
import { buscarRelatorio } from '@/lib/api/relatorios';
import { extrairItens } from '@/lib/colecoes';
import { formatarDinheiro, formatarNumero, formatarTelefone } from '@/lib/formato';
import type { RespostaPaginada } from '@/tipos/comum';
import type { ClienteEmAtraso } from '@/tipos/relatorio';

type Resposta = ClienteEmAtraso[] | RespostaPaginada<ClienteEmAtraso>;

function valorVencido(item: ClienteEmAtraso): number {
  return item.valorVencidoCentavos ?? item.totalVencidoCentavos ?? 0;
}

function maiorAtraso(item: ClienteEmAtraso): number {
  return item.maiorAtrasoEmDias ?? item.diasDeAtrasoMaximo ?? 0;
}

export function RelatorioDeClientesEmAtraso() {
  const [diasMinimos, definirDiasMinimos] = useState('1');
  const parametros = { diasMinimos: Number(diasMinimos) || 1 };

  const requisicao = useRequisicao<Resposta>(
    (sinal) => buscarRelatorio<Resposta>('clientes-em-atraso', parametros, sinal),
    [diasMinimos],
  );

  const itens = extrairItens(requisicao.dados);

  return (
    <PainelDeRelatorio
      titulo="Clientes em atraso"
      descricao="Ordenado pelo maior atraso da carteira"
      caminho="clientes-em-atraso"
      parametros={parametros}
      requisicao={requisicao}
      vazio={() => itens.length === 0}
      filtros={
        <div className="filtros">
          <CampoDeTexto
            rotulo="Dias mínimos de atraso"
            tipo="number"
            valor={diasMinimos}
            aoMudar={definirDiasMinimos}
          />
        </div>
      }
    >
      {() => (
        <div className="rolagem-horizontal">
          <table className="tabela">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Telefone</th>
                <th className="numerico">Contratos</th>
                <th className="numerico">Parcelas vencidas</th>
                <th className="numerico">Atraso máximo</th>
                <th className="numerico">Total vencido</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item, indice) => (
                <tr key={item.clienteId ?? `${item.cliente}-${indice}`}>
                  <td className="celula-larga">{item.cliente}</td>
                  <td>{formatarTelefone(item.telefone)}</td>
                  <td className="numerico">{formatarNumero(item.contratos ?? 0)}</td>
                  <td className="numerico">{formatarNumero(item.parcelasVencidas)}</td>
                  <td className="numerico texto-vencido">
                    {formatarNumero(maiorAtraso(item))} dias
                  </td>
                  <td className="numerico texto-vencido">
                    {formatarDinheiro(valorVencido(item))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PainelDeRelatorio>
  );
}
