/**
 * Seed do Gestrato — dados de partida + massa de demonstracao.
 *
 * Roda com `npm run seed` (tsx prisma/seed.ts).
 *
 * O script e IDEMPOTENTE: todo registro tem id deterministico, derivado de uma
 * chave de negocio (numero do contrato, documento do cliente, quadra/lote...),
 * e todo insert e um `upsert`. Rodar duas vezes nao duplica nada e nao muda
 * nenhum valor — a segunda execucao apenas reescreve as mesmas linhas.
 *
 * Convencoes respeitadas aqui, iguais as do dominio:
 *   - dinheiro sempre em centavos inteiros; a soma das parcelas fecha exatamente
 *     com o valor total do contrato (os centavos de sobra caem nas ultimas);
 *   - datas de negocio (@db.Date) sao sempre meia-noite UTC, montadas com
 *     `Date.UTC(...)`, nunca `new Date("2026-09-10")`, que deslocaria o dia
 *     conforme o fuso da maquina;
 *   - "vencida" e "inadimplente" nao sao gravados: nascem da comparacao entre
 *     o vencimento e a data de referencia. Aqui so escolhemos o que foi pago.
 */

import { PrismaClient, type Prisma } from '@prisma/client';
import type {
  Canal,
  FormaPagamento,
  Gatilho,
  IndiceReajuste,
  PapelUsuario,
  TipoParcela,
} from '@prisma/client';
import bcrypt from 'bcryptjs';
import { config as carregarEnv } from 'dotenv';

carregarEnv();

const prisma = new PrismaClient();

// ---------------------------------------------------------------- referencia

/**
 * Data a partir da qual o cenario de cobranca e montado. E constante (e nao
 * "hoje") de proposito: assim os atrasos gerados sao sempre os mesmos e o seed
 * continua idempotente mesmo rodando em dias diferentes.
 * Pode ser sobrescrita com SEED_DATA_REFERENCIA="AAAA-MM-DD".
 */
const DATA_DE_REFERENCIA = lerDataDoAmbiente('SEED_DATA_REFERENCIA', 2026, 7, 28);

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL?.trim() || 'admin@gestrato.local';
const ADMIN_SENHA = process.env.SEED_ADMIN_SENHA?.trim() || 'admin123';

const EMPRESA = 'Gestrato Empreendimentos';

// ---------------------------------------------------------------- utilitarios

/** Data de negocio: meia-noite UTC, do jeito que o Prisma espera em @db.Date. */
function dataUtc(ano: number, mes: number, dia: number): Date {
  return new Date(Date.UTC(ano, mes - 1, dia));
}

function lerDataDoAmbiente(chave: string, ano: number, mes: number, dia: number): Date {
  const bruto = process.env[chave]?.trim();
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(bruto ?? '');
  if (!partes) return dataUtc(ano, mes, dia);
  return dataUtc(Number(partes[1]), Number(partes[2]), Number(partes[3]));
}

const MILISSEGUNDOS_POR_DIA = 86_400_000;

function somarDias(data: Date, dias: number): Date {
  return new Date(data.getTime() + dias * MILISSEGUNDOS_POR_DIA);
}

/** Soma meses ancorando no ultimo dia quando o mes destino e mais curto. */
function somarMeses(data: Date, meses: number): Date {
  const ano = data.getUTCFullYear();
  const mes = data.getUTCMonth() + meses;
  const dia = data.getUTCDate();
  const ultimoDiaDoMesDestino = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
  return new Date(Date.UTC(ano, mes, Math.min(dia, ultimoDiaDoMesDestino)));
}

function diasEntre(inicio: Date, fim: Date): number {
  return Math.round((fim.getTime() - inicio.getTime()) / MILISSEGUNDOS_POR_DIA);
}

function iso(data: Date): string {
  return data.toISOString().slice(0, 10);
}

function formatarReais(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Rateio identico ao de `Dinheiro.ratear`: divide em partes iguais e joga os
 * centavos que sobram nas ultimas parcelas, para a soma fechar com o total.
 */
function ratear(totalCentavos: number, partes: number): number[] {
  const base = Math.trunc(totalCentavos / partes);
  const sobra = totalCentavos - base * partes;
  const primeiraAjustada = partes - Math.abs(sobra);
  const ajuste = Math.sign(sobra);
  return Array.from({ length: partes }, (_, indice) =>
    indice >= primeiraAjustada ? base + ajuste : base,
  );
}

/** Hash FNV-1a de 32 bits — base dos ids deterministicos e dos sorteios. */
function hashDeTexto(texto: string): number {
  let hash = 0x811c9dc5;
  for (let indice = 0; indice < texto.length; indice += 1) {
    hash ^= texto.charCodeAt(indice);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/**
 * Id estavel no formato UUID, derivado da chave de negocio. E o que torna o
 * seed idempotente sem precisar apagar o banco.
 */
function identificador(chave: string): string {
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

/** Gerador pseudoaleatorio com semente (mulberry32): variedade sem perder determinismo. */
function criarSorteio(semente: number): () => number {
  let estado = semente >>> 0;
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let valor = estado;
    valor = Math.imul(valor ^ (valor >>> 15), valor | 1);
    valor ^= valor + Math.imul(valor ^ (valor >>> 7), valor | 61);
    return ((valor ^ (valor >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function obrigatorio<T>(valor: T | undefined | null, mensagem: string): T {
  if (valor === undefined || valor === null) throw new Error(mensagem);
  return valor;
}

// ---------------------------------------------------------------- CPF valido

function digitoVerificador(digitos: readonly number[], pesoInicial: number): number {
  const soma = digitos.reduce((total, digito, indice) => total + digito * (pesoInicial - indice), 0);
  const resto = (soma * 10) % 11;
  return resto === 10 ? 0 : resto;
}

/**
 * Gera um CPF com digitos verificadores corretos a partir de uma base de 9
 * digitos. Nada de numero inventado: o documento passa na validacao do dominio
 * (`CpfCnpj.de`), que e o mesmo caminho usado pela API.
 */
function gerarCpf(base: number): string {
  const noveDigitos = String(Math.abs(base) % 1_000_000_000).padStart(9, '0');
  const digitos = [...noveDigitos].map(Number);
  const primeiro = digitoVerificador(digitos, 10);
  const segundo = digitoVerificador([...digitos, primeiro], 11);
  return `${noveDigitos}${primeiro}${segundo}`;
}

// ---------------------------------------------------------------- usuarios

interface EspecificacaoDeUsuario {
  nome: string;
  email: string;
  senha: string;
  papel: PapelUsuario;
}

const USUARIOS: EspecificacaoDeUsuario[] = [
  { nome: 'Ana Paula Ribeiro', email: ADMIN_EMAIL, senha: ADMIN_SENHA, papel: 'ADMINISTRADOR' },
  { nome: 'Marcos Antunes', email: 'financeiro@gestrato.local', senha: 'financeiro123', papel: 'FINANCEIRO' },
  { nome: 'Juliana Castro', email: 'vendas@gestrato.local', senha: 'vendas123', papel: 'VENDEDOR' },
  { nome: 'Roberto Lima', email: 'consulta@gestrato.local', senha: 'consulta123', papel: 'CONSULTA' },
];

async function semearUsuarios(): Promise<void> {
  for (const usuario of USUARIOS) {
    const senhaHash = bcrypt.hashSync(usuario.senha, 10);
    await prisma.usuario.upsert({
      where: { email: usuario.email },
      create: {
        id: identificador(`usuario:${usuario.email}`),
        nome: usuario.nome,
        email: usuario.email,
        senhaHash,
        papel: usuario.papel,
        ativo: true,
      },
      update: { nome: usuario.nome, senhaHash, papel: usuario.papel, ativo: true },
    });
  }
}

// ---------------------------------------------------------------- regua

interface EspecificacaoDeEventoDeRegua {
  gatilho: Gatilho;
  dias: number;
  canais: Canal[];
  modelo: string;
}

const REGUA_PADRAO: EspecificacaoDeEventoDeRegua[] = [
  { gatilho: 'ANTES_DO_VENCIMENTO', dias: 5, canais: ['WHATSAPP', 'EMAIL'], modelo: 'lembrete' },
  { gatilho: 'ANTES_DO_VENCIMENTO', dias: 1, canais: ['WHATSAPP', 'SMS'], modelo: 'lembrete' },
  { gatilho: 'NO_VENCIMENTO', dias: 0, canais: ['WHATSAPP', 'EMAIL'], modelo: 'vencimento' },
  { gatilho: 'APOS_O_VENCIMENTO', dias: 1, canais: ['WHATSAPP', 'SMS'], modelo: 'atraso' },
  { gatilho: 'APOS_O_VENCIMENTO', dias: 5, canais: ['WHATSAPP', 'EMAIL'], modelo: 'atraso' },
  // Ultimo aviso antes de o contrato passar a contar como inadimplente (8 dias).
  { gatilho: 'APOS_O_VENCIMENTO', dias: 7, canais: ['WHATSAPP', 'EMAIL'], modelo: 'atraso' },
  { gatilho: 'APOS_O_VENCIMENTO', dias: 10, canais: ['WHATSAPP', 'EMAIL'], modelo: 'atraso' },
  { gatilho: 'APOS_O_VENCIMENTO', dias: 30, canais: ['WHATSAPP', 'EMAIL'], modelo: 'atraso_grave' },
];

async function semearRegua(): Promise<void> {
  for (const evento of REGUA_PADRAO) {
    await prisma.eventoDeRegua.upsert({
      where: { gatilho_dias: { gatilho: evento.gatilho, dias: evento.dias } },
      create: {
        id: identificador(`regua:${evento.gatilho}:${evento.dias}`),
        gatilho: evento.gatilho,
        dias: evento.dias,
        canais: evento.canais,
        modelo: evento.modelo,
        ativo: true,
      },
      update: { canais: evento.canais, modelo: evento.modelo, ativo: true },
    });
  }
}

// ---------------------------------------------------------------- modelos

interface EspecificacaoDeModelo {
  chave: string;
  descricao: string;
  assunto: string;
  corpo: string;
}

const MODELOS_DE_MENSAGEM: EspecificacaoDeModelo[] = [
  {
    chave: 'lembrete',
    descricao: 'Aviso amigável enviado antes do vencimento da parcela.',
    assunto: 'Sua parcela {{parcela}} vence em {{vencimento}} — contrato {{contrato}}',
    corpo: [
      'Olá, {{primeiroNome}}! Tudo bem?',
      '',
      'Passando para lembrar que a parcela {{parcela}} do contrato {{contrato}} vence em {{vencimento}}, no valor de {{valor}}.',
      'Referente ao {{loteamento}} — Quadra {{quadra}}, Lote {{lote}}.',
      '',
      'Pix copia e cola:',
      '{{pix}}',
      '',
      'Boleto (linha digitável):',
      '{{linhaDigitavel}}',
      '',
      'Segunda via e extrato do contrato: {{link}}',
      '',
      'Se você já pagou, é só desconsiderar esta mensagem. Qualquer dúvida, pode responder por aqui que a gente ajuda.',
      '',
      'Abraço,',
      '{{empresa}}',
    ].join('\n'),
  },
  {
    chave: 'vencimento',
    descricao: 'Mensagem enviada no dia do vencimento da parcela.',
    assunto: 'Vence hoje: parcela {{parcela}} do contrato {{contrato}}',
    corpo: [
      'Olá, {{primeiroNome}}, bom dia!',
      '',
      'A parcela {{parcela}} do contrato {{contrato}} vence hoje, {{vencimento}}, no valor de {{valor}}.',
      'Lote: {{loteamento}} — Quadra {{quadra}}, Lote {{lote}}.',
      '',
      'Para pagar agora pelo Pix:',
      '{{pix}}',
      '',
      'Ou pelo boleto:',
      '{{linhaDigitavel}}',
      '',
      'Segunda via: {{link}}',
      '',
      'Pagamentos feitos hoje são compensados em até 1 dia útil. Se já efetuou o pagamento, desconsidere — e, se puder, nos envie o comprovante por aqui.',
      '',
      '{{empresa}}',
    ].join('\n'),
  },
  {
    chave: 'atraso',
    descricao: 'Cobrança cordial para parcela em atraso, com valor já atualizado.',
    assunto: 'Parcela {{parcela}} em aberto — contrato {{contrato}}',
    corpo: [
      'Olá, {{primeiroNome}}, tudo bem?',
      '',
      'Consta em nosso sistema que a parcela {{parcela}} do contrato {{contrato}}, com vencimento em {{vencimento}}, ainda está em aberto.',
      'Referente ao {{loteamento}} — Quadra {{quadra}}, Lote {{lote}}.',
      '',
      'São {{diasDeAtraso}} dia(s) de atraso.',
      'Valor original: {{valor}}',
      'Valor atualizado com multa e juros: {{valorAtualizado}}',
      '',
      'Pix copia e cola:',
      '{{pix}}',
      '',
      'Boleto atualizado (linha digitável):',
      '{{linhaDigitavel}}',
      '',
      'Segunda via: {{link}}',
      '',
      'Se o pagamento já foi feito nos últimos dias, pode ignorar esta mensagem — ou nos mandar o comprovante para darmos baixa. E se ficou apertado neste mês, fale com a gente: dá para combinar uma data ou parcelar o saldo.',
      '',
      '{{empresa}}',
    ].join('\n'),
  },
  {
    chave: 'atraso_grave',
    descricao: 'Atraso prolongado: convite à renegociação, com aviso sobre as cláusulas do contrato.',
    assunto: 'Precisamos falar sobre o seu contrato {{contrato}}',
    corpo: [
      '{{primeiroNome}}, tudo bem?',
      '',
      'Estamos entrando em contato porque a parcela {{parcela}} do contrato {{contrato}}, vencida em {{vencimento}}, está com {{diasDeAtraso}} dias de atraso.',
      'Lote: {{loteamento}} — Quadra {{quadra}}, Lote {{lote}}.',
      '',
      'Valor original: {{valor}}',
      'Valor atualizado com multa e juros: {{valorAtualizado}}',
      '',
      'Queremos que esse lote continue sendo seu. Por isso, antes que o contrato siga para as providências previstas em suas cláusulas — notificação extrajudicial e, persistindo a inadimplência, a rescisão —, gostaríamos de encontrar uma solução junto com você.',
      '',
      'Podemos renegociar o saldo em aberto, com entrada reduzida e parcelas que caibam no seu orçamento. Basta responder esta mensagem que um de nossos atendentes apresenta as opções, sem compromisso.',
      '',
      'Se preferir regularizar agora:',
      'Pix: {{pix}}',
      'Boleto: {{linhaDigitavel}}',
      'Segunda via e extrato: {{link}}',
      '',
      'Se o pagamento já foi realizado, por favor nos envie o comprovante para que possamos dar baixa e encerrar a pendência.',
      '',
      'Estamos à disposição,',
      '{{empresa}}',
    ].join('\n'),
  },
];

async function semearModelos(): Promise<void> {
  for (const modelo of MODELOS_DE_MENSAGEM) {
    await prisma.modeloDeMensagem.upsert({
      where: { chave: modelo.chave },
      create: {
        id: identificador(`modelo:${modelo.chave}`),
        chave: modelo.chave,
        descricao: modelo.descricao,
        assunto: modelo.assunto,
        corpo: modelo.corpo,
      },
      update: { descricao: modelo.descricao, assunto: modelo.assunto, corpo: modelo.corpo },
    });
  }
}

// ---------------------------------------------------------------- loteamentos

interface EspecificacaoDeLoteamento {
  chave: string;
  nome: string;
  cidade: string;
  uf: string;
  registroImobiliario: string;
  /** Base de precificacao: valor do metro quadrado, em centavos. */
  precoPorMetroCentavos: number;
  /** Lotes que nao entram em contrato e ficam reservados na vitrine. */
  lotesReservados: string[];
}

const QUADRAS = ['A', 'B', 'C'] as const;
const LOTES_POR_QUADRA = 10;

const LOTEAMENTOS: EspecificacaoDeLoteamento[] = [
  {
    chave: 'palmeiras',
    nome: 'Residencial Jardim das Palmeiras',
    cidade: 'Marília',
    uf: 'SP',
    registroImobiliario: 'Matrícula 38.402 — 2º Oficial de Registro de Imóveis de Marília/SP',
    precoPorMetroCentavos: 42_000,
    lotesReservados: ['C-10'],
  },
  {
    chave: 'cerrado',
    nome: 'Loteamento Portal do Cerrado',
    cidade: 'Rio Verde',
    uf: 'GO',
    registroImobiliario: 'Matrícula 71.155 — Cartório de Registro de Imóveis de Rio Verde/GO',
    precoPorMetroCentavos: 32_000,
    lotesReservados: ['B-07'],
  },
];

interface LoteSemeado {
  id: string;
  loteamentoChave: string;
  loteamentoNome: string;
  quadra: string;
  numero: string;
  areaEmMetrosQuadrados: number;
  valorDeTabelaCentavos: number;
}

/** Chave de busca de um lote: "palmeiras|A|03". */
function chaveDeLote(loteamentoChave: string, quadra: string, numero: string): string {
  return `${loteamentoChave}|${quadra}|${numero}`;
}

async function semearLoteamentos(): Promise<Map<string, LoteSemeado>> {
  const lotes = new Map<string, LoteSemeado>();
  // Uma unica semente para toda a geracao: as areas variam, mas sao sempre as mesmas.
  const sorteio = criarSorteio(hashDeTexto('lotes-do-gestrato'));

  for (const loteamento of LOTEAMENTOS) {
    const loteamentoId = identificador(`loteamento:${loteamento.chave}`);
    await prisma.loteamento.upsert({
      where: { id: loteamentoId },
      create: {
        id: loteamentoId,
        nome: loteamento.nome,
        cidade: loteamento.cidade,
        uf: loteamento.uf,
        registroImobiliario: loteamento.registroImobiliario,
        ativo: true,
      },
      update: {
        nome: loteamento.nome,
        cidade: loteamento.cidade,
        uf: loteamento.uf,
        registroImobiliario: loteamento.registroImobiliario,
        ativo: true,
      },
    });

    for (const quadra of QUADRAS) {
      const quadraId = identificador(`quadra:${loteamento.chave}:${quadra}`);
      await prisma.quadra.upsert({
        where: { loteamentoId_nome: { loteamentoId, nome: quadra } },
        create: { id: quadraId, loteamentoId, nome: quadra },
        update: {},
      });

      for (let indice = 1; indice <= LOTES_POR_QUADRA; indice += 1) {
        const numero = String(indice).padStart(2, '0');
        // Area entre 200 e 450 m2, com uma casa decimal.
        const areaEmMetrosQuadrados = Math.round((200 + sorteio() * 250) * 10) / 10;
        // Valor de tabela coerente com a area, arredondado para a centena de reais.
        const valorDeTabelaCentavos =
          Math.round((areaEmMetrosQuadrados * loteamento.precoPorMetroCentavos) / 10_000) * 10_000;
        const loteId = identificador(`lote:${loteamento.chave}:${quadra}:${numero}`);
        const reservado = loteamento.lotesReservados.includes(`${quadra}-${numero}`);

        await prisma.lote.upsert({
          where: { quadraId_numero: { quadraId, numero } },
          create: {
            id: loteId,
            quadraId,
            numero,
            areaEmMetrosQuadrados,
            valorDeTabelaCentavos,
            situacao: reservado ? 'RESERVADO' : 'DISPONIVEL',
          },
          update: {
            areaEmMetrosQuadrados,
            valorDeTabelaCentavos,
            // Nao rebaixa a situacao de um lote que ja foi vendido em outro fluxo.
            ...(reservado ? { situacao: 'RESERVADO' as const } : {}),
          },
        });

        lotes.set(chaveDeLote(loteamento.chave, quadra, numero), {
          id: loteId,
          loteamentoChave: loteamento.chave,
          loteamentoNome: loteamento.nome,
          quadra,
          numero,
          areaEmMetrosQuadrados,
          valorDeTabelaCentavos,
        });
      }
    }
  }

  return lotes;
}

// ---------------------------------------------------------------- clientes

interface EspecificacaoDeCliente {
  nome: string;
  /** Base de 9 digitos; os verificadores sao calculados. */
  baseDoCpf: number;
  telefone: string;
  email: string;
  nascimento: [number, number, number];
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
}

const CLIENTES: EspecificacaoDeCliente[] = [
  {
    nome: 'Adriana Moraes Figueiredo', baseDoCpf: 314_205_678, telefone: '14991230045',
    email: 'adriana.figueiredo@exemplo.com.br', nascimento: [1984, 3, 12],
    logradouro: 'Rua São Luiz', numero: '412', bairro: 'Centro', cidade: 'Marília', uf: 'SP', cep: '17500080',
  },
  {
    nome: 'Bruno Tadeu Salgado', baseDoCpf: 527_318_904, telefone: '14998760231',
    email: 'bruno.salgado@exemplo.com.br', nascimento: [1979, 11, 3],
    logradouro: 'Avenida Sampaio Vidal', numero: '1.238', bairro: 'Cascata', cidade: 'Marília', uf: 'SP', cep: '17501320',
    },
  {
    nome: 'Carla Mendonça Prado', baseDoCpf: 148_902_357, telefone: '14997451188',
    email: 'carla.prado@exemplo.com.br', nascimento: [1990, 7, 27],
    logradouro: 'Rua Bahia', numero: '765', bairro: 'Fragata', cidade: 'Marília', uf: 'SP', cep: '17515140',
  },
  {
    nome: 'Diego Ferraz Nogueira', baseDoCpf: 692_143_580, telefone: '64992310074',
    email: 'diego.nogueira@exemplo.com.br', nascimento: [1987, 1, 19],
    logradouro: 'Avenida Presidente Vargas', numero: '2.140', bairro: 'Jardim Goiás', cidade: 'Rio Verde', uf: 'GO', cep: '75901180',
  },
  {
    nome: 'Elaine Cristina Barreto', baseDoCpf: 205_874_361, telefone: '64998120563',
    email: 'elaine.barreto@exemplo.com.br', nascimento: [1992, 5, 8],
    logradouro: 'Rua Costa Gomes', numero: '318', bairro: 'Popular', cidade: 'Rio Verde', uf: 'GO', cep: '75903230',
  },
  {
    nome: 'Fábio Junqueira Assis', baseDoCpf: 431_089_726, telefone: '14996330412',
    email: 'fabio.assis@exemplo.com.br', nascimento: [1975, 9, 30],
    logradouro: 'Rua Paraíba', numero: '90', bairro: 'Alto Cafezal', cidade: 'Marília', uf: 'SP', cep: '17502140',
  },
  {
    nome: 'Gabriela Sampaio Ferreira', baseDoCpf: 780_463_215, telefone: '64991470938',
    email: 'gabriela.ferreira@exemplo.com.br', nascimento: [1995, 12, 2],
    logradouro: 'Rua Jerônimo Ferreira', numero: '1.005', bairro: 'Vila Maria', cidade: 'Rio Verde', uf: 'GO', cep: '75904470',
  },
  {
    nome: 'Henrique Vasconcelos Pinto', baseDoCpf: 356_712_048, telefone: '14994880720',
    email: 'henrique.pinto@exemplo.com.br', nascimento: [1981, 2, 14],
    logradouro: 'Rua Nove de Julho', numero: '533', bairro: 'Somenzari', cidade: 'Marília', uf: 'SP', cep: '17506030',
  },
  {
    nome: 'Isabel Cristina Duarte', baseDoCpf: 619_038_472, telefone: '64993560291',
    email: 'isabel.duarte@exemplo.com.br', nascimento: [1988, 6, 21],
    logradouro: 'Avenida Rio Verde', numero: '78', bairro: 'Setor Central', cidade: 'Rio Verde', uf: 'GO', cep: '75901060',
  },
  {
    nome: 'João Vitor Camargo', baseDoCpf: 274_950_183, telefone: '64997720344',
    email: 'joao.camargo@exemplo.com.br', nascimento: [1993, 8, 5],
    logradouro: 'Rua Santa Terezinha', numero: '256', bairro: 'Bairro de Lourdes', cidade: 'Rio Verde', uf: 'GO', cep: '75902410',
  },
  {
    nome: 'Kelly Rodrigues Amorim', baseDoCpf: 508_213_697, telefone: '14992040816',
    email: 'kelly.amorim@exemplo.com.br', nascimento: [1997, 4, 17],
    logradouro: 'Rua Pernambuco', numero: '1.472', bairro: 'Palmital', cidade: 'Marília', uf: 'SP', cep: '17512220',
  },
  {
    nome: 'Luiz Otávio Bittencourt', baseDoCpf: 863_017_524, telefone: '64994650172',
    email: 'luiz.bittencourt@exemplo.com.br', nascimento: [1970, 10, 9],
    logradouro: 'Rua João Neto de Campos', numero: '640', bairro: 'Morada do Sol', cidade: 'Rio Verde', uf: 'GO', cep: '75906180',
  },
];

interface ClienteSemeado {
  id: string;
  nome: string;
  documento: string;
}

async function semearClientes(): Promise<ClienteSemeado[]> {
  const semeados: ClienteSemeado[] = [];

  for (const cliente of CLIENTES) {
    const documento = gerarCpf(cliente.baseDoCpf);
    const id = identificador(`cliente:${documento}`);
    const dados = {
      nome: cliente.nome,
      tipoPessoa: 'FISICA' as const,
      email: cliente.email,
      telefone: cliente.telefone,
      whatsapp: cliente.telefone,
      dataNascimento: dataUtc(cliente.nascimento[0], cliente.nascimento[1], cliente.nascimento[2]),
      logradouro: cliente.logradouro,
      numero: cliente.numero,
      bairro: cliente.bairro,
      cidade: cliente.cidade,
      uf: cliente.uf,
      cep: cliente.cep,
      ativo: true,
    };

    await prisma.cliente.upsert({
      where: { documento },
      create: { id, documento, ...dados },
      update: dados,
    });

    semeados.push({ id, nome: cliente.nome, documento });
  }

  return semeados;
}

// ---------------------------------------------------------------- corretores

const CORRETORES = [
  { chave: 'sergio', nome: 'Sérgio Bastos', baseDoCpf: 402_615_839, email: 'sergio.bastos@exemplo.com.br', telefone: '14991110022', percentualDeComissao: 4 },
  { chave: 'marina', nome: 'Marina Delgado', baseDoCpf: 915_704_263, email: 'marina.delgado@exemplo.com.br', telefone: '64992220133', percentualDeComissao: 5 },
] as const;

async function semearCorretores(): Promise<string[]> {
  const ids: string[] = [];

  for (const corretor of CORRETORES) {
    const id = identificador(`corretor:${corretor.chave}`);
    const documento = gerarCpf(corretor.baseDoCpf);
    await prisma.corretor.upsert({
      where: { id },
      create: {
        id,
        nome: corretor.nome,
        documento,
        email: corretor.email,
        telefone: corretor.telefone,
        percentualDeComissao: corretor.percentualDeComissao,
        ativo: true,
      },
      update: {
        nome: corretor.nome,
        documento,
        email: corretor.email,
        telefone: corretor.telefone,
        percentualDeComissao: corretor.percentualDeComissao,
        ativo: true,
      },
    });
    ids.push(id);
  }

  return ids;
}

// ---------------------------------------------------------------- contratos

interface EspecificacaoDeContrato {
  numero: string;
  clienteIndice: number;
  loteamentoChave: string;
  quadra: string;
  lote: string;
  corretorIndice: number | null;
  assinatura: [number, number, number];
  /** Dia do mes em que as parcelas vencem (<= 28 para nunca faltar dia no mes). */
  diaDeVencimento: number;
  quantidadeDeParcelas: number;
  percentualDeEntrada: number;
  formaPagamentoEntrada: FormaPagamento;
  indiceReajuste: IndiceReajuste;
  diasDeCarencia: number;
  /**
   * null  -> em dia: tudo que venceu antes da data de referencia esta pago.
   * numero -> inadimplente: a parcela mais antiga em aberto vence exatamente
   *           `atrasoAlvoEmDias` antes da data de referencia.
   */
  atrasoAlvoEmDias: number | null;
  observacoes?: string;
}

const CONTRATOS: EspecificacaoDeContrato[] = [
  {
    numero: '2024/0007', clienteIndice: 0, loteamentoChave: 'palmeiras', quadra: 'A', lote: '03',
    corretorIndice: 0, assinatura: [2024, 9, 12], diaDeVencimento: 10, quantidadeDeParcelas: 120,
    percentualDeEntrada: 15, formaPagamentoEntrada: 'PIX', indiceReajuste: 'IGPM', diasDeCarencia: 0,
    atrasoAlvoEmDias: null,
  },
  {
    numero: '2024/0011', clienteIndice: 1, loteamentoChave: 'palmeiras', quadra: 'A', lote: '07',
    corretorIndice: 1, assinatura: [2024, 11, 5], diaDeVencimento: 5, quantidadeDeParcelas: 84,
    percentualDeEntrada: 20, formaPagamentoEntrada: 'TRANSFERENCIA', indiceReajuste: 'IPCA', diasDeCarencia: 5,
    atrasoAlvoEmDias: null,
  },
  {
    numero: '2024/0013', clienteIndice: 8, loteamentoChave: 'cerrado', quadra: 'A', lote: '02',
    corretorIndice: 0, assinatura: [2024, 12, 8], diaDeVencimento: 8, quantidadeDeParcelas: 60,
    percentualDeEntrada: 10, formaPagamentoEntrada: 'BOLETO', indiceReajuste: 'NENHUM', diasDeCarencia: 0,
    atrasoAlvoEmDias: 20, observacoes: 'Cliente informou dificuldade financeira em maio/2026.',
  },
  {
    numero: '2025/0002', clienteIndice: 2, loteamentoChave: 'palmeiras', quadra: 'B', lote: '02',
    corretorIndice: 0, assinatura: [2025, 2, 18], diaDeVencimento: 20, quantidadeDeParcelas: 60,
    percentualDeEntrada: 10, formaPagamentoEntrada: 'PIX', indiceReajuste: 'NENHUM', diasDeCarencia: 0,
    atrasoAlvoEmDias: null,
  },
  {
    numero: '2025/0005', clienteIndice: 7, loteamentoChave: 'palmeiras', quadra: 'B', lote: '06',
    corretorIndice: 1, assinatura: [2025, 3, 25], diaDeVencimento: 25, quantidadeDeParcelas: 72,
    percentualDeEntrada: 15, formaPagamentoEntrada: 'PIX', indiceReajuste: 'IGPM', diasDeCarencia: 0,
    atrasoAlvoEmDias: 3,
  },
  {
    numero: '2025/0009', clienteIndice: 3, loteamentoChave: 'cerrado', quadra: 'A', lote: '05',
    corretorIndice: null, assinatura: [2025, 4, 8], diaDeVencimento: 28, quantidadeDeParcelas: 48,
    percentualDeEntrada: 25, formaPagamentoEntrada: 'TRANSFERENCIA', indiceReajuste: 'INCC', diasDeCarencia: 0,
    atrasoAlvoEmDias: null,
  },
  {
    numero: '2025/0011', clienteIndice: 9, loteamentoChave: 'cerrado', quadra: 'C', lote: '03',
    corretorIndice: null, assinatura: [2025, 6, 14], diaDeVencimento: 14, quantidadeDeParcelas: 48,
    percentualDeEntrada: 20, formaPagamentoEntrada: 'PIX', indiceReajuste: 'IPCA', diasDeCarencia: 0,
    atrasoAlvoEmDias: 75, observacoes: 'Três parcelas em aberto; caso encaminhado para renegociação.',
  },
  {
    numero: '2025/0014', clienteIndice: 4, loteamentoChave: 'cerrado', quadra: 'B', lote: '01',
    corretorIndice: 1, assinatura: [2025, 7, 22], diaDeVencimento: 15, quantidadeDeParcelas: 36,
    percentualDeEntrada: 30, formaPagamentoEntrada: 'PIX', indiceReajuste: 'IGPM', diasDeCarencia: 0,
    atrasoAlvoEmDias: null,
  },
  {
    numero: '2026/0003', clienteIndice: 5, loteamentoChave: 'palmeiras', quadra: 'C', lote: '04',
    corretorIndice: 0, assinatura: [2026, 1, 16], diaDeVencimento: 28, quantidadeDeParcelas: 24,
    percentualDeEntrada: 20, formaPagamentoEntrada: 'BOLETO', indiceReajuste: 'NENHUM', diasDeCarencia: 5,
    atrasoAlvoEmDias: null,
  },
  {
    numero: '2026/0008', clienteIndice: 6, loteamentoChave: 'cerrado', quadra: 'C', lote: '09',
    corretorIndice: null, assinatura: [2026, 5, 6], diaDeVencimento: 12, quantidadeDeParcelas: 96,
    percentualDeEntrada: 12, formaPagamentoEntrada: 'PIX', indiceReajuste: 'IPCA', diasDeCarencia: 0,
    atrasoAlvoEmDias: null,
  },
];

/** Primeiro vencimento: o dia escolhido, no mes seguinte ao da assinatura. */
function calcularPrimeiroVencimento(assinatura: Date, diaDeVencimento: number): Date {
  const candidato = dataUtc(assinatura.getUTCFullYear(), assinatura.getUTCMonth() + 2, diaDeVencimento);
  return candidato.getTime() <= assinatura.getTime() ? somarMeses(candidato, 1) : candidato;
}

const FORMAS_DE_PAGAMENTO_DAS_PARCELAS: FormaPagamento[] = ['PIX', 'PIX', 'BOLETO', 'PIX', 'TRANSFERENCIA'];

interface PlanoDeParcela {
  numero: number;
  tipo: TipoParcela;
  valorOriginalCentavos: number;
  vencimento: Date;
  descricao: string;
}

interface ResumoDoSeed {
  parcelasCriadas: number;
  parcelasPagas: number;
  pagamentos: number;
  contratosInadimplentes: string[];
}

async function semearContratos(
  clientes: ClienteSemeado[],
  corretores: string[],
  lotes: Map<string, LoteSemeado>,
): Promise<ResumoDoSeed> {
  const resumo: ResumoDoSeed = {
    parcelasCriadas: 0,
    parcelasPagas: 0,
    pagamentos: 0,
    contratosInadimplentes: [],
  };

  for (const especificacao of CONTRATOS) {
    const cliente = obrigatorio(
      clientes[especificacao.clienteIndice],
      `Cliente ${especificacao.clienteIndice} nao existe.`,
    );
    const lote = obrigatorio(
      lotes.get(chaveDeLote(especificacao.loteamentoChave, especificacao.quadra, especificacao.lote)),
      `Lote ${especificacao.loteamentoChave} ${especificacao.quadra}-${especificacao.lote} nao existe.`,
    );
    const corretorId =
      especificacao.corretorIndice === null
        ? null
        : obrigatorio(corretores[especificacao.corretorIndice], 'Corretor inexistente.');

    const contratoId = identificador(`contrato:${especificacao.numero}`);
    const dataAssinatura = dataUtc(
      especificacao.assinatura[0],
      especificacao.assinatura[1],
      especificacao.assinatura[2],
    );
    const dataEntrada = somarDias(dataAssinatura, 5);
    const primeiroVencimento = calcularPrimeiroVencimento(dataAssinatura, especificacao.diaDeVencimento);

    const valorTotalCentavos = lote.valorDeTabelaCentavos;
    // Entrada arredondada para o real inteiro — como sai de uma proposta comercial.
    const valorEntradaCentavos =
      Math.round((valorTotalCentavos * especificacao.percentualDeEntrada) / 100 / 100) * 100;
    const valorFinanciadoCentavos = valorTotalCentavos - valorEntradaCentavos;
    const valoresDasParcelas = ratear(valorFinanciadoCentavos, especificacao.quantidadeDeParcelas);

    // ---- plano de pagamento (mesma regra de TermosDoFinanciamento.gerarPlanoDeParcelas)
    const plano: PlanoDeParcela[] = [];
    if (valorEntradaCentavos > 0) {
      plano.push({
        numero: 0,
        tipo: 'ENTRADA',
        valorOriginalCentavos: valorEntradaCentavos,
        vencimento: dataEntrada,
        descricao: 'Entrada',
      });
    }
    for (let indice = 0; indice < especificacao.quantidadeDeParcelas; indice += 1) {
      plano.push({
        numero: indice + 1,
        tipo: 'FINANCIAMENTO',
        valorOriginalCentavos: obrigatorio(valoresDasParcelas[indice], 'Rateio inconsistente.'),
        vencimento: somarMeses(primeiroVencimento, indice),
        descricao: `Parcela ${indice + 1}/${especificacao.quantidadeDeParcelas}`,
      });
    }

    const somaDoPlano = plano.reduce((total, parcela) => total + parcela.valorOriginalCentavos, 0);
    if (somaDoPlano !== valorTotalCentavos) {
      throw new Error(
        `Contrato ${especificacao.numero}: soma das parcelas (${somaDoPlano}) difere do valor total (${valorTotalCentavos}).`,
      );
    }

    await prisma.contrato.upsert({
      where: { id: contratoId },
      create: {
        id: contratoId,
        numero: especificacao.numero,
        clienteId: cliente.id,
        loteId: lote.id,
        corretorId,
        valorTotalCentavos,
        valorEntradaCentavos,
        dataEntrada,
        formaPagamentoEntrada: especificacao.formaPagamentoEntrada,
        quantidadeDeParcelas: especificacao.quantidadeDeParcelas,
        valorDaParcelaCentavos: null,
        primeiroVencimento,
        periodicidade: 'MENSAL',
        multaPorAtrasoPercentual: 2,
        jurosAoMesPercentual: 1,
        diasDeCarencia: especificacao.diasDeCarencia,
        indiceReajuste: especificacao.indiceReajuste,
        status: 'ATIVO',
        dataAssinatura,
        observacoes: especificacao.observacoes ?? null,
      },
      update: {
        clienteId: cliente.id,
        loteId: lote.id,
        corretorId,
        valorTotalCentavos,
        valorEntradaCentavos,
        dataEntrada,
        formaPagamentoEntrada: especificacao.formaPagamentoEntrada,
        quantidadeDeParcelas: especificacao.quantidadeDeParcelas,
        valorDaParcelaCentavos: null,
        primeiroVencimento,
        periodicidade: 'MENSAL',
        diasDeCarencia: especificacao.diasDeCarencia,
        indiceReajuste: especificacao.indiceReajuste,
        status: 'ATIVO',
        dataAssinatura,
        observacoes: especificacao.observacoes ?? null,
      },
    });

    await prisma.lote.update({ where: { id: lote.id }, data: { situacao: 'VENDIDO' } });

    // ---- cenario de cobranca
    // Tudo que vence antes do "corte" ja foi recebido. Para os contratos em dia
    // o corte e a propria data de referencia (a parcela que vence hoje fica em
    // aberto, alimentando o painel "vence hoje"); para os inadimplentes, o corte
    // e recuado para produzir o atraso desejado.
    const corte =
      especificacao.atrasoAlvoEmDias === null
        ? DATA_DE_REFERENCIA
        : somarDias(DATA_DE_REFERENCIA, -especificacao.atrasoAlvoEmDias);

    if (especificacao.atrasoAlvoEmDias !== null) {
      resumo.contratosInadimplentes.push(
        `${especificacao.numero} (${cliente.nome}) — ${especificacao.atrasoAlvoEmDias} dias de atraso`,
      );
    }

    const sorteio = criarSorteio(hashDeTexto(`pagamentos:${especificacao.numero}`));
    const operacoes: Prisma.PrismaPromise<unknown>[] = [];

    for (const parcela of plano) {
      const parcelaId = identificador(
        `parcela:${especificacao.numero}:${parcela.tipo}:${parcela.numero}`,
      );
      const pago = parcela.vencimento.getTime() < corte.getTime();

      // Quem paga, paga entre 3 dias antes e o proprio dia do vencimento —
      // por isso nenhum recebimento carrega multa ou juros.
      const antecipacao = Math.floor(sorteio() * 4);
      const pagoEm = pago ? somarDias(parcela.vencimento, -antecipacao) : null;
      const formaPagamento: FormaPagamento | null = !pago
        ? null
        : parcela.tipo === 'ENTRADA'
          ? especificacao.formaPagamentoEntrada
          : obrigatorio(
              FORMAS_DE_PAGAMENTO_DAS_PARCELAS[parcela.numero % FORMAS_DE_PAGAMENTO_DAS_PARCELAS.length],
              'Forma de pagamento inexistente.',
            );

      const estadoDeCobranca = {
        status: pago ? ('PAGA' as const) : ('PENDENTE' as const),
        valorPagoCentavos: pago ? parcela.valorOriginalCentavos : 0,
        jurosRecebidosCentavos: 0,
        multaRecebidaCentavos: 0,
        descontoConcedidoCentavos: 0,
        pagoEm,
        formaPagamento,
      };

      operacoes.push(
        prisma.parcela.upsert({
          where: { id: parcelaId },
          create: {
            id: parcelaId,
            contratoId,
            numero: parcela.numero,
            tipo: parcela.tipo,
            valorOriginalCentavos: parcela.valorOriginalCentavos,
            vencimento: parcela.vencimento,
            descricao: parcela.descricao,
            ...estadoDeCobranca,
          },
          update: {
            valorOriginalCentavos: parcela.valorOriginalCentavos,
            vencimento: parcela.vencimento,
            descricao: parcela.descricao,
            ...estadoDeCobranca,
          },
        }),
      );
      resumo.parcelasCriadas += 1;

      if (pago && pagoEm && formaPagamento) {
        const pagamentoId = identificador(
          `pagamento:${especificacao.numero}:${parcela.tipo}:${parcela.numero}`,
        );
        const dadosDoPagamento = {
          valorPrincipalCentavos: parcela.valorOriginalCentavos,
          valorJurosCentavos: 0,
          valorMultaCentavos: 0,
          valorDescontoCentavos: 0,
          valorTotalCentavos: parcela.valorOriginalCentavos,
          pagoEm,
          formaPagamento,
          origem: 'MANUAL',
          registradoPor: 'seed',
        };
        operacoes.push(
          prisma.pagamento.upsert({
            where: { id: pagamentoId },
            create: { id: pagamentoId, parcelaId, contratoId, ...dadosDoPagamento },
            update: dadosDoPagamento,
          }),
        );
        resumo.parcelasPagas += 1;
        resumo.pagamentos += 1;
      }
    }

    // Uma transacao por contrato: ou o plano inteiro entra, ou nada entra.
    await prisma.$transaction(operacoes);
  }

  return resumo;
}

// ---------------------------------------------------------------- resumo

async function imprimirResumo(resumo: ResumoDoSeed): Promise<void> {
  const [
    usuarios, loteamentos, quadras, lotes, lotesVendidos, clientes, corretores,
    contratos, parcelas, parcelasPagas, pagamentos, eventos, modelos,
  ] = await Promise.all([
    prisma.usuario.count(),
    prisma.loteamento.count(),
    prisma.quadra.count(),
    prisma.lote.count(),
    prisma.lote.count({ where: { situacao: 'VENDIDO' } }),
    prisma.cliente.count(),
    prisma.corretor.count(),
    prisma.contrato.count(),
    prisma.parcela.count(),
    prisma.parcela.count({ where: { status: 'PAGA' } }),
    prisma.pagamento.count(),
    prisma.eventoDeRegua.count(),
    prisma.modeloDeMensagem.count(),
  ]);

  const emAberto = await prisma.parcela.aggregate({
    where: { status: { in: ['PENDENTE', 'PAGA_PARCIAL'] } },
    _sum: { valorOriginalCentavos: true },
  });
  const vencidas = await prisma.parcela.aggregate({
    where: { status: { in: ['PENDENTE', 'PAGA_PARCIAL'] }, vencimento: { lt: DATA_DE_REFERENCIA } },
    _sum: { valorOriginalCentavos: true },
    _count: true,
  });
  const recebido = await prisma.pagamento.aggregate({ _sum: { valorTotalCentavos: true } });

  const linhas = [
    '',
    '======================================================================',
    `  Seed do Gestrato concluído — data de referência ${iso(DATA_DE_REFERENCIA)}`,
    '======================================================================',
    '',
    '  Cadastros',
    `    usuários ................ ${usuarios}`,
    `    loteamentos ............. ${loteamentos}`,
    `    quadras ................. ${quadras}`,
    `    lotes ................... ${lotes} (${lotesVendidos} vendidos)`,
    `    clientes ................ ${clientes}`,
    `    corretores .............. ${corretores}`,
    '',
    '  Cobrança',
    `    contratos ............... ${contratos}`,
    `    parcelas ................ ${parcelas} (${parcelasPagas} pagas)`,
    `    pagamentos .............. ${pagamentos}`,
    `    etapas da régua ......... ${eventos}`,
    `    modelos de mensagem ..... ${modelos}`,
    '',
    '  Posição financeira',
    `    já recebido ............. ${formatarReais(recebido._sum.valorTotalCentavos ?? 0)}`,
    `    a receber (em aberto) ... ${formatarReais(emAberto._sum.valorOriginalCentavos ?? 0)}`,
    `    vencido ................. ${formatarReais(vencidas._sum.valorOriginalCentavos ?? 0)} em ${vencidas._count} parcela(s)`,
    '',
    '  Contratos inadimplentes plantados de propósito:',
    ...resumo.contratosInadimplentes.map((linha) => `    - ${linha}`),
    '',
    '  Credenciais de acesso (troque em produção):',
    ...USUARIOS.map((usuario) => `    ${usuario.papel.padEnd(14)} ${usuario.email} / ${usuario.senha}`),
    '',
    `  Empresa de demonstração: ${EMPRESA}`,
    '======================================================================',
    '',
  ];

  console.log(linhas.join('\n'));
}

// ---------------------------------------------------------------- execucao

async function main(): Promise<void> {
  console.log(`Semeando o Gestrato (referência ${iso(DATA_DE_REFERENCIA)})...`);

  await semearUsuarios();
  console.log('  usuários ok');

  await semearRegua();
  await semearModelos();
  console.log('  régua de cobrança e modelos de mensagem ok');

  const lotes = await semearLoteamentos();
  console.log('  loteamentos, quadras e lotes ok');

  const clientes = await semearClientes();
  const corretores = await semearCorretores();
  console.log('  clientes e corretores ok');

  const resumo = await semearContratos(clientes, corretores, lotes);
  console.log(`  contratos, parcelas e pagamentos ok (${resumo.parcelasCriadas} parcelas)`);

  await imprimirResumo(resumo);
}

main()
  .catch((erro: unknown) => {
    console.error('\nFalha ao executar o seed:');
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
