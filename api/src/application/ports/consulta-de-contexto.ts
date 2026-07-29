/**
 * Dados que acompanham uma parcela quando ela vira cobranca.
 *
 * Emitir um boleto e mandar um WhatsApp precisam das mesmas informacoes
 * espalhadas por cinco tabelas (parcela, contrato, cliente, lote, quadra,
 * loteamento). Carregar isso navegando agregado por agregado geraria N+1 num
 * ciclo que roda sobre centenas de parcelas por dia — por isso e uma consulta
 * de leitura dedicada, resolvida numa ida ao banco.
 */
export interface ContextoDeCobranca {
  readonly parcelaId: string;
  readonly contratoId: string;
  readonly contratoNumero: string;
  readonly totalDeParcelas: number;

  readonly clienteId: string;
  readonly clienteNome: string;
  readonly clienteDocumento: string;
  readonly clienteEmail: string | null;
  readonly clienteTelefone: string | null;
  readonly clienteWhatsApp: string | null;

  readonly logradouro: string;
  readonly numeroDoEndereco: string;
  readonly complemento: string | null;
  readonly bairro: string;
  readonly cidade: string;
  readonly uf: string;
  readonly cep: string;

  readonly loteamento: string;
  readonly quadra: string;
  readonly lote: string;
}

export interface ConsultaDeContextoDeCobranca {
  /** Indexado por `parcelaId`. Parcela sem contexto simplesmente nao vem no mapa. */
  porParcelas(parcelaIds: readonly string[]): Promise<Map<string, ContextoDeCobranca>>;
}
