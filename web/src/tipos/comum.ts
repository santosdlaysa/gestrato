export interface RespostaPaginada<T> {
  itens: T[];
  total: number;
  pagina: number;
  porPagina: number;
  totalDePaginas: number;
}

export interface CorpoDeErro {
  erro: {
    tipo: string;
    mensagem: string;
    detalhes?: unknown[];
  };
}

export type Periodicidade = 'MENSAL' | 'QUINZENAL' | 'SEMANAL' | 'ANUAL';

export type FormaDePagamento =
  | 'PIX'
  | 'BOLETO'
  | 'DINHEIRO'
  | 'TRANSFERENCIA'
  | 'CARTAO'
  | 'CHEQUE';

export const FORMAS_DE_PAGAMENTO: FormaDePagamento[] = [
  'PIX',
  'BOLETO',
  'DINHEIRO',
  'TRANSFERENCIA',
  'CARTAO',
  'CHEQUE',
];

export const PERIODICIDADES: Periodicidade[] = ['MENSAL', 'QUINZENAL', 'SEMANAL', 'ANUAL'];
