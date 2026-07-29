const AGRUPADOR_PT_BR = new Intl.NumberFormat('pt-BR');

/**
 * Formata centavos (inteiro) sem passar por ponto flutuante: a parte inteira e
 * os centavos são separados por divisão inteira e remontados como texto.
 */
export function formatarDinheiro(centavos: number | null | undefined): string {
  if (centavos === null || centavos === undefined || Number.isNaN(centavos)) return 'R$ 0,00';
  const inteiro = Math.trunc(centavos);
  const sinal = inteiro < 0 ? '-' : '';
  const absoluto = Math.abs(inteiro);
  const reais = Math.floor(absoluto / 100);
  const resto = absoluto % 100;
  return `${sinal}R$ ${AGRUPADOR_PT_BR.format(reais)},${String(resto).padStart(2, '0')}`;
}

/** Mesma regra de formatação, sem o prefixo — para campos de edição. */
export function centavosParaCampo(centavos: number | null | undefined): string {
  if (centavos === null || centavos === undefined) return '';
  const absoluto = Math.abs(Math.trunc(centavos));
  const sinal = centavos < 0 ? '-' : '';
  return `${sinal}${Math.floor(absoluto / 100)},${String(absoluto % 100).padStart(2, '0')}`;
}

/** "AAAA-MM-DD" → "DD/MM/AAAA". Sem `new Date`: o parse UTC desloca o dia. */
export function formatarData(data: string | null | undefined): string {
  if (!data) return '—';
  const partes = data.slice(0, 10).split('-');
  if (partes.length !== 3) return data;
  const [ano, mes, dia] = partes;
  return `${dia}/${mes}/${ano}`;
}

/** Carimbo ISO em UTC → "DD/MM/AAAA HH:MM" no fuso do navegador. */
export function formatarDataHora(iso: string | null | undefined): string {
  if (!iso) return '—';
  const momento = new Date(iso);
  if (Number.isNaN(momento.getTime())) return iso;
  return momento.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** "2026-07" → "jul/2026" */
export function formatarCompetencia(competencia: string | null | undefined): string {
  if (!competencia) return '—';
  const [ano, mes] = competencia.split('-');
  const nomes = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const indice = Number(mes) - 1;
  if (!ano || indice < 0 || indice > 11) return competencia;
  return `${nomes[indice]}/${ano}`;
}

export function formatarPercentual(valor: number | null | undefined, casas = 1): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—';
  return `${valor.toFixed(casas).replace('.', ',')}%`;
}

export function formatarNumero(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return '—';
  return AGRUPADOR_PT_BR.format(valor);
}

/**
 * Exibe o telefone no padrão brasileiro: `(95) 99137-1313`.
 *
 * A API trafega apenas dígitos — é a forma canônica para busca e comparação, e
 * quem decide como mostrar é a interface. Aceita também o número com código do
 * país (13 dígitos), que aparece no histórico de cobranças, porque lá o destino
 * é gravado no formato enviado ao provedor.
 *
 * Número em formato inesperado é devolvido como veio: inventar uma máscara que
 * não corresponde ao dado guardado atrapalha mais do que a falta de máscara.
 */
/**
 * Aplica máscara de CPF (11 dígitos) ou CNPJ (14). Documento em formato
 * inesperado volta como veio, pela mesma razão do telefone.
 */
export function formatarDocumento(valor: string | null | undefined): string {
  if (!valor) return '—';

  const digitos = valor.replace(/\D/g, '');
  const cpf = /^(\d{3})(\d{3})(\d{3})(\d{2})$/.exec(digitos);
  if (cpf) return `${cpf[1]}.${cpf[2]}.${cpf[3]}-${cpf[4]}`;

  const cnpj = /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/.exec(digitos);
  if (cnpj) return `${cnpj[1]}.${cnpj[2]}.${cnpj[3]}/${cnpj[4]}-${cnpj[5]}`;

  return valor;
}

export function formatarTelefone(valor: string | null | undefined): string {
  if (!valor) return '—';

  const digitos = valor.replace(/\D/g, '');
  // Remove o 55 do país só quando sobra um número brasileiro completo — assim
  // um celular de DDD 55 não perde o próprio DDD.
  const nacional = digitos.replace(/^55(?=\d{10,11}$)/, '');

  const partes = /^(\d{2})(\d{4,5})(\d{4})$/.exec(nacional);
  if (!partes) return valor;

  return `(${partes[1]}) ${partes[2]}-${partes[3]}`;
}

export function rotularEnum(valor: string | null | undefined): string {
  if (!valor) return '—';
  const texto = valor.replace(/_/g, ' ').toLowerCase();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
