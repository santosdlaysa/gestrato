import { ErroDeValidacao } from '../shared/errors.js';
import { DataCivil } from '../value-objects/data-civil.js';
import { Dinheiro } from '../value-objects/dinheiro.js';

/** Nome da variavel sem as chaves. */
export const VARIAVEIS_DISPONIVEIS = [
  'cliente', 'primeiroNome', 'contrato', 'loteamento', 'quadra', 'lote',
  'parcela', 'totalDeParcelas', 'vencimento', 'diasDeAtraso',
  'valor', 'valorAtualizado', 'multa', 'juros',
  'linhaDigitavel', 'pix', 'link', 'empresa',
] as const;
export type Variavel = (typeof VARIAVEIS_DISPONIVEIS)[number];

export interface DadosDaMensagem {
  cliente: string;
  contrato: string;
  loteamento: string;
  quadra: string;
  lote: string;
  parcela: number;
  totalDeParcelas: number;
  vencimento: DataCivil;
  diasDeAtraso: number;
  valor: Dinheiro;
  valorAtualizado: Dinheiro;
  multa: Dinheiro;
  juros: Dinheiro;
  linhaDigitavel: string | null;
  pix: string | null;
  link: string | null;
  empresa: string;
}

export interface ModeloDeMensagem {
  readonly chave: string;
  readonly assunto: string | null;
  readonly corpo: string;
}

export interface MensagemRedigida {
  readonly assunto: string | null;
  readonly corpo: string;
}

const PADRAO_DE_VARIAVEL = /\{\{\s*([a-zA-Z]+)\s*\}\}/g;

/**
 * Preenche os modelos configurados pela loteadora.
 *
 * Fica no dominio porque o texto da cobranca e conteudo de negocio, e porque
 * assim da para validar um modelo (`variaveisDesconhecidas`) no momento em que
 * o usuario salva, em vez de descobrir o `{{valorr}}` errado depois de mandar
 * quatrocentas mensagens.
 */
export class RedatorDeMensagens {
  /** Variaveis citadas no modelo que o sistema nao sabe preencher. */
  static variaveisDesconhecidas(modelo: string): string[] {
    const encontradas = [...modelo.matchAll(PADRAO_DE_VARIAVEL)].map((ocorrencia) => ocorrencia[1]!);
    const conhecidas = new Set<string>(VARIAVEIS_DISPONIVEIS);
    return [...new Set(encontradas.filter((nome) => !conhecidas.has(nome)))];
  }

  static validarModelo(modelo: ModeloDeMensagem): void {
    if (!modelo.corpo?.trim()) {
      throw new ErroDeValidacao(`Modelo "${modelo.chave}" nao pode ter corpo vazio.`);
    }
    const desconhecidas = RedatorDeMensagens.variaveisDesconhecidas(
      `${modelo.assunto ?? ''} ${modelo.corpo}`,
    );
    if (desconhecidas.length > 0) {
      throw new ErroDeValidacao(
        `Modelo "${modelo.chave}" usa variaveis inexistentes: ${desconhecidas.map((v) => `{{${v}}}`).join(', ')}. ` +
          `Disponiveis: ${VARIAVEIS_DISPONIVEIS.join(', ')}.`,
      );
    }
  }

  static redigir(modelo: ModeloDeMensagem, dados: DadosDaMensagem): MensagemRedigida {
    const valores = montarValores(dados);
    return {
      assunto: modelo.assunto ? substituir(modelo.assunto, valores) : null,
      corpo: substituir(modelo.corpo, valores).trim(),
    };
  }
}

function montarValores(dados: DadosDaMensagem): Record<Variavel, string> {
  return {
    cliente: dados.cliente,
    primeiroNome: dados.cliente.trim().split(/\s+/)[0] ?? dados.cliente,
    contrato: dados.contrato,
    loteamento: dados.loteamento,
    quadra: dados.quadra,
    lote: dados.lote,
    parcela: String(dados.parcela),
    totalDeParcelas: String(dados.totalDeParcelas),
    vencimento: dados.vencimento.formatarBr(),
    diasDeAtraso: String(dados.diasDeAtraso),
    valor: dados.valor.formatar(),
    valorAtualizado: dados.valorAtualizado.formatar(),
    multa: dados.multa.formatar(),
    juros: dados.juros.formatar(),
    linhaDigitavel: dados.linhaDigitavel ?? '',
    pix: dados.pix ?? '',
    link: dados.link ?? '',
    empresa: dados.empresa,
  };
}

/** Variavel nao preenchida vira string vazia — mensagem com "{{pix}}" cru e pior que sem nada. */
function substituir(texto: string, valores: Record<string, string>): string {
  return texto.replace(PADRAO_DE_VARIAVEL, (_, nome: string) => valores[nome] ?? '');
}
