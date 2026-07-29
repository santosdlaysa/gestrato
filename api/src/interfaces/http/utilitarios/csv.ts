import type { Response } from 'express';

/**
 * Geracao de CSV para o Excel em portugues.
 *
 * O Excel pt-BR le CSV com separador `;` (porque a virgula ja e o separador
 * decimal) e so reconhece acentuacao se o arquivo comecar com o BOM de UTF-8.
 * Sem esses dois detalhes o relatorio abre em uma coluna so e com "Jos".
 */

const SEPARADOR = ';';
const FIM_DE_LINHA = '\r\n';
const BOM_UTF8 = '\uFEFF';
const PRECISA_DE_ASPAS = /[;"\r\n]/;
const FUSO_DE_APRESENTACAO = 'America/Sao_Paulo';

/** Uma coluna do arquivo: titulo do cabecalho e como extrair o valor da linha. */
export interface ColunaCsv<T> {
  readonly titulo: string;
  readonly valor: (item: T) => string | number | null | undefined;
}

export function gerarCsv<T>(colunas: readonly ColunaCsv<T>[], itens: readonly T[]): string {
  const cabecalho = colunas.map((coluna) => escaparCampo(coluna.titulo)).join(SEPARADOR);
  const linhas = itens.map((item) =>
    colunas.map((coluna) => escaparCampo(coluna.valor(item))).join(SEPARADOR),
  );
  return BOM_UTF8 + [cabecalho, ...linhas].join(FIM_DE_LINHA) + FIM_DE_LINHA;
}

/**
 * Campo com separador, aspas ou quebra de linha vai entre aspas, e as aspas
 * internas sao dobradas — regra do RFC 4180.
 */
function escaparCampo(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined) return '';
  const texto = String(valor);
  return PRECISA_DE_ASPAS.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/**
 * Centavos para reais com virgula decimal, sem separador de milhar (que o
 * Excel confunde com separador de campo em algumas configuracoes regionais).
 * A conversao e feita por divisao inteira para nao passar por ponto flutuante.
 */
export function formatarMoedaParaCsv(centavos: number): string {
  const sinal = centavos < 0 ? '-' : '';
  const absoluto = Math.abs(Math.trunc(centavos));
  const reais = Math.trunc(absoluto / 100);
  const fracao = String(absoluto % 100).padStart(2, '0');
  return `${sinal}${reais},${fracao}`;
}

/** "AAAA-MM-DD" vira "DD/MM/AAAA"; qualquer outra coisa passa intacta. */
export function formatarDataParaCsv(iso: string | null | undefined): string {
  if (!iso) return '';
  const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : iso;
}

/**
 * Carimbo de auditoria (ISO 8601 UTC) vira "DD/MM/AAAA HH:MM" no fuso de
 * negocio. A API trafega UTC, mas quem abre a planilha quer ver a hora em que
 * a mensagem saiu no relogio dele — mesmo fuso que `DataCivil.hoje` assume.
 */
export function formatarDataHoraParaCsv(iso: string | null | undefined): string {
  if (!iso) return '';
  const instante = new Date(iso);
  if (Number.isNaN(instante.getTime())) return iso;
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: FUSO_DE_APRESENTACAO,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(instante)
    .replace(', ', ' ');
}

export function formatarNumeroParaCsv(valor: number): string {
  return String(valor).replace('.', ',');
}

/** Nome de arquivo com data, no padrao `relatorio-inadimplencia-2026-07-28.csv`. */
export function nomeDeArquivoCsv(base: string, sufixo: string): string {
  return `${base}-${sufixo}.csv`;
}

/**
 * Escreve o CSV como download. O nome do arquivo e higienizado porque ele vai
 * dentro de um cabecalho HTTP — aspas ou quebra de linha ali permitiriam
 * injetar cabecalhos.
 */
export function responderComCsv(resposta: Response, nomeDoArquivo: string, conteudo: string): void {
  const nomeSeguro = nomeDoArquivo.replace(/[^A-Za-z0-9._-]/g, '_');
  resposta.setHeader('Content-Type', 'text/csv; charset=utf-8');
  resposta.setHeader('Content-Disposition', `attachment; filename="${nomeSeguro}"`);
  resposta.send(conteudo);
}
