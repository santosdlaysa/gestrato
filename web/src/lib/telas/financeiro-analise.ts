import type { ConfigDeListagem } from '@/componentes/comuns/PaginaDeListagem';

const telas: Record<string, ConfigDeListagem> = {
  '/financeiro/dre': {
    titulo: 'DRE gerencial',
    descricao: 'Demonstrativo de resultado do exercício · Julho/2025',
    textoNovo: 'Nova análise',
    colunas: [
      { titulo: 'Conta', larga: true },
      { titulo: 'Realizado', numerico: true },
      { titulo: 'Orçado', numerico: true },
      { titulo: 'AV %', numerico: true },
      { titulo: 'Situação' },
    ],
    linhas: [
      ['Receita com vendas de lotes', 'R$ 1.842.500,00', 'R$ 1.700.000,00', '100,0%', { selo: { texto: 'Acima', tom: 'ok' } }],
      ['(-) Deduções e cancelamentos', 'R$ 128.300,00', 'R$ 110.000,00', '7,0%', { selo: { texto: 'Atenção', tom: 'atencao' } }],
      ['(=) Receita líquida', 'R$ 1.714.200,00', 'R$ 1.590.000,00', '93,0%', { selo: { texto: 'Positivo', tom: 'ok' } }],
      ['(-) Custos dos lotes vendidos', 'R$ 640.100,00', 'R$ 620.000,00', '34,7%', { selo: { texto: 'Dentro', tom: 'info' } }],
      ['(-) Despesas administrativas', 'R$ 312.740,00', 'R$ 300.000,00', '17,0%', { selo: { texto: 'Dentro', tom: 'info' } }],
      ['(=) Resultado do período', 'R$ 761.360,00', 'R$ 670.000,00', '41,3%', { selo: { texto: 'Lucro', tom: 'ok' } }],
    ],
  },
  '/financeiro/balancete': {
    titulo: 'Balancete',
    descricao: 'Balancete de verificação por conta contábil',
    textoNovo: 'Exportar balancete',
    colunas: [
      { titulo: 'Código' },
      { titulo: 'Conta', larga: true },
      { titulo: 'Saldo anterior', numerico: true },
      { titulo: 'Débito', numerico: true },
      { titulo: 'Crédito', numerico: true },
      { titulo: 'Saldo atual', numerico: true },
    ],
    linhas: [
      ['1.1.01', 'Caixa e equivalentes', 'R$ 85.400,00', 'R$ 412.000,00', 'R$ 388.700,00', 'R$ 108.700,00'],
      ['1.1.02', 'Bancos conta movimento', 'R$ 240.100,00', 'R$ 1.120.500,00', 'R$ 980.300,00', 'R$ 380.300,00'],
      ['1.2.01', 'Contas a receber de clientes', 'R$ 4.320.000,00', 'R$ 1.842.500,00', 'R$ 1.560.200,00', 'R$ 4.602.300,00'],
      ['2.1.01', 'Fornecedores a pagar', 'R$ 210.000,00', 'R$ 180.400,00', 'R$ 225.000,00', 'R$ 254.600,00'],
      ['3.1.01', 'Receita de vendas', 'R$ 0,00', 'R$ 0,00', 'R$ 1.842.500,00', 'R$ 1.842.500,00'],
    ],
  },
  '/financeiro/analise-de-resultado': {
    titulo: 'Análise de resultado',
    descricao: 'Resultado gerencial por loteamento',
    textoNovo: 'Nova análise',
    colunas: [
      { titulo: 'Loteamento', larga: true },
      { titulo: 'Receita', numerico: true },
      { titulo: 'Custos', numerico: true },
      { titulo: 'Margem', numerico: true },
      { titulo: 'Resultado' },
    ],
    linhas: [
      ['Residencial Bela Vista', 'R$ 820.400,00', 'R$ 410.200,00', '50,0%', { selo: { texto: 'Lucro', tom: 'ok' } }],
      ['Jardim das Palmeiras', 'R$ 512.000,00', 'R$ 358.400,00', '30,0%', { selo: { texto: 'Lucro', tom: 'ok' } }],
      ['Parque das Águas', 'R$ 268.900,00', 'R$ 241.900,00', '10,0%', { selo: { texto: 'Atenção', tom: 'atencao' } }],
      ['Loteamento Serra Verde', 'R$ 141.200,00', 'R$ 168.500,00', '-19,3%', { selo: { texto: 'Prejuízo', tom: 'vencido' } }],
    ],
  },
  '/financeiro/fluxo-sintetico': {
    titulo: 'Fluxo de caixa sintético',
    descricao: 'Visão consolidada por período',
    textoNovo: 'Novo relatório',
    colunas: [
      { titulo: 'Período' },
      { titulo: 'Entradas', numerico: true },
      { titulo: 'Saídas', numerico: true },
      { titulo: 'Saldo', numerico: true },
      { titulo: 'Situação' },
    ],
    linhas: [
      ['Abril/2025', 'R$ 1.420.000,00', 'R$ 980.000,00', 'R$ 440.000,00', { selo: { texto: 'Positivo', tom: 'ok' } }],
      ['Maio/2025', 'R$ 1.560.000,00', 'R$ 1.210.000,00', 'R$ 350.000,00', { selo: { texto: 'Positivo', tom: 'ok' } }],
      ['Junho/2025', 'R$ 1.180.000,00', 'R$ 1.240.000,00', '-R$ 60.000,00', { selo: { texto: 'Negativo', tom: 'vencido' } }],
      ['Julho/2025', 'R$ 1.842.500,00', 'R$ 1.301.140,00', 'R$ 541.360,00', { selo: { texto: 'Positivo', tom: 'ok' } }],
    ],
  },
  '/financeiro/fluxo-analitico': {
    titulo: 'Fluxo de caixa analítico',
    descricao: 'Movimentações detalhadas por plano de contas',
    textoNovo: 'Novo relatório',
    colunas: [
      { titulo: 'Data' },
      { titulo: 'Descrição', larga: true },
      { titulo: 'Plano de contas' },
      { titulo: 'Valor', numerico: true },
      { titulo: 'Tipo' },
    ],
    linhas: [
      ['05/07/2025', 'Recebimento parcela CT-2025-0087', '3.1.01 Vendas', 'R$ 2.450,00', { selo: { texto: 'Entrada', tom: 'ok' } }],
      ['08/07/2025', 'Comissão corretor João Batista', '4.2.03 Comissões', 'R$ 1.840,00', { selo: { texto: 'Saída', tom: 'vencido' } }],
      ['12/07/2025', 'Recebimento Pix parcela CT-2025-0142', '3.1.01 Vendas', 'R$ 3.120,00', { selo: { texto: 'Entrada', tom: 'ok' } }],
      ['18/07/2025', 'Pagamento fornecedor topografia', '4.1.05 Serviços', 'R$ 6.500,00', { selo: { texto: 'Saída', tom: 'vencido' } }],
      ['25/07/2025', 'Tarifa bancária de boletos', '4.3.01 Tarifas', 'R$ 480,00', { selo: { texto: 'Saída', tom: 'vencido' } }],
    ],
  },
  '/financeiro/fluxo-conciliado': {
    titulo: 'Fluxo de caixa conciliado',
    descricao: 'Previsto x realizado x conciliado no banco',
    textoNovo: 'Conciliar período',
    colunas: [
      { titulo: 'Período' },
      { titulo: 'Previsto', numerico: true },
      { titulo: 'Realizado', numerico: true },
      { titulo: 'Conciliado', numerico: true },
      { titulo: 'Situação' },
    ],
    linhas: [
      ['Semana 01/07', 'R$ 420.000,00', 'R$ 412.300,00', 'R$ 412.300,00', { selo: { texto: 'Conciliado', tom: 'ok' } }],
      ['Semana 08/07', 'R$ 380.000,00', 'R$ 395.100,00', 'R$ 390.100,00', { selo: { texto: 'Divergência', tom: 'atencao' } }],
      ['Semana 15/07', 'R$ 510.000,00', 'R$ 498.700,00', 'R$ 498.700,00', { selo: { texto: 'Conciliado', tom: 'ok' } }],
      ['Semana 22/07', 'R$ 460.000,00', 'R$ 536.400,00', 'R$ 0,00', { selo: { texto: 'Pendente', tom: 'info' } }],
    ],
  },
};

export default telas;
