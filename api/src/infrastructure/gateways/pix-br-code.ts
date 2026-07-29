import type { Dinheiro } from '../../domain/value-objects/dinheiro.js';

/**
 * Gera o payload "Pix copia e cola" (BR Code, padrao EMV do Banco Central).
 *
 * A estrutura e a real, com CRC16 valido — um leitor de QR consegue interpretar
 * o codigo. A chave usada pelo adaptador `fake` e ficticia, entao o pagamento
 * nao acontece; o que se ganha e poder validar layout, leitura e copia do
 * codigo antes de existir conta bancaria integrada.
 */
export function montarPixCopiaECola(entrada: {
  chave: string;
  nomeDoRecebedor: string;
  cidadeDoRecebedor: string;
  valor: Dinheiro;
  identificador: string;
}): string {
  const identificador = normalizar(entrada.identificador, 25).replace(/[^A-Za-z0-9]/g, '') || '***';

  const carga = [
    campo('00', '01'),
    campo('26', campo('00', 'BR.GOV.BCB.PIX') + campo('01', entrada.chave)),
    campo('52', '0000'),
    campo('53', '986'),
    campo('54', entrada.valor.reais.toFixed(2)),
    campo('58', 'BR'),
    campo('59', normalizar(entrada.nomeDoRecebedor, 25)),
    campo('60', normalizar(entrada.cidadeDoRecebedor, 15)),
    campo('62', campo('05', identificador)),
  ].join('');

  // O CRC e calculado sobre o payload ja contendo "6304"; por isso o marcador
  // entra antes do calculo.
  const comMarcador = `${carga}6304`;
  return `${comMarcador}${calcularCrc16(comMarcador)}`;
}

/** Cada campo do BR Code e id (2) + tamanho (2) + valor. */
function campo(identificador: string, valor: string): string {
  return `${identificador}${String(valor.length).padStart(2, '0')}${valor}`;
}

/** O padrao aceita apenas ASCII imprimivel — acento e cortado, nao transliterado errado. */
function normalizar(texto: string, tamanhoMaximo: number): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\x20-\x7E]/g, '')
    .trim()
    .toUpperCase()
    .slice(0, tamanhoMaximo);
}

/** CRC16/CCITT-FALSE: polinomio 0x1021, valor inicial 0xFFFF. */
function calcularCrc16(carga: string): string {
  let resultado = 0xffff;
  for (const caractere of carga) {
    resultado ^= caractere.charCodeAt(0) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      resultado = resultado & 0x8000 ? ((resultado << 1) ^ 0x1021) & 0xffff : (resultado << 1) & 0xffff;
    }
  }
  return resultado.toString(16).toUpperCase().padStart(4, '0');
}
