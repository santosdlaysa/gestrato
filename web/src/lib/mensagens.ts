const EXEMPLOS: Record<string, string> = {
  cliente: 'Maria Souza Lima',
  primeiroNome: 'Maria',
  contrato: '2026/0001',
  loteamento: 'Residencial Boa Vista',
  quadra: 'B',
  lote: '14',
  parcela: '12',
  totalDeParcelas: '120',
  vencimento: '10/09/2026',
  diasDeAtraso: '37',
  valor: 'R$ 833,34',
  valorAtualizado: 'R$ 860,29',
  multa: 'R$ 16,67',
  juros: 'R$ 10,28',
  linhaDigitavel: '34191.79001 01043.510047 91020.150008 1 96010000086029',
  pix: '00020126580014BR.GOV.BCB.PIX0136f1a2…',
  link: 'https://cobranca.exemplo.com.br/p/abc123',
  empresa: 'Loteadora Exemplo Ltda',
};

/** Substitui `{{variavel}}` por valores de exemplo para a prévia do modelo. */
export function aplicarExemplos(corpo: string): string {
  return corpo.replace(/\{\{\s*(\w+)\s*\}\}/g, (original, chave: string) => EXEMPLOS[chave] ?? original);
}
