/**
 * Converte o que o usuário digitou em reais para centavos inteiros.
 * Trata separador decimal pt-BR (vírgula), separador de milhar e arredonda
 * a partir da terceira casa — tudo em aritmética inteira, sem float.
 * Retorna `null` quando o texto não representa um número.
 */
export function reaisParaCentavos(texto: string): number | null {
  const limpo = texto.replace(/[^0-9,.-]/g, '').trim();
  if (!limpo || limpo === '-') return null;

  const negativo = limpo.startsWith('-');
  const semSinal = limpo.replace(/-/g, '');
  const separador = descobrirSeparadorDecimal(semSinal);

  const { inteiro, fracao } = dividirEmPartes(semSinal, separador);
  if (!inteiro && !fracao) return null;
  if (!/^\d*$/.test(inteiro) || !/^\d*$/.test(fracao)) return null;

  const centavos = montarCentavos(inteiro, fracao);
  return negativo ? -centavos : centavos;
}

function descobrirSeparadorDecimal(texto: string): '.' | ',' | null {
  const ultimaVirgula = texto.lastIndexOf(',');
  const ultimoPonto = texto.lastIndexOf('.');
  if (ultimaVirgula === -1 && ultimoPonto === -1) return null;
  if (ultimaVirgula > ultimoPonto) return ',';
  // Ponto isolado só é decimal quando há 1 ou 2 dígitos depois dele.
  const digitosDepois = texto.length - ultimoPonto - 1;
  const pontos = texto.split('.').length - 1;
  return pontos === 1 && digitosDepois > 0 && digitosDepois <= 2 ? '.' : null;
}

function dividirEmPartes(texto: string, separador: '.' | ',' | null): {
  inteiro: string;
  fracao: string;
} {
  if (!separador) return { inteiro: texto.replace(/[.,]/g, ''), fracao: '' };
  const corte = texto.lastIndexOf(separador);
  return {
    inteiro: texto.slice(0, corte).replace(/[.,]/g, ''),
    fracao: texto.slice(corte + 1).replace(/[.,]/g, ''),
  };
}

function montarCentavos(inteiro: string, fracao: string): number {
  const reais = inteiro === '' ? 0 : Number(inteiro);
  const casas = `${fracao}000`.slice(0, 3);
  const centavosDaFracao = Number(casas.slice(0, 2));
  const arredondamento = Number(casas.charAt(2)) >= 5 ? 1 : 0;
  return reais * 100 + centavosDaFracao + arredondamento;
}
