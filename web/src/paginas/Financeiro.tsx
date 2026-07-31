import { useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Parcelas } from './Parcelas';
import { RelatorioDeRecebimentos } from '@/componentes/relatorios/RelatorioDeRecebimentos';
import { RelatorioDeFluxoPrevisto } from '@/componentes/relatorios/RelatorioDeFluxoPrevisto';
import { RelatorioDeInadimplencia } from '@/componentes/relatorios/RelatorioDeInadimplencia';
import { EmConstrucao } from './EmConstrucao';
import { CabecalhoDaPagina } from '@/componentes/layout/CabecalhoDaPagina';
import { ContasAPagar } from './ContasAPagar';
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
  if (caminho === '/financeiro/caixa-diario' || caminho === '/financeiro/movimentacoes' || caminho === '/financeiro/sangrias' || caminho === '/financeiro/fechamento') {
    return (
      <ModuloFinanceiroIndisponivel
        titulo="Caixa"
        descricao="Movimentações e fechamento do caixa financeiro."
        limitacao="Não existe entidade ou endpoint de caixa no backend atual. Os pagamentos recebidos e as baixas continuam disponíveis em Contas a receber e Recebimentos."
      />
    );
  }
  if (caminho === '/financeiro/conciliacao' || caminho === '/financeiro/extratos' || caminho === '/financeiro/transferencias') {
    return (
      <ModuloFinanceiroIndisponivel
        titulo="Conciliação bancária"
        descricao="Conferência entre extratos bancários e lançamentos internos."
        limitacao="O backend possui processamento de webhook de cobrança, mas não possui API para importar extratos, listar lançamentos bancários ou executar conciliação manual."
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
