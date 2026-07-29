import type { ConfigDeListagem } from '@/componentes/comuns/PaginaDeListagem';
import cadastros from './cadastros';
import financeiro from './financeiro';
import financeiroAnalise from './financeiro-analise';
import crmClientesComercial from './crm-clientes-comercial';
import contratosParcelas from './contratos-parcelas';
import cobrancasBoletosDocumentos from './cobrancas-boletos-documentos';
import relatoriosLoteamentosGestao from './relatorios-loteamentos-gestao';
import integracoesPortaisMobile from './integracoes-portais-mobile';
import seguranca from './seguranca';

/**
 * Registro de todas as telas de listagem materializadas (dados de exemplo).
 *
 * Cada arquivo cobre um conjunto de módulos. O dispatcher `Tela` usa este mapa
 * para decidir se renderiza uma listagem pronta ou o placeholder "Em construção".
 */
export const LISTAGENS: Record<string, ConfigDeListagem> = {
  ...cadastros,
  ...financeiro,
  ...financeiroAnalise,
  ...crmClientesComercial,
  ...contratosParcelas,
  ...cobrancasBoletosDocumentos,
  ...relatoriosLoteamentosGestao,
  ...integracoesPortaisMobile,
  ...seguranca,
};
