import { DataCivil } from '../../domain/value-objects/data-civil.js';
import type { Dinheiro } from '../../domain/value-objects/dinheiro.js';

/**
 * Montagem de codigo de barras e linha digitavel no padrao FEBRABAN.
 *
 * Isto existe para o adaptador `fake` produzir documentos com a ESTRUTURA
 * correta — 44 posicoes, digitos verificadores validos, fator de vencimento
 * certo. Assim o front-end, a impressao do carne e as validacoes de campo sao
 * exercitados de verdade antes de existir integracao bancaria. O banco emissor
 * e a conta sao ficticios: isto nao gera boleto pagavel.
 */

/** Data base do fator de vencimento definida pela FEBRABAN. */
const DATA_BASE_DO_FATOR = DataCivil.de(1997, 10, 7);

export function montarCodigoDeBarras(entrada: {
  codigoDoBanco: string;
  vencimento: DataCivil;
  valor: Dinheiro;
  campoLivre: string;
}): string {
  const banco = entrada.codigoDoBanco.padStart(3, '0').slice(0, 3);
  const moeda = '9';
  const fator = calcularFatorDeVencimento(entrada.vencimento);
  const valor = String(entrada.valor.centavos).padStart(10, '0').slice(-10);
  const campoLivre = entrada.campoLivre.replace(/\D/g, '').padEnd(25, '0').slice(0, 25);

  const semDigito = `${banco}${moeda}${fator}${valor}${campoLivre}`;
  const digitoGeral = calcularModulo11(semDigito);
  return `${banco}${moeda}${digitoGeral}${fator}${valor}${campoLivre}`;
}

/** Converte o codigo de barras de 44 posicoes na linha digitavel de 47. */
export function montarLinhaDigitavel(codigoDeBarras: string): string {
  const banco = codigoDeBarras.slice(0, 3);
  const moeda = codigoDeBarras.slice(3, 4);
  const digitoGeral = codigoDeBarras.slice(4, 5);
  const fatorEValor = codigoDeBarras.slice(5, 19);
  const campoLivre = codigoDeBarras.slice(19, 44);

  const campo1 = `${banco}${moeda}${campoLivre.slice(0, 5)}`;
  const campo2 = campoLivre.slice(5, 15);
  const campo3 = campoLivre.slice(15, 25);

  return [
    `${campo1}${calcularModulo10(campo1)}`,
    `${campo2}${calcularModulo10(campo2)}`,
    `${campo3}${calcularModulo10(campo3)}`,
    digitoGeral,
    fatorEValor,
  ].join('');
}

export function formatarLinhaDigitavel(linha: string): string {
  const digitos = linha.replace(/\D/g, '');
  if (digitos.length !== 47) return linha;
  return [
    `${digitos.slice(0, 5)}.${digitos.slice(5, 10)}`,
    `${digitos.slice(10, 15)}.${digitos.slice(15, 21)}`,
    `${digitos.slice(21, 26)}.${digitos.slice(26, 32)}`,
    digitos.slice(32, 33),
    digitos.slice(33, 47),
  ].join(' ');
}

/**
 * Dias corridos desde 07/10/1997, em quatro posicoes. O contador da a volta a
 * cada 10.000 dias; a FEBRABAN definiu que ao estourar volta para 1000.
 */
function calcularFatorDeVencimento(vencimento: DataCivil): string {
  const dias = DATA_BASE_DO_FATOR.diasAte(vencimento);
  if (dias <= 0) return '0000';
  const fator = dias > 9999 ? ((dias - 1000) % 9000) + 1000 : dias;
  return String(fator).padStart(4, '0');
}

/** Modulo 11 com pesos 2..9 da direita para a esquerda; 0, 10 e 11 viram 1. */
function calcularModulo11(digitos: string): string {
  let peso = 2;
  let soma = 0;
  for (let indice = digitos.length - 1; indice >= 0; indice -= 1) {
    soma += Number(digitos[indice]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const digito = 11 - (soma % 11);
  return digito === 0 || digito > 9 ? '1' : String(digito);
}

/** Modulo 10 com pesos 2 e 1 alternados; produto de dois digitos e somado digito a digito. */
function calcularModulo10(digitos: string): string {
  let peso = 2;
  let soma = 0;
  for (let indice = digitos.length - 1; indice >= 0; indice -= 1) {
    const produto = Number(digitos[indice]) * peso;
    soma += produto > 9 ? Math.floor(produto / 10) + (produto % 10) : produto;
    peso = peso === 2 ? 1 : 2;
  }
  return String((10 - (soma % 10)) % 10);
}
