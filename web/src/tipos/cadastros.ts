export type TipoPessoa = 'FISICA' | 'JURIDICA';

export interface Endereco {
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
}

export interface Cliente {
  id: string;
  nome: string;
  documento: string;
  documentoFormatado?: string;
  tipoPessoa: TipoPessoa;
  email: string | null;
  telefone: string | null;
  whatsapp: string | null;
  dataNascimento: string | null;
  endereco: Endereco | null;
  observacoes: string | null;
  ativo: boolean;
}

export interface EntradaDeCliente {
  nome: string;
  documento: string;
  tipoPessoa: TipoPessoa;
  email: string | null;
  telefone: string | null;
  whatsapp: string | null;
  observacoes: string | null;
  ativo: boolean;
}

export type SituacaoDoLote = 'DISPONIVEL' | 'RESERVADO' | 'VENDIDO' | 'INDISPONIVEL';

export const SITUACOES_DO_LOTE: SituacaoDoLote[] = [
  'DISPONIVEL',
  'RESERVADO',
  'VENDIDO',
  'INDISPONIVEL',
];

export interface Lote {
  id: string;
  quadraId: string | null;
  quadra: string | null;
  loteamentoId: string | null;
  loteamento: string | null;
  numero: string;
  areaEmMetrosQuadrados: number | null;
  valorDeTabelaCentavos: number;
  situacao: SituacaoDoLote;
  descricao: string | null;
}

export interface Loteamento {
  id: string;
  nome: string;
  cidade?: string | null;
  uf?: string | null;
  registroImobiliario?: string | null;
  ativo?: boolean;
}

export interface Corretor {
  id: string;
  nome: string;
}
