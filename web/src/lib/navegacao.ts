import type { Papel } from '@/tipos/usuario';

/**
 * Mapa de navegação do Gestrato.
 *
 * Fonte única de verdade para a barra lateral E para a geração de rotas
 * (ver `App.tsx`). Cada folha vira uma rota: as que têm tela pronta são
 * mapeadas em `PAGINAS_PRONTAS`; as demais caem em "Em construção".
 *
 * Ao criar uma tela real, basta apontar o componente no registro de páginas —
 * o caminho já existe aqui.
 */

export interface Folha {
  texto: string;
  para: string;
}

export interface Secao {
  /** Subtítulo opcional para agrupar folhas dentro de um módulo. */
  subtitulo?: string;
  itens: Folha[];
}

export interface Modulo {
  /** Identificador estável, também usado para escolher o ícone. */
  id: string;
  titulo: string;
  secoes: Secao[];
  /** Quando informado, o módulo só aparece para esses papéis. */
  papeis?: Papel[];
}

const MODULOS_BASE: Modulo[] = [
  {
    id: 'estoque',
    titulo: 'Estoque',
    secoes: [{ itens: [{ texto: 'Saldo de estoque', para: '/estoque/saldos' }] }],
  },
  {
    id: 'cobrancas',
    titulo: 'Cobranças',
    secoes: [
      {
        subtitulo: 'Configuração',
        itens: [
          { texto: 'Régua de cobrança', para: '/regua' },
        ],
      },
      {
        subtitulo: 'Operação',
        itens: [
          { texto: 'Cobrança manual', para: '/cobrancas/manual' },
          { texto: 'Cobrança automática', para: '/cobrancas/automatica' },
          { texto: 'Cobrança jurídica', para: '/cobrancas/juridica' },
          { texto: 'Histórico de envios', para: '/cobrancas' },
        ],
      },
      {
        subtitulo: 'Canais',
        itens: [
          { texto: 'WhatsApp', para: '/cobrancas/whatsapp' },
          { texto: 'SMS', para: '/cobrancas/sms' },
          { texto: 'E-mail', para: '/cobrancas/email' },
          { texto: 'Ligações', para: '/cobrancas/ligacoes' },
          { texto: 'Cartas', para: '/cobrancas/cartas' },
          { texto: 'Notificações', para: '/cobrancas/notificacoes' },
        ],
      },
    ],
  },
  {
    id: 'dashboard',
    titulo: 'Dashboard',
    secoes: [
      {
        itens: [
          { texto: 'Executivo', para: '/' },
          { texto: 'Financeiro', para: '/dashboard/financeiro' },
          { texto: 'Comercial', para: '/dashboard/comercial' },
          { texto: 'Inadimplência', para: '/dashboard/inadimplencia' },
          { texto: 'Contratos', para: '/dashboard/contratos' },
          { texto: 'Cobrança', para: '/dashboard/cobranca' },
          { texto: 'Fluxo de caixa', para: '/dashboard/fluxo-de-caixa' },
          { texto: 'Por loteamento', para: '/dashboard/loteamento' },
          { texto: 'Por empresa', para: '/dashboard/empresa' },
        ],
      },
      {
        subtitulo: 'Atalhos',
        itens: [
          { texto: 'Favoritos', para: '/favoritos' },
          { texto: 'Pesquisa global', para: '/pesquisa' },
          { texto: 'Últimos acessos', para: '/ultimos-acessos' },
          { texto: 'Avisos', para: '/avisos' },
          { texto: 'Notificações', para: '/notificacoes' },
          { texto: 'Agenda', para: '/agenda' },
          { texto: 'Tarefas', para: '/tarefas' },
        ],
      },
    ],
  },
  {
    id: 'cadastros',
    titulo: 'Cadastros gerais',
    secoes: [
      {
        subtitulo: 'Estrutura',
        itens: [
          { texto: 'Empresas', para: '/cadastros/empresas' },
          { texto: 'Filiais', para: '/cadastros/filiais' },
          { texto: 'Empreendimentos', para: '/cadastros/empreendimentos' },
        ],
      },
      {
        subtitulo: 'Pessoas',
        itens: [
          { texto: 'Corretores', para: '/cadastros/corretores' },
          { texto: 'Parceiros', para: '/cadastros/parceiros' },
        ],
      },
      {
        subtitulo: 'Financeiro',
        itens: [
          { texto: 'Bancos', para: '/cadastros/bancos' },
          { texto: 'Agências', para: '/cadastros/agencias' },
          { texto: 'Contas bancárias', para: '/cadastros/contas-bancarias' },
          { texto: 'Centros de custo', para: '/cadastros/centros-de-custo' },
          { texto: 'Plano de contas', para: '/cadastros/plano-de-contas' },
          { texto: 'Formas de pagamento', para: '/cadastros/formas-de-pagamento' },
          { texto: 'Índices econômicos', para: '/cadastros/indices-economicos' },
        ],
      },
      {
        subtitulo: 'Parâmetros',
        itens: [
          { texto: 'Tipos de documento', para: '/cadastros/tipos-de-documento' },
          { texto: 'Motivos de cancelamento', para: '/cadastros/motivos-de-cancelamento' },
        ],
      },
      {
        subtitulo: 'Acesso',
        itens: [
          { texto: 'Usuários', para: '/cadastros/usuarios' },
          { texto: 'Perfis', para: '/cadastros/perfis' },
          { texto: 'Permissões', para: '/cadastros/permissoes' },
        ],
      },
    ],
  },
  {
    id: 'crm',
    titulo: 'CRM',
    secoes: [
      {
        itens: [
          { texto: 'Leads', para: '/crm/leads' },
          { texto: 'Funil', para: '/crm/funil' },
          { texto: 'Atendimento', para: '/crm/atendimento' },
          { texto: 'Agenda', para: '/crm/agenda' },
          { texto: 'Visitas', para: '/crm/visitas' },
          { texto: 'Ligações', para: '/crm/ligacoes' },
          { texto: 'WhatsApp', para: '/crm/whatsapp' },
          { texto: 'Histórico', para: '/crm/historico' },
          { texto: 'Propostas', para: '/crm/propostas' },
          { texto: 'Simulações', para: '/crm/simulacoes' },
          { texto: 'Reserva de lote', para: '/crm/reserva-de-lote' },
          { texto: 'Conversão em contrato', para: '/crm/conversao' },
        ],
      },
    ],
  },
  {
    id: 'clientes',
    titulo: 'Clientes',
    secoes: [
      {
        itens: [
          { texto: 'Cadastro', para: '/clientes' },
          { texto: 'Histórico', para: '/clientes/historico' },
          { texto: 'Documentos', para: '/clientes/documentos' },
          { texto: 'Anexos', para: '/clientes/anexos' },
          { texto: 'Dependentes', para: '/clientes/dependentes' },
          { texto: 'Referências', para: '/clientes/referencias' },
          { texto: 'Endereços', para: '/clientes/enderecos' },
          { texto: 'Contatos', para: '/clientes/contatos' },
          { texto: 'Consulta CPF', para: '/clientes/consulta-cpf' },
          { texto: 'Score', para: '/clientes/score' },
          { texto: 'Timeline', para: '/clientes/timeline' },
        ],
      },
    ],
  },
  {
    id: 'contratos',
    titulo: 'Contratos',
    secoes: [
      {
        subtitulo: 'Ciclo de venda',
        itens: [
          { texto: 'Simulação', para: '/contratos/simulacao' },
          { texto: 'Contratos', para: '/contratos' },
          { texto: 'Entrada', para: '/contratos/entrada' },
          { texto: 'Parcelamento', para: '/contratos/parcelamento' },
          { texto: 'Parcelas intermediárias', para: '/contratos/intermediarias' },
          { texto: 'Balões', para: '/contratos/baloes' },
        ],
      },
      {
        subtitulo: 'Movimentações',
        itens: [
          { texto: 'Quitação', para: '/contratos/quitacao' },
          { texto: 'Distrato', para: '/contratos/distrato' },
          { texto: 'Cessão', para: '/contratos/cessao' },
          { texto: 'Transferência', para: '/contratos/transferencia' },
          { texto: 'Renegociação', para: '/contratos/renegociacao' },
          { texto: 'Aditivos', para: '/contratos/aditivos' },
          { texto: 'Reajustes', para: '/contratos/reajustes' },
        ],
      },
      {
        subtitulo: 'Documentação',
        itens: [
          { texto: 'Histórico', para: '/contratos/historico' },
          { texto: 'Assinatura eletrônica', para: '/contratos/assinatura' },
          { texto: 'PDF', para: '/contratos/pdf' },
        ],
      },
    ],
  },
  {
    id: 'parcelas',
    titulo: 'Parcelas',
    secoes: [
      {
        subtitulo: 'Gestão',
        itens: [
          { texto: 'Consulta de parcelas', para: '/parcelas' },
          { texto: 'Geração automática', para: '/parcelas/geracao' },
          { texto: 'Regeração', para: '/parcelas/regeracao' },
          { texto: 'Recalcular', para: '/parcelas/recalcular' },
        ],
      },
      {
        subtitulo: 'Operações',
        itens: [
          { texto: 'Baixa', para: '/parcelas/baixa' },
          { texto: 'Estorno', para: '/parcelas/estorno' },
          { texto: 'Antecipação', para: '/parcelas/antecipacao' },
          { texto: 'Liquidação', para: '/parcelas/liquidacao' },
          { texto: 'Segunda via', para: '/parcelas/segunda-via' },
          { texto: 'Negociação', para: '/parcelas/negociacao' },
        ],
      },
      {
        subtitulo: 'Encargos',
        itens: [
          { texto: 'Juros', para: '/parcelas/juros' },
          { texto: 'Multa', para: '/parcelas/multa' },
          { texto: 'Correção monetária', para: '/parcelas/correcao' },
          { texto: 'Descontos', para: '/parcelas/descontos' },
        ],
      },
    ],
  },
  {
    id: 'boletos',
    titulo: 'Boletos & Pix',
    secoes: [
      {
        subtitulo: 'Emissão',
        itens: [
          { texto: 'Emissão', para: '/boletos/emissao' },
          { texto: 'Segunda via', para: '/boletos/segunda-via' },
          { texto: 'Cancelamento', para: '/boletos/cancelamento' },
          { texto: 'Registro', para: '/boletos/registro' },
          { texto: 'Baixa', para: '/boletos/baixa' },
        ],
      },
      {
        subtitulo: 'Pix',
        itens: [
          { texto: 'Pix', para: '/boletos/pix' },
          { texto: 'QR Code', para: '/boletos/qrcode' },
          { texto: 'Linha digitável', para: '/boletos/linha-digitavel' },
        ],
      },
      {
        subtitulo: 'Arquivos',
        itens: [
          { texto: 'CNAB', para: '/boletos/cnab' },
          { texto: 'OFX', para: '/boletos/ofx' },
          { texto: 'Webhooks', para: '/boletos/webhooks' },
        ],
      },
    ],
  },
  {
    id: 'financeiro',
    titulo: 'Financeiro',
    secoes: [
      {
        subtitulo: 'Contas a receber',
        itens: [
          { texto: 'Contas a receber', para: '/financeiro/contas-a-receber' },
          { texto: 'Recebimentos', para: '/financeiro/recebimentos' },
          { texto: 'Títulos', para: '/financeiro/titulos' },
          { texto: 'Parcelas', para: '/financeiro/parcelas' },
          { texto: 'Baixas', para: '/financeiro/baixas' },
          { texto: 'Renegociações', para: '/financeiro/renegociacoes' },
          { texto: 'Reajustes', para: '/financeiro/reajustes' },
          { texto: 'Controle de inadimplência', para: '/financeiro/inadimplencia' },
          { texto: 'Cobrança escritural', para: '/financeiro/cobranca-escritural' },
          { texto: 'Fluxo previsto', para: '/financeiro/fluxo-previsto' },
        ],
      },
      {
        subtitulo: 'Contas a pagar',
        itens: [
          { texto: 'Contas a pagar', para: '/financeiro/contas-a-pagar' },
          { texto: 'Fornecedores', para: '/financeiro/fornecedores' },
          { texto: 'Pagamentos', para: '/financeiro/pagamentos' },
          { texto: 'Agenda financeira', para: '/financeiro/agenda' },
          { texto: 'Programações', para: '/financeiro/programacoes' },
        ],
      },
      {
        subtitulo: 'Fluxo de caixa',
        itens: [
          { texto: 'Contas bancárias', para: '/financeiro/contas-bancarias' },
          { texto: 'Sócios (aportes)', para: '/financeiro/socios' },
          { texto: 'Empreendimentos', para: '/financeiro/empreendimentos' },
          { texto: 'Categorias financeiras', para: '/financeiro/categorias' },
          { texto: 'Orçamento (previsto)', para: '/financeiro/orcamento' },
        ],
      },
      {
        subtitulo: 'Caixa',
        itens: [
          { texto: 'Caixa diário', para: '/financeiro/caixa-diario' },
          { texto: 'Movimentações', para: '/financeiro/movimentacoes' },
          { texto: 'Sangrias', para: '/financeiro/sangrias' },
          { texto: 'Fechamento', para: '/financeiro/fechamento' },
        ],
      },
      {
        subtitulo: 'Bancos',
        itens: [
          { texto: 'Conciliação', para: '/financeiro/conciliacao' },
          { texto: 'Extratos', para: '/financeiro/extratos' },
          { texto: 'Transferências', para: '/financeiro/transferencias' },
        ],
      },
      {
        subtitulo: 'Análise gerencial',
        itens: [
          { texto: 'DRE gerencial', para: '/financeiro/dre' },
          { texto: 'Balancete', para: '/financeiro/balancete' },
          { texto: 'Análise de resultado', para: '/financeiro/analise-de-resultado' },
          { texto: 'Fluxo de caixa sintético', para: '/financeiro/fluxo-sintetico' },
          { texto: 'Fluxo de caixa analítico', para: '/financeiro/fluxo-analitico' },
          { texto: 'Fluxo de caixa conciliado', para: '/financeiro/fluxo-conciliado' },
        ],
      },
    ],
  },
  {
    id: 'relatorios',
    titulo: 'Relatórios',
    secoes: [
      {
        subtitulo: 'Painéis',
        itens: [
          { texto: 'Central de relatórios', para: '/relatorios' },
          { texto: 'Dashboard executivo', para: '/relatorios/dashboard-executivo' },
        ],
      },
      {
        subtitulo: 'Por tema',
        itens: [
          { texto: 'Clientes', para: '/relatorios/clientes' },
          { texto: 'Contratos', para: '/relatorios/contratos' },
          { texto: 'Parcelas', para: '/relatorios/parcelas' },
          { texto: 'Recebimentos', para: '/relatorios/recebimentos' },
          { texto: 'Fluxo de caixa', para: '/relatorios/fluxo-de-caixa' },
          { texto: 'Inadimplência', para: '/relatorios/inadimplencia' },
          { texto: 'Cobranças', para: '/relatorios/cobrancas' },
          { texto: 'Boletos', para: '/relatorios/boletos' },
          { texto: 'Pix', para: '/relatorios/pix' },
          { texto: 'Corretores', para: '/relatorios/corretores' },
          { texto: 'Comissões', para: '/relatorios/comissoes' },
          { texto: 'Lotes', para: '/relatorios/lotes' },
          { texto: 'Empreendimentos', para: '/relatorios/empreendimentos' },
        ],
      },
      {
        subtitulo: 'Exportação',
        itens: [
          { texto: 'Exportação Excel', para: '/relatorios/exportacao-excel' },
          { texto: 'Exportação PDF', para: '/relatorios/pdf' },
        ],
      },
    ],
  },
  {
    id: 'comercial',
    titulo: 'Comercial',
    secoes: [
      {
        itens: [
          { texto: 'Reserva de lotes', para: '/comercial/reserva-de-lotes' },
          { texto: 'Venda', para: '/comercial/venda' },
          { texto: 'Cancelamento', para: '/comercial/cancelamento' },
          { texto: 'Distrato', para: '/comercial/distrato' },
          { texto: 'Comissão', para: '/comercial/comissao' },
          { texto: 'Ranking de vendedores', para: '/comercial/ranking' },
          { texto: 'Simulações', para: '/comercial/simulacoes' },
        ],
      },
    ],
  },
  {
    id: 'loteamentos',
    titulo: 'Loteamentos',
    secoes: [
      {
        itens: [
          { texto: 'Cadastro', para: '/loteamentos' },
          { texto: 'Quadras', para: '/loteamentos/quadras' },
          { texto: 'Lotes', para: '/lotes' },
          { texto: 'Situação do lote', para: '/loteamentos/situacao' },
          { texto: 'Disponibilidade', para: '/loteamentos/disponibilidade' },
          { texto: 'Mapa interativo', para: '/mapa' },
        ],
      },
    ],
  },
  {
    id: 'portal-cliente',
    titulo: 'Portal do cliente',
    secoes: [
      {
        itens: [
          { texto: 'Login', para: '/portal-cliente/login' },
          { texto: 'Parcelas', para: '/portal-cliente/parcelas' },
          { texto: 'Boletos', para: '/portal-cliente/boletos' },
          { texto: 'Pix', para: '/portal-cliente/pix' },
          { texto: 'Contrato', para: '/portal-cliente/contrato' },
          { texto: 'Histórico', para: '/portal-cliente/historico' },
          { texto: 'Solicitações', para: '/portal-cliente/solicitacoes' },
          { texto: 'Atualização cadastral', para: '/portal-cliente/atualizacao-cadastral' },
          { texto: 'Renegociação', para: '/portal-cliente/renegociacao' },
        ],
      },
    ],
  },
  {
    id: 'portal-corretor',
    titulo: 'Portal do corretor',
    secoes: [
      {
        itens: [
          { texto: 'Clientes', para: '/portal-corretor/clientes' },
          { texto: 'Vendas', para: '/portal-corretor/vendas' },
          { texto: 'Comissão', para: '/portal-corretor/comissao' },
          { texto: 'Contratos', para: '/portal-corretor/contratos' },
          { texto: 'Agenda', para: '/portal-corretor/agenda' },
        ],
      },
    ],
  },
  {
    id: 'documentos',
    titulo: 'Documentos',
    secoes: [
      {
        itens: [
          { texto: 'Contratos', para: '/documentos/contratos' },
          { texto: 'Recibos', para: '/documentos/recibos' },
          { texto: 'Boletos', para: '/documentos/boletos' },
          { texto: 'Declarações', para: '/documentos/declaracoes' },
          { texto: 'Termos', para: '/documentos/termos' },
          { texto: 'Geração de PDF', para: '/documentos/pdf' },
          { texto: 'Assinatura', para: '/documentos/assinatura' },
        ],
      },
    ],
  },
  {
    id: 'configuracoes',
    titulo: 'Configurações',
    secoes: [
      {
        subtitulo: 'Empresa',
        itens: [
          { texto: 'Empresa', para: '/configuracoes/empresa' },
          { texto: 'Logo', para: '/configuracoes/logo' },
          { texto: 'SMTP', para: '/configuracoes/smtp' },
          { texto: 'WhatsApp', para: '/configuracoes/whatsapp' },
          { texto: 'Pix', para: '/configuracoes/pix' },
          { texto: 'Bancos', para: '/configuracoes/bancos' },
        ],
      },
      {
        subtitulo: 'Sistema',
        itens: [
          { texto: 'Integrações', para: '/integracoes' },
          { texto: 'APIs', para: '/configuracoes/apis' },
          { texto: 'Logs', para: '/configuracoes/logs' },
          { texto: 'Auditoria', para: '/auditoria' },
        ],
      },
      {
        subtitulo: 'Segurança',
        itens: [
          { texto: 'Alteração de senha', para: '/configuracoes/senha' },
          { texto: 'Gestão de acessos', para: '/configuracoes/acessos' },
          { texto: 'Usuários logados', para: '/configuracoes/usuarios-logados' },
          { texto: 'Auditoria de login', para: '/configuracoes/auditoria-login' },
          { texto: 'Autorização por IP', para: '/configuracoes/ips' },
          { texto: 'SSO / provedor de identidade', para: '/configuracoes/sso' },
          { texto: 'Convites de usuário', para: '/configuracoes/convites' },
          { texto: 'Agendador de relatórios', para: '/configuracoes/agendador-relatorios' },
          { texto: 'Agendador de tarefas', para: '/configuracoes/agendador-tarefas' },
          { texto: 'Download de backup', para: '/configuracoes/backup' },
        ],
      },
    ],
  },
  {
    id: 'auditoria',
    titulo: 'Auditoria',
    secoes: [
      {
        itens: [
          { texto: 'Trilha de auditoria', para: '/auditoria' },
          { texto: 'Histórico de alterações', para: '/auditoria/historico' },
        ],
      },
    ],
  },
  {
    id: 'integracoes',
    titulo: 'Integrações',
    secoes: [
      {
        subtitulo: 'Cobrança & bancos',
        itens: [
          { texto: 'Asaas', para: '/integracoes/asaas' },
          { texto: 'Banco Inter', para: '/integracoes/inter' },
          { texto: 'Sicredi', para: '/integracoes/sicredi' },
          { texto: 'Cora', para: '/integracoes/cora' },
          { texto: 'Sicoob', para: '/integracoes/sicoob' },
        ],
      },
      {
        subtitulo: 'Mensageria',
        itens: [
          { texto: 'WhatsApp Cloud API', para: '/integracoes/whatsapp' },
          { texto: 'Twilio', para: '/integracoes/twilio' },
          { texto: 'Zenvia', para: '/integracoes/zenvia' },
          { texto: 'Resend', para: '/integracoes/resend' },
        ],
      },
      {
        subtitulo: 'Consultas',
        itens: [
          { texto: 'ViaCEP', para: '/integracoes/viacep' },
          { texto: 'Receita Federal', para: '/integracoes/receita-federal' },
          { texto: 'Serasa', para: '/integracoes/serasa' },
          { texto: 'APIs próprias', para: '/integracoes/apis-proprias' },
        ],
      },
    ],
  },
  {
    id: 'mobile',
    titulo: 'Aplicativo mobile',
    secoes: [
      {
        itens: [
          { texto: 'Dashboard', para: '/mobile/dashboard' },
          { texto: 'Financeiro', para: '/mobile/financeiro' },
          { texto: 'Cobrança', para: '/mobile/cobranca' },
          { texto: 'Contratos', para: '/mobile/contratos' },
          { texto: 'Consulta de clientes', para: '/mobile/clientes' },
          { texto: 'Notificações push', para: '/mobile/push' },
        ],
      },
    ],
  },
];

function moduloBase(id: string): Modulo {
  const modulo = MODULOS_BASE.find((item) => item.id === id);
  if (!modulo) throw new Error(`Módulo de navegação não encontrado: ${id}`);
  return modulo;
}

function combinarModulos(
  id: string,
  titulo: string,
  ...modulos: string[]
): Modulo {
  return {
    id,
    titulo,
    secoes: modulos.flatMap((modulo) => moduloBase(modulo).secoes),
  };
}

/**
 * Organização funcional da barra lateral. Cada módulo reúne o assunto que
 * pertence ao mesmo processo, mesmo quando nasceu de telas diferentes.
 */
const MODULOS_ORGANIZADOS: Modulo[] = [
  moduloBase('dashboard'),
  moduloBase('comercial'),
  moduloBase('clientes'),
  moduloBase('contratos'),
  moduloBase('loteamentos'),
  combinarModulos('cobrancas', 'Cobranças', 'cobrancas', 'parcelas', 'boletos'),
  moduloBase('financeiro'),
  combinarModulos('documentos', 'Documentos e relatórios', 'documentos', 'relatorios'),
  moduloBase('crm'),
  moduloBase('cadastros'),
  moduloBase('mobile'),
  moduloBase('portal-cliente'),
  moduloBase('portal-corretor'),
  moduloBase('auditoria'),
  combinarModulos('configuracoes', 'Configurações', 'configuracoes', 'integracoes'),
];

const PAPEIS_POR_MODULO: Record<string, Papel[]> = {
  comercial: ['ADMINISTRADOR', 'VENDEDOR'],
  clientes: ['ADMINISTRADOR', 'VENDEDOR', 'FINANCEIRO', 'CONSULTA'],
  contratos: ['ADMINISTRADOR', 'VENDEDOR', 'FINANCEIRO', 'CONSULTA'],
  loteamentos: ['ADMINISTRADOR', 'VENDEDOR', 'FINANCEIRO', 'CONSULTA'],
  cobrancas: ['ADMINISTRADOR', 'FINANCEIRO', 'CONSULTA'],
  financeiro: ['ADMINISTRADOR', 'FINANCEIRO', 'CONSULTA'],
  documentos: ['ADMINISTRADOR', 'VENDEDOR', 'FINANCEIRO', 'CONSULTA'],
  crm: ['ADMINISTRADOR', 'VENDEDOR'],
  cadastros: ['ADMINISTRADOR'],
  mobile: ['ADMINISTRADOR', 'VENDEDOR', 'FINANCEIRO'],
  'portal-cliente': ['ADMINISTRADOR', 'VENDEDOR', 'FINANCEIRO'],
  'portal-corretor': ['ADMINISTRADOR', 'VENDEDOR'],
  auditoria: ['ADMINISTRADOR'],
  configuracoes: ['ADMINISTRADOR'],
};

export const MODULOS: Modulo[] = MODULOS_ORGANIZADOS.map((modulo) => ({
  ...modulo,
  papeis: PAPEIS_POR_MODULO[modulo.id],
}));

/** Todas as folhas do mapa, achatadas — usado para gerar rotas. */
export function todasAsFolhas(): Folha[] {
  return MODULOS.flatMap((modulo) => modulo.secoes.flatMap((secao) => secao.itens));
}

/** Caminhos únicos (uma folha pode aparecer em mais de um módulo). */
export function caminhosUnicos(): string[] {
  return Array.from(new Set(todasAsFolhas().map((folha) => folha.para)));
}

interface Localizacao {
  modulo: Modulo;
  secao: Secao;
  folha: Folha;
}

/** Encontra a folha (e seu contexto) por caminho exato. */
export function localizar(caminho: string): Localizacao | null {
  for (const modulo of MODULOS) {
    for (const secao of modulo.secoes) {
      const folha = secao.itens.find((item) => item.para === caminho);
      if (folha) return { modulo, secao, folha };
    }
  }
  return null;
}

/** Módulo cujo conteúdo corresponde ao caminho atual (para abrir o accordion). */
export function moduloDoCaminho(caminho: string): Modulo | null {
  let melhor: { modulo: Modulo; tamanho: number } | null = null;
  for (const modulo of MODULOS) {
    for (const secao of modulo.secoes) {
      for (const item of secao.itens) {
        const casaExato = item.para === caminho;
        const casaPrefixo = item.para !== '/' && caminho.startsWith(item.para + '/');
        if ((casaExato || casaPrefixo) && item.para.length > (melhor?.tamanho ?? -1)) {
          melhor = { modulo, tamanho: item.para.length };
        }
      }
    }
  }
  return melhor?.modulo ?? null;
}
