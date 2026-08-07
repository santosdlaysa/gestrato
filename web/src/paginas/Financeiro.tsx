import { useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Parcelas } from './Parcelas';
import { RelatorioDeRecebimentos } from '@/componentes/relatorios/RelatorioDeRecebimentos';
import { RelatorioDeFluxoPrevisto } from '@/componentes/relatorios/RelatorioDeFluxoPrevisto';
import { RelatorioDeInadimplencia } from '@/componentes/relatorios/RelatorioDeInadimplencia';
import { EmConstrucao } from './EmConstrucao';
import { CabecalhoDaPagina } from '@/componentes/layout/CabecalhoDaPagina';
import { ContasAPagar } from './ContasAPagar';
import { Movimentacoes } from './Movimentacoes';
import { ExtratoBancario } from './ExtratoBancario';
import { ModuloFinanceiroIndisponivel } from '@/componentes/financeiro/ModuloFinanceiroIndisponivel';

/**
 * Entrada dos módulos financeiros que já possuem fonte real na API.
 * Os demais caminhos continuam no dispatcher genérico e não são mascarados
 * como se tivessem dados reais.
 */
export function Financeiro() {
  const caminho = useLocation().pathname;

  if (caminho === '/financeiro/contas-a-receber') return <Parcelas />;
  if (caminho === '/financeiro/recebimentos') {
    return (
      <PaginaFinanceira titulo="Recebimentos" descricao="Baixas registradas por competência, com totalização por período.">
        <RelatorioDeRecebimentos />
      </PaginaFinanceira>
    );
  }
  if (caminho === '/financeiro/fluxo-previsto') {
    return (
      <PaginaFinanceira titulo="Fluxo previsto" descricao="Projeção das parcelas a receber nos próximos meses.">
        <RelatorioDeFluxoPrevisto />
      </PaginaFinanceira>
    );
  }
  if (caminho === '/financeiro/inadimplencia') {
    return (
      <PaginaFinanceira titulo="Controle de inadimplência" descricao="Acompanhe o valor vencido por loteamento e situação de atraso.">
        <RelatorioDeInadimplencia />
      </PaginaFinanceira>
    );
  }
  if (caminho === '/financeiro/pagamentos') {
    return <ContasAPagar somentePagas />;
  }
  if (caminho === '/financeiro/movimentacoes') return <Movimentacoes />;
  if (caminho === '/financeiro/caixa-diario') {
    return <Movimentacoes titulo="Caixa" descricao="Entradas e saídas em caixa e bancos, com saldo do período." />;
  }
  if (caminho === '/financeiro/transferencias') {
    return <Movimentacoes titulo="Transferências" descricao="Movimentações entre contas da loteadora." focoTransferencia />;
  }
  if (caminho === '/financeiro/extratos') return <ExtratoBancario />;
  if (caminho === '/financeiro/sangrias' || caminho === '/financeiro/fechamento') {
    return (
      <ModuloFinanceiroIndisponivel
        titulo="Caixa — sangrias e fechamento"
        descricao="Sangrias e fechamento diário do caixa."
        limitacao="As movimentações e o extrato já estão disponíveis em Caixa e Extratos. O fechamento de caixa (conferência e bloqueio do dia) entra numa fase seguinte."
      />
    );
  }
  if (caminho === '/financeiro/conciliacao') {
    return (
      <ModuloFinanceiroIndisponivel
        titulo="Conciliação bancária"
        descricao="Conferência entre extratos bancários e lançamentos internos."
        limitacao="Os lançamentos e o extrato interno já existem; a importação de extrato do banco e a conciliação automática entram numa fase seguinte."
      />
    );
  }
  if (caminho === '/financeiro/dre' || caminho === '/financeiro/balancete' || caminho === '/financeiro/analise-de-resultado' || caminho === '/financeiro/fluxo-sintetico' || caminho === '/financeiro/fluxo-analitico' || caminho === '/financeiro/fluxo-conciliado') {
    return (
      <ModuloFinanceiroIndisponivel
        titulo="Análise gerencial"
        descricao="DRE, balancete e fluxos de caixa gerenciais."
        limitacao="O backend atual não possui plano de contas, lançamentos contábeis nem API de DRE/balancetes. O Fluxo previsto disponível no sistema é somente de parcelas a receber."
      />
    );
  }

  return <EmConstrucao />;
}

function PaginaFinanceira({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao: string;
  children: ReactNode;
}) {
  return (
    <>
      <CabecalhoDaPagina titulo={titulo} descricao={descricao} />
      <div className="corpo-da-pagina pilha">{children}</div>
    </>
  );
}
