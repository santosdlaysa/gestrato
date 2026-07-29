import { useState } from 'react';
import { Painel } from '@/componentes/comuns/Painel';
import { Indicador } from '@/componentes/comuns/Indicador';
import { AvisoDeErro } from '@/componentes/comuns/Estados';
import { CampoDeTexto } from '@/componentes/comuns/Campo';
import { useAcao } from '@/ganchos/useAcao';
import { executarRegua } from '@/lib/api/regua';
import { hojeIso } from '@/lib/datas';
import { formatarNumero } from '@/lib/formato';
import { rotuloDoCanal } from '@/lib/rotulos';
import type { ResultadoDaExecucao } from '@/tipos/cobranca';

function ResumoDaExecucao({ resultado }: { resultado: ResultadoDaExecucao }) {
  return (
    <div className="pilha">
      {resultado.simulado && (
        <div className="aviso aviso--info">
          Simulação: nenhuma mensagem foi enviada. Os disparos abaixo seriam gerados.
        </div>
      )}
      <div className="grade grade--4">
        <Indicador rotulo="Avaliadas" valor={formatarNumero(resultado.avaliadas)} />
        <Indicador
          rotulo="Disparos programados"
          valor={formatarNumero(resultado.disparosProgramados)}
          tom="info"
        />
        <Indicador rotulo="Enviadas" valor={formatarNumero(resultado.enviadas)} tom="ok" />
        <Indicador rotulo="Falhas" valor={formatarNumero(resultado.falhas)} tom="vencido" />
        <Indicador
          rotulo="Ignoradas por duplicidade"
          valor={formatarNumero(resultado.ignoradasPorDuplicidade)}
        />
        <Indicador rotulo="Sem canal" valor={formatarNumero(resultado.semCanal)} tom="atencao" />
      </div>

      <div className="rolagem-horizontal">
        <table className="tabela tabela--compacta">
          <thead>
            <tr>
              <th>Contrato</th>
              <th>Cliente</th>
              <th>Evento</th>
              <th>Canal</th>
              <th>Resultado</th>
            </tr>
          </thead>
          <tbody>
            {(resultado.detalhes ?? []).map((detalhe, indice) => (
              <tr key={`${detalhe.parcelaId}-${indice}`}>
                <td>{detalhe.contrato}</td>
                <td className="celula-larga">{detalhe.cliente}</td>
                <td>{detalhe.evento}</td>
                <td>{rotuloDoCanal(detalhe.canal)}</td>
                <td>{detalhe.resultado}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ExecucaoDaRegua({ habilitado }: { habilitado: boolean }) {
  const [data, definirData] = useState(hojeIso);
  const [resultado, definirResultado] = useState<ResultadoDaExecucao | null>(null);
  const acao = useAcao();

  async function rodar(simular: boolean) {
    await acao.executar(async () => {
      const resposta = await executarRegua(data, simular);
      definirResultado(resposta);
    });
  }

  return (
    <Painel
      titulo="Executar régua"
      descricao="Avalia as parcelas do dia e dispara as etapas configuradas"
      acoes={
        <>
          <CampoDeTexto rotulo="Data" tipo="date" valor={data} aoMudar={definirData} />
          <button
            type="button"
            className="botao"
            onClick={() => rodar(true)}
            disabled={!habilitado || acao.emAndamento}
          >
            Simular
          </button>
          <button
            type="button"
            className="botao botao--primario"
            onClick={() => rodar(false)}
            disabled={!habilitado || acao.emAndamento}
          >
            {acao.emAndamento ? 'Executando…' : 'Executar régua'}
          </button>
        </>
      }
    >
      <AvisoDeErro mensagem={acao.erro} />
      {resultado ? (
        <ResumoDaExecucao resultado={resultado} />
      ) : (
        <p className="texto-suave">
          Use <strong>Simular</strong> para ver o que seria enviado sem disparar nada.
        </p>
      )}
    </Painel>
  );
}
