import 'dotenv/config';

function texto(chave: string, padrao?: string): string {
  const valor = process.env[chave]?.trim();
  if (valor) return valor;
  if (padrao !== undefined) return padrao;
  throw new Error(
    `Variavel de ambiente obrigatoria ausente: ${chave}. Copie api/.env.example para api/.env.`,
  );
}

function inteiro(chave: string, padrao: number): number {
  const valor = process.env[chave]?.trim();
  if (!valor) return padrao;
  const numero = Number(valor);
  if (!Number.isInteger(numero)) {
    throw new Error(`Variavel ${chave} deve ser um inteiro; recebido "${valor}".`);
  }
  return numero;
}

function listaDeTextos(chave: string): string[] {
  return (process.env[chave] ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

/**
 * Configuracao lida uma unica vez, na subida.
 *
 * Falhar aqui e melhor que descobrir no meio de um ciclo de cobranca que o
 * segredo do JWT nao existe.
 */
export const ambiente = {
  urlDoBanco: texto('DATABASE_URL'),
  segredoDoToken: texto('JWT_SECRET', 'desenvolvimento-inseguro'),
  validadeDoToken: texto('JWT_EXPIRES_IN', '8h'),
  porta: inteiro('PORT', 3333),
  origemPermitida: texto('CORS_ORIGIN', 'http://localhost:5173'),
  gatewayDeCobranca: texto('COBRANCA_GATEWAY', 'fake'),
  provedorDeMensageria: texto('MENSAGERIA_PROVIDER', 'console'),
  fusoHorario: texto('TZ_NEGOCIO', 'America/Sao_Paulo'),
  nomeDaEmpresa: texto('NOME_DA_EMPRESA', 'Gestrato Loteamentos'),
  urlPublica: texto('URL_PUBLICA', 'http://localhost:5173'),
  /** Quem recebe o resumo do ciclo diario. Vazio desliga o alerta da equipe. */
  emailsDaEquipe: listaDeTextos('EMAILS_DA_EQUIPE'),
  armazenamentoDeArquivos: texto('ARMAZENAMENTO_ARQUIVOS', 'local'),
  diretorioDeArquivos: texto('ARMAZENAMENTO_DIRETORIO', './arquivos'),
  ambienteDeExecucao: texto('NODE_ENV', 'development'),
  /**
   * Credenciais do Twilio, usadas só quando MENSAGERIA_PROVIDER=twilio.
   * Ficam com padrão vazio para não travar a subida de quem usa o console;
   * o adaptador valida a presença ao ser instanciado.
   */
  twilio: {
    accountSid: texto('TWILIO_ACCOUNT_SID', ''),
    authToken: texto('TWILIO_AUTH_TOKEN', ''),
    /** Remetente de WhatsApp no Twilio, ex.: +14155238886. Vazio desliga o canal. */
    whatsappFrom: texto('TWILIO_WHATSAPP_FROM', ''),
    /** Remetente de SMS no Twilio, ex.: +12025550123. Vazio desliga o canal. */
    smsFrom: texto('TWILIO_SMS_FROM', ''),
  },
} as const;

export function estaEmProducao(): boolean {
  return ambiente.ambienteDeExecucao === 'production';
}
