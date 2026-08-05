/**
 * Cadastros-base do fluxo de caixa (tesouraria), extraidos das planilhas de
 * controle financeiro: contas bancarias, socios que aportam capital,
 * empreendimentos (centros de custo) e o plano de categorias/rubricas.
 *
 * Fonte unica: e chamado tanto pelo seed completo (`prisma/seed.ts`, para uma
 * base nova/local) quanto pelo runner isolado (`prisma/seed-fluxo-de-caixa.ts`,
 * seguro para rodar contra um banco que ja tem dados reais — so mexe nestes
 * quatro cadastros e nada mais).
 *
 * Idempotente: id deterministico + upsert. Rodar de novo nao duplica nada.
 */

import type { PrismaClient } from '@prisma/client';

// ---- id deterministico (mesmo algoritmo FNV-1a do seed principal) ----------

function hashDeTexto(texto: string): number {
  let hash = 0x811c9dc5;
  for (let indice = 0; indice < texto.length; indice += 1) {
    hash ^= texto.charCodeAt(indice);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** Id estavel no formato UUID, derivado da chave de negocio. */
export function identificador(chave: string): string {
  const blocos = [0, 1, 2, 3].map((rodada) =>
    hashDeTexto(`${chave}#${rodada}`).toString(16).padStart(8, '0'),
  );
  const hex = blocos.join('');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `a${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join('-');
}

// ---- dados ------------------------------------------------------------------

type Natureza = 'RECEBIVEL_VENDA' | 'APORTE' | 'DESPESA_FIXA' | 'DESPESA_VARIAVEL' | 'CUSTO_OBRA';

/** Contas bancarias (colunas da aba "Controle Geral"). */
export const CONTAS_BANCARIAS: Array<{ nome: string; instituicao: string }> = [
  { nome: 'Sicoob', instituicao: 'Sicoob' },
  { nome: 'Sicredi RR', instituicao: 'Sicredi' },
  { nome: 'Sicredi Dracena', instituicao: 'Sicredi' },
];

/** Socios/investidores que fazem os aportes (aba "Controle de aporte"). */
export const SOCIOS_APORTADORES: string[] = ['Portres Urbanismo', 'Poyales', 'Anne 1506', 'MBS'];

/** Empreendimentos / centros de custo (grupos da aba de despesas). */
export const EMPREENDIMENTOS: string[] = [
  'Roraima Habitacional — Administrativo Sede',
  'Loteamento Eldorado I',
  'Loteamento Eldorado II',
  'Loteamento Eldorado do Norte',
  'Residencial Eldorado III (Residencial Boa Vista)',
];

/** Plano de categorias (rubricas), deduplicado a partir das duas planilhas. */
export const GRUPOS_DE_CATEGORIAS: Array<{ natureza: Natureza; tipo: 'ENTRADA' | 'SAIDA'; nomes: string[] }> = [
  {
    natureza: 'RECEBIVEL_VENDA',
    tipo: 'ENTRADA',
    nomes: ['Recebíveis Pix Ato', 'Recebíveis Pix Parcela', 'Recebíveis Boletos', 'Recebíveis Pix Diversos'],
  },
  {
    natureza: 'APORTE',
    tipo: 'ENTRADA',
    nomes: ['Aporte de Capital'],
  },
  {
    natureza: 'DESPESA_FIXA',
    tipo: 'SAIDA',
    nomes: [
      'Aluguel Escritório',
      'Energia Escritório',
      'Energia Container',
      'Despesas Gerais Escritório',
      'Internet Fixa',
      'Starlink',
      'Assinatura Gmail',
      'Assinatura ChatGPT',
      'IPTU',
      'Taxa de Lixo',
      'Salários',
      'Contrato de Prestação de Serviço',
      'Impostos (Folha, FGTS e INSS)',
      'Décimo Terceiro',
      'Férias',
      'Celular Administrativo e Comercial',
      'Retirada Administrativa (Pró-labore)',
      'Mensalidade Contabilidade',
      'Mensalidade Sistema Sienge',
      'Impostos de Retenção Sienge',
      'Mensalidade Serasa',
      'Serviço de Vigilância',
      'Gastos com Container',
    ],
  },
  {
    natureza: 'DESPESA_VARIAVEL',
    tipo: 'SAIDA',
    nomes: [
      'Passagens',
      'Informática',
      'Material de Consumo',
      'Brindes',
      'Correios',
      'Material de Escritório',
      'Publicidade e Propaganda',
      'Anuidade',
      'Uniformes',
      'Hotel',
      'Reembolsos de Despesas de Viagem',
      'Honorários Advocatícios',
      'Móveis / Eletrodomésticos / Eletrônicos',
      'Admissional',
      'Manutenção de Segurança Eletrônica',
      'Combustível',
      'Material de Papelaria',
      'Pagamento de Corretagem',
      'Impostos de Faturamento (PIS, COFINS, CSLL e IRPJ)',
      'Marketing / Campanha',
      'Impulsionamento de Redes Sociais',
      'Acordos Judiciais',
      'Alteração Contratual',
      'Taxa Jucer',
    ],
  },
  {
    natureza: 'CUSTO_OBRA',
    tipo: 'SAIDA',
    nomes: [
      'Areia para Obra',
      'Execução da Obra',
      'Asfalto',
      'Gerenciamento de Obra',
      'Financiamento Bancário (Obra)',
      'Movimentação de Piçarra',
      'Material para Obra',
    ],
  },
];

// ---- semeadura --------------------------------------------------------------

export async function semearFluxoDeCaixa(prisma: PrismaClient): Promise<{
  contas: number;
  socios: number;
  empreendimentos: number;
  categorias: number;
}> {
  for (const conta of CONTAS_BANCARIAS) {
    const id = identificador(`conta-bancaria:${conta.nome}`);
    const dados = { nome: conta.nome, instituicao: conta.instituicao, saldoInicialCentavos: 0, ativa: true };
    await prisma.contaBancaria.upsert({ where: { id }, create: { id, ...dados }, update: dados });
  }

  for (const nome of SOCIOS_APORTADORES) {
    const id = identificador(`socio-aportador:${nome}`);
    await prisma.socioAportador.upsert({ where: { id }, create: { id, nome, ativo: true }, update: { nome, ativo: true } });
  }

  for (const nome of EMPREENDIMENTOS) {
    const id = identificador(`empreendimento-financeiro:${nome}`);
    await prisma.empreendimentoFinanceiro.upsert({ where: { id }, create: { id, nome, ativo: true }, update: { nome, ativo: true } });
  }

  let categorias = 0;
  for (const grupo of GRUPOS_DE_CATEGORIAS) {
    for (let indice = 0; indice < grupo.nomes.length; indice += 1) {
      const nome = grupo.nomes[indice]!;
      const id = identificador(`categoria-financeira:${grupo.natureza}:${nome}`);
      const dados = { nome, tipo: grupo.tipo, natureza: grupo.natureza, ordem: indice, ativa: true };
      await prisma.categoriaFinanceira.upsert({ where: { id }, create: { id, ...dados }, update: dados });
      categorias += 1;
    }
  }

  return { contas: CONTAS_BANCARIAS.length, socios: SOCIOS_APORTADORES.length, empreendimentos: EMPREENDIMENTOS.length, categorias };
}
