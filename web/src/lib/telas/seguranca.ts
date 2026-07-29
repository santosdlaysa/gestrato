import type { ConfigDeListagem } from '@/componentes/comuns/PaginaDeListagem';

const telas: Record<string, ConfigDeListagem> = {
  '/configuracoes/acessos': {
    titulo: 'Gestão de acessos',
    descricao: 'Sessões ativas e histórico de acessos',
    textoNovo: 'Encerrar sessões',
    colunas: [
      { titulo: 'Usuário', larga: true },
      { titulo: 'Perfil' },
      { titulo: 'Início da sessão' },
      { titulo: 'Duração' },
      { titulo: 'Situação' },
    ],
    linhas: [
      ['Larissa Andrade', 'Administrador', '29/07/2025 08:12', '2h 41min', { selo: { texto: 'Online', tom: 'ok' } }],
      ['Marcos Vinícius Sousa', 'Financeiro', '29/07/2025 09:05', '1h 48min', { selo: { texto: 'Online', tom: 'ok' } }],
      ['Patrícia Nunes', 'Cobrança', '29/07/2025 07:40', '3h 13min', { selo: { texto: 'Online', tom: 'ok' } }],
      ['Rafael Oliveira', 'Corretor', '28/07/2025 17:22', '0h 34min', { selo: { texto: 'Expirada', tom: 'neutro' } }],
      ['Juliana Castro', 'Comercial', '29/07/2025 10:31', '0h 12min', { selo: { texto: 'Online', tom: 'ok' } }],
    ],
  },
  '/configuracoes/usuarios-logados': {
    titulo: 'Usuários logados',
    descricao: 'Quem está conectado agora',
    textoNovo: 'Forçar logoff',
    colunas: [
      { titulo: 'Usuário', larga: true },
      { titulo: 'IP' },
      { titulo: 'Dispositivo' },
      { titulo: 'Último ping' },
      { titulo: 'Situação' },
    ],
    linhas: [
      ['Larissa Andrade', '200.145.32.10', 'Chrome · Windows', 'há 12 segundos', { selo: { texto: 'Ativo', tom: 'ok' } }],
      ['Marcos Vinícius Sousa', '187.61.204.88', 'Edge · Windows', 'há 40 segundos', { selo: { texto: 'Ativo', tom: 'ok' } }],
      ['Patrícia Nunes', '200.145.32.14', 'Chrome · Android', 'há 2 minutos', { selo: { texto: 'Ocioso', tom: 'atencao' } }],
      ['Juliana Castro', '191.240.11.7', 'Safari · macOS', 'há 5 segundos', { selo: { texto: 'Ativo', tom: 'ok' } }],
    ],
  },
  '/configuracoes/auditoria-login': {
    titulo: 'Auditoria de login',
    descricao: 'Tentativas de acesso ao sistema',
    textoNovo: 'Exportar',
    colunas: [
      { titulo: 'Data/hora' },
      { titulo: 'Usuário', larga: true },
      { titulo: 'IP' },
      { titulo: 'Origem' },
      { titulo: 'Resultado' },
    ],
    linhas: [
      ['29/07/2025 08:12:04', 'Larissa Andrade', '200.145.32.10', 'Boa Vista/RR', { selo: { texto: 'Sucesso', tom: 'ok' } }],
      ['29/07/2025 07:58:31', 'desconhecido', '45.190.22.101', 'Fora do país', { selo: { texto: 'Bloqueado', tom: 'critico' } }],
      ['29/07/2025 07:41:19', 'Patrícia Nunes', '200.145.32.14', 'Boa Vista/RR', { selo: { texto: 'Sucesso', tom: 'ok' } }],
      ['28/07/2025 22:10:50', 'rafael.oliveira', '187.61.204.90', 'Rorainópolis/RR', { selo: { texto: 'Senha inválida', tom: 'vencido' } }],
      ['28/07/2025 18:03:12', 'Marcos Vinícius Sousa', '187.61.204.88', 'Boa Vista/RR', { selo: { texto: 'Sucesso', tom: 'ok' } }],
    ],
  },
  '/configuracoes/ips': {
    titulo: 'Autorização por IP',
    descricao: 'Faixas de IP liberadas para acesso',
    textoNovo: 'Nova regra',
    colunas: [
      { titulo: 'Descrição', larga: true },
      { titulo: 'Faixa de IP' },
      { titulo: 'Aplicação' },
      { titulo: 'Situação' },
    ],
    linhas: [
      ['Matriz Boa Vista', '200.145.32.0/24', 'Todos os usuários', { selo: { texto: 'Ativa', tom: 'ok' } }],
      ['Filial Rorainópolis', '187.61.204.0/24', 'Todos os usuários', { selo: { texto: 'Ativa', tom: 'ok' } }],
      ['VPN administrativo', '10.8.0.0/16', 'Administradores', { selo: { texto: 'Ativa', tom: 'ok' } }],
      ['Bloqueio internacional', '0.0.0.0/0', 'Exceto liberados', { selo: { texto: 'Bloqueio', tom: 'critico' } }],
    ],
  },
  '/configuracoes/sso': {
    titulo: 'SSO / provedor de identidade',
    descricao: 'Login único via provedores externos',
    textoNovo: 'Conectar provedor',
    colunas: [
      { titulo: 'Provedor', larga: true },
      { titulo: 'Protocolo' },
      { titulo: 'Domínio' },
      { titulo: 'Usuários' },
      { titulo: 'Situação' },
    ],
    linhas: [
      ['Google Workspace', 'OAuth 2.0', 'gestrato.com.br', 18, { selo: { texto: 'Conectado', tom: 'ok' } }],
      ['Microsoft Entra ID', 'SAML 2.0', 'gestrato.com.br', 6, { selo: { texto: 'Conectado', tom: 'ok' } }],
      ['Gov.br', 'OIDC', '—', 0, { selo: { texto: 'Não configurado', tom: 'neutro' } }],
    ],
  },
  '/configuracoes/convites': {
    titulo: 'Convites de usuário',
    descricao: 'Convites enviados por e-mail',
    textoNovo: 'Convidar usuário',
    colunas: [
      { titulo: 'E-mail', larga: true },
      { titulo: 'Perfil' },
      { titulo: 'Enviado em' },
      { titulo: 'Situação' },
    ],
    linhas: [
      ['carla.mendes@gestrato.com.br', 'Financeiro', '25/07/2025 14:20', { selo: { texto: 'Aceito', tom: 'ok' } }],
      ['bruno.lima@gestrato.com.br', 'Corretor', '27/07/2025 09:10', { selo: { texto: 'Pendente', tom: 'atencao' } }],
      ['fernanda.rocha@gestrato.com.br', 'Cobrança', '28/07/2025 16:45', { selo: { texto: 'Pendente', tom: 'atencao' } }],
      ['antigo.usuario@gestrato.com.br', 'Comercial', '10/07/2025 11:00', { selo: { texto: 'Expirado', tom: 'vencido' } }],
    ],
  },
  '/configuracoes/agendador-relatorios': {
    titulo: 'Agendador de relatórios',
    descricao: 'Envio automático de relatórios por e-mail',
    textoNovo: 'Novo agendamento',
    colunas: [
      { titulo: 'Relatório', larga: true },
      { titulo: 'Frequência' },
      { titulo: 'Destinatários' },
      { titulo: 'Próximo envio' },
      { titulo: 'Situação' },
    ],
    linhas: [
      ['Inadimplência consolidada', 'Diário · 07h00', 'diretoria@gestrato.com.br', '30/07/2025 07:00', { selo: { texto: 'Ativo', tom: 'ok' } }],
      ['Fluxo de caixa previsto', 'Semanal · segunda', 'financeiro@gestrato.com.br', '04/08/2025 08:00', { selo: { texto: 'Ativo', tom: 'ok' } }],
      ['Recebimentos do mês', 'Mensal · dia 1', 'diretoria@gestrato.com.br', '01/08/2025 06:00', { selo: { texto: 'Ativo', tom: 'ok' } }],
      ['Ranking de vendedores', 'Semanal · sexta', 'comercial@gestrato.com.br', '01/08/2025 18:00', { selo: { texto: 'Pausado', tom: 'neutro' } }],
    ],
  },
  '/configuracoes/agendador-tarefas': {
    titulo: 'Agendador de tarefas',
    descricao: 'Rotinas automáticas do sistema',
    textoNovo: 'Nova rotina',
    colunas: [
      { titulo: 'Tarefa', larga: true },
      { titulo: 'Frequência' },
      { titulo: 'Última execução' },
      { titulo: 'Duração' },
      { titulo: 'Situação' },
    ],
    linhas: [
      ['Geração de boletos do dia', 'Diário · 00h30', '29/07/2025 00:30', '48s', { selo: { texto: 'Sucesso', tom: 'ok' } }],
      ['Régua de cobrança', 'Diário · 08h00', '29/07/2025 08:00', '2min 12s', { selo: { texto: 'Sucesso', tom: 'ok' } }],
      ['Aplicação de juros e multa', 'Diário · 01h00', '29/07/2025 01:00', '1min 05s', { selo: { texto: 'Sucesso', tom: 'ok' } }],
      ['Sincronização Asaas', 'A cada 15min', '29/07/2025 10:45', '8s', { selo: { texto: 'Sucesso', tom: 'ok' } }],
      ['Baixa automática de retorno', 'Diário · 06h00', '29/07/2025 06:00', 'Falhou', { selo: { texto: 'Erro', tom: 'vencido' } }],
    ],
  },
  '/configuracoes/backup': {
    titulo: 'Download de backup',
    descricao: 'Cópias de segurança disponíveis',
    textoNovo: 'Gerar backup',
    colunas: [
      { titulo: 'Arquivo', larga: true },
      { titulo: 'Gerado em' },
      { titulo: 'Tamanho', numerico: true },
      { titulo: 'Tipo' },
      { titulo: 'Situação' },
    ],
    linhas: [
      ['gestrato-2025-07-29.dump', '29/07/2025 03:00', '412 MB', 'Automático', { selo: { texto: 'Disponível', tom: 'ok' } }],
      ['gestrato-2025-07-28.dump', '28/07/2025 03:00', '409 MB', 'Automático', { selo: { texto: 'Disponível', tom: 'ok' } }],
      ['gestrato-2025-07-27.dump', '27/07/2025 03:00', '407 MB', 'Automático', { selo: { texto: 'Disponível', tom: 'ok' } }],
      ['gestrato-manual-2025-07-26.dump', '26/07/2025 15:42', '405 MB', 'Manual', { selo: { texto: 'Disponível', tom: 'ok' } }],
      ['gestrato-2025-07-25.dump', '25/07/2025 03:00', '403 MB', 'Automático', { selo: { texto: 'Expirado', tom: 'neutro' } }],
    ],
  },
};

export default telas;
