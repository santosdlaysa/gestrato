import { useSearchParams } from 'react-router-dom';
import { CabecalhoDaPagina } from '@/componentes/layout/CabecalhoDaPagina';
import { RelatorioDeInadimplencia } from '@/componentes/relatorios/RelatorioDeInadimplencia';
import { RelatorioDeRecebimentos } from '@/componentes/relatorios/RelatorioDeRecebimentos';
import { RelatorioDeFluxoPrevisto } from '@/componentes/relatorios/RelatorioDeFluxoPrevisto';
import { RelatorioDeClientesEmAtraso } from '@/componentes/relatorios/RelatorioDeClientesEmAtraso';
import { RelatorioDeCobrancasRealizadas } from '@/componentes/relatorios/RelatorioDeCobrancasRealizadas';
import { RelatorioDeLotesARetomar } from '@/componentes/relatorios/RelatorioDeLotesARetomar';
import { RelatorioDeContratos } from '@/componentes/relatorios/RelatorioDeContratos';
import { RelatorioDeComissoes } from '@/componentes/relatorios/RelatorioDeComissoes';

type Aba =
  | 'inadimplencia'
  | 'lotes-a-retomar'
  | 'recebimentos'
  | 'fluxo'
  | 'clientes'
  | 'cobrancas'
  | 'contratos'
  | 'comissoes';

const ABAS: { chave: Aba; texto: string }[] = [
  { chave: 'inadimplencia', texto: 'Inadimplência por loteamento' },
  { chave: 'lotes-a-retomar', texto: 'Lotes a retomar' },
  { chave: 'recebimentos', texto: 'Recebimentos por mês' },
  { chave: 'fluxo', texto: 'Fluxo previsto' },
  { chave: 'clientes', texto: 'Clientes em atraso' },
  { chave: 'cobrancas', texto: 'Cobranças realizadas' },
  { chave: 'contratos', texto: 'Contratos' },
  { chave: 'comissoes', texto: 'Comissões' },
];

const ABA_PADRAO: Aba = 'inadimplencia';

/** A aba vive na URL para o dashboard conseguir apontar direto para ela. */
function lerAba(valor: string | null): Aba {
  return ABAS.some((item) => item.chave === valor) ? (valor as Aba) : ABA_PADRAO;
}

export function Relatorios() {
  const [parametros, definirParametros] = useSearchParams();
  const aba = lerAba(parametros.get('aba'));

  return (
    <>
      <CabecalhoDaPagina
        titulo="Relatórios"
        descricao="Consultas gerenciais da carteira, com exportação em CSV"
      />

      <div className="corpo-da-pagina pilha">
        <div className="abas">
          {ABAS.map((item) => (
            <button
              key={item.chave}
              type="button"
              className={aba === item.chave ? 'abas__item abas__item--ativa' : 'abas__item'}
              onClick={() => definirParametros(new URLSearchParams({ aba: item.chave }))}
            >
              {item.texto}
            </button>
          ))}
        </div>

        {aba === 'inadimplencia' && <RelatorioDeInadimplencia />}
        {aba === 'lotes-a-retomar' && <RelatorioDeLotesARetomar />}
        {aba === 'recebimentos' && <RelatorioDeRecebimentos />}
        {aba === 'fluxo' && <RelatorioDeFluxoPrevisto />}
        {aba === 'clientes' && <RelatorioDeClientesEmAtraso />}
        {aba === 'cobrancas' && <RelatorioDeCobrancasRealizadas />}
        {aba === 'contratos' && <RelatorioDeContratos />}
        {aba === 'comissoes' && <RelatorioDeComissoes />}
      </div>
    </>
  );
}
