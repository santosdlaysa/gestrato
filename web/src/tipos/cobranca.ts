import type { TipoDeDocumento } from './parcela';

export type Canal = 'WHATSAPP' | 'EMAIL' | 'SMS';

export const CANAIS: Canal[] = ['WHATSAPP', 'EMAIL', 'SMS'];

export type StatusDeCobranca = 'ENVIADA' | 'FALHA' | 'IGNORADA' | 'PROGRAMADA' | 'SIMULADA';

export const STATUS_DE_COBRANCA: StatusDeCobranca[] = [
  'ENVIADA',
  'FALHA',
  'IGNORADA',
  'PROGRAMADA',
  'SIMULADA',
];

export interface Cobranca {
  id: string;
  criadaEm: string;
  enviadaEm: string | null;
  canal: Canal;
  evento: string | null;
  status: StatusDeCobranca;
  erro: string | null;
  modelo?: string | null;
  destino?: string | null;
  parcelaId?: string | null;
  parcela?: number | null;
  contratoId?: string | null;
  contrato?: string | null;
  clienteId?: string | null;
  cliente?: string | null;
}

export type GatilhoDaRegua = 'ANTES_DO_VENCIMENTO' | 'NO_VENCIMENTO' | 'APOS_O_VENCIMENTO';

export const GATILHOS: GatilhoDaRegua[] = [
  'ANTES_DO_VENCIMENTO',
  'NO_VENCIMENTO',
  'APOS_O_VENCIMENTO',
];

export interface EventoDaRegua {
  chave?: string;
  descricao?: string;
  gatilho: GatilhoDaRegua;
  dias: number;
  canais: Canal[];
  modelo: string;
  ativo: boolean;
  emitirDocumento: boolean;
  tipoDeDocumento: TipoDeDocumento;
}

export interface Regua {
  eventos: EventoDaRegua[];
}

export interface DetalheDaExecucao {
  parcelaId: string;
  contrato: string;
  cliente: string;
  evento: string;
  canal: Canal;
  resultado: string;
}

export interface ResultadoDaExecucao {
  data: string;
  simulado: boolean;
  avaliadas: number;
  disparosProgramados: number;
  enviadas: number;
  ignoradasPorDuplicidade: number;
  falhas: number;
  semCanal: number;
  detalhes: DetalheDaExecucao[];
}

export interface ModeloDeMensagem {
  chave: string;
  nome?: string | null;
  canal?: Canal | null;
  assunto: string | null;
  corpo: string;
}

export const VARIAVEIS_DE_MENSAGEM: string[] = [
  'cliente',
  'primeiroNome',
  'contrato',
  'loteamento',
  'quadra',
  'lote',
  'parcela',
  'totalDeParcelas',
  'vencimento',
  'diasDeAtraso',
  'valor',
  'valorAtualizado',
  'multa',
  'juros',
  'linhaDigitavel',
  'pix',
  'link',
  'empresa',
];
