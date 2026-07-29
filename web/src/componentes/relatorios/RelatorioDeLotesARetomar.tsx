import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PainelDeRelatorio } from './PainelDeRelatorio';
import { CampoDeSelecao, CampoDeTexto } from '@/componentes/comuns/Campo';
import { useRequisicao } from '@/ganchos/useRequisicao';
import { useOpcoesDeLoteamentos } from '@/ganchos/useOpcoesDeCadastro';
import { buscarRelatorio } from '@/lib/api/relatorios';
import {
  formatarData,
  formatarDinheiro,
  formatarDocumento,
  formatarNumero,
  formatarTelefone,
} from '@/lib/formato';
import { AVISO_DE_RETOMADA_MANUAL } from '@/lib/politica';
import { hojeIso } from '@/lib/datas';
import type { LoteARetomar, RelatorioDeLotesARetomar as Resposta } from '@/tipos/relatorio';

function contatos(item: LoteARetomar): string {
  const partes = [
    item.telefone ? formatarTelefone(item.telefone) : null,
    item.whatsapp && item.whatsapp !== item.telefone ? formatarTelefone(item.whatsapp) : null,
    item.email,
  ].filter(Boolean);
  return partes.length > 0 ? partes.join(' · ') : '—';
}

function imovel(item: LoteARetomar): string {
  const partes = [item.loteamento, item.quadra && `Q ${item.quadra}`, item.lote && `L ${item.lote}`];
  return partes.filter(Boolean).join(' · ') || '—';
}

export function RelatorioDeLotesARetomar() {
  const [data, definirData] = useState(hojeIso);
  const [loteamentoId, definirLoteamentoId] = useState('');
  const loteamentos = useOpcoesDeLoteamentos();
  const parametros = { data, loteamentoId: loteamentoId || undefined };

  const requisicao = useRequisicao<Resposta>(
    (sinal) => buscarRelatorio<Resposta>('lotes-a-retomar', parametros, sinal),
    [data, loteamentoId],
  );

  // A API já entrega ordenado; reordenamos para o caso de a origem mudar.
  const itens = [...(requisicao.dados?.itens ?? [])].sort(
    (a, b) => (b.diasDeAtrasoMaximo ?? 0) - (a.diasDeAtrasoMaximo ?? 0),
  );
  const total = requisicao.dados?.totalDeContratos ?? itens.length;

  return (
    <PainelDeRelatorio
      titulo="Lotes a retomar"
      descricao={AVISO_DE_RETOMADA_MANUAL}
      caminho="lotes-a-retomar"
      parametros={parametros}
      requisicao={requisicao}
      vazio={() => itens.length === 0}
      filtros={
        <div className="filtros">
          <CampoDeTexto rotulo="Posição em" tipo="date" valor={data} aoMudar={definirData} />
          <CampoDeSelecao
            rotulo="Loteamento"
            valor={loteamentoId}
            opcoes={loteamentos}
            aoMudar={definirLoteamentoId}
          />
        </div>
      }
    >
      {(dados) => (
        <>
          <div className="painel__corpo definicoes">
            <div>
              <div className="definicao__rotulo">Contratos</div>
              <div className="definicao__valor texto-critico">{formatarNumero(total)}</div>
            </div>
            <div>
              <div className="definicao__rotulo">Valor vencido</div>
              <div className="definicao__valor texto-vencido">
                {formatarDinheiro(dados.valorVencidoCentavos ?? 0)}
              </div>
            </div>
            <div>
              <div className="definicao__rotulo">Saldo devedor</div>
              <div className="definicao__valor">
                {formatarDinheiro(dados.saldoDevedorCentavos ?? 0)}
              </div>
            </div>
          </div>

          <div className="rolagem-horizontal">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Contrato</th>
                  <th>Cliente</th>
                  <th>Documento</th>
                  <th>Contatos</th>
                  <th>Imóvel</th>
                  <th className="numerico">Dias de atraso</th>
                  <th className="numerico">Valor vencido</th>
                  <th className="numerico">Saldo devedor</th>
                  <th className="numerico">Assinatura</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item) => (
                  <tr key={item.contratoId}>
                    <td>
                      <Link to={`/contratos/${item.contratoId}`}>
                        <strong>{item.numero}</strong>
                      </Link>
                    </td>
                    <td className="celula-larga">{item.cliente}</td>
                    <td className="numerico">{formatarDocumento(item.documento)}</td>
                    <td className="celula-larga texto-suave">{contatos(item)}</td>
                    <td className="texto-suave">{imovel(item)}</td>
                    <td className="numerico texto-critico">
                      {formatarNumero(item.diasDeAtrasoMaximo)}
                    </td>
                    <td className="numerico texto-vencido">
                      {formatarDinheiro(item.valorVencidoCentavos)}
                    </td>
                    <td className="numerico">{formatarDinheiro(item.saldoDevedorCentavos)}</td>
                    <td className="numerico">{formatarData(item.dataAssinatura)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </PainelDeRelatorio>
  );
}
