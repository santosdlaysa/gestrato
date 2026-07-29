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
  Periodicidade,
  SituacaoLote,
  StatusCobranca,
  StatusContrato,
  StatusDocumento,
  StatusParcela,
  StatusRenegociacao,
  TipoDocumento,
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

/** Digito verificador de CNPJ: mesma aritmetica de `CpfCnpj`, com pesos ciclicos 2..9. */
function digitoDeCnpj(digitos: readonly number[]): number {
  let peso = 2;
  let soma = 0;
  for (let indice = digitos.length - 1; indice >= 0; indice -= 1) {
    soma += digitos[indice]! * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

/**
 * Gera um CNPJ com digitos verificadores corretos (filial 0001) a partir de uma
 * base de 8 digitos. Passa em `CpfCnpj.de`, o mesmo caminho que a listagem de
 * clientes usa ao ler o documento — um CNPJ invalido derrubaria essa consulta.
 */
function gerarCnpj(base: number): string {
  const raiz = String(Math.abs(base) % 100_000_000).padStart(8, '0');
  const doze = `${raiz}0001`;
  const digitos = [...doze].map(Number);
  const primeiro = digitoDeCnpj(digitos);
  const segundo = digitoDeCnpj([...digitos, primeiro]);
  return `${doze}${primeiro}${segundo}`;
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

// ------------------------------------------------ cenarios de status (cobertura)
//
// A massa acima cobre o dia a dia (contratos ativos, em dia e inadimplentes),
// mas nao exercita todos os estados possiveis. Esta secao planta, de proposito,
// pelo menos um registro de CADA valor de enum do schema: contrato quitado,
// cancelado e distratado; parcela paga parcial, cancelada e renegociada; cobranca
// e documento em todos os status; renegociacao vigente, cumprida, rompida e
// cancelada; anexos de todas as categorias; e um webhook processado e um com erro.
//
// Serve de vitrine para a UI (toda cor/selo aparece) e de rede de seguranca: se
// um mapper quebrar em algum estado raro, o seed passa a acusar.

const PASSO_EM_MESES: Record<Periodicidade, number> = {
  MENSAL: 1,
  BIMESTRAL: 2,
  TRIMESTRAL: 3,
  SEMESTRAL: 6,
  ANUAL: 12,
};

/** Vencimento da parcela `indice` (base 0) conforme a periodicidade do plano. */
function vencimentoDoPlano(primeiro: Date, indice: number, periodicidade: Periodicidade): Date {
  return somarMeses(primeiro, indice * PASSO_EM_MESES[periodicidade]);
}

interface OpcoesDeContrato {
  numero: string;
  clienteId: string;
  loteId: string;
  status: StatusContrato;
  valorTotalCentavos: number;
  valorEntradaCentavos: number;
  dataAssinatura: Date;
  dataEntrada: Date;
  primeiroVencimento: Date;
  quantidadeDeParcelas: number;
  periodicidade: Periodicidade;
  formaPagamentoEntrada: FormaPagamento;
  indiceReajuste: IndiceReajuste;
  corretorId?: string | null;
  observacoes?: string;
}

async function inserirContrato(opcoes: OpcoesDeContrato): Promise<string> {
  const id = identificador(`contrato:${opcoes.numero}`);
  const dados = {
    numero: opcoes.numero,
    clienteId: opcoes.clienteId,
    loteId: opcoes.loteId,
    corretorId: opcoes.corretorId ?? null,
    valorTotalCentavos: opcoes.valorTotalCentavos,
    valorEntradaCentavos: opcoes.valorEntradaCentavos,
    dataEntrada: opcoes.dataEntrada,
    formaPagamentoEntrada: opcoes.formaPagamentoEntrada,
    quantidadeDeParcelas: opcoes.quantidadeDeParcelas,
    valorDaParcelaCentavos: null,
    primeiroVencimento: opcoes.primeiroVencimento,
    periodicidade: opcoes.periodicidade,
    multaPorAtrasoPercentual: 2,
    jurosAoMesPercentual: 1,
    diasDeCarencia: 0,
    indiceReajuste: opcoes.indiceReajuste,
    status: opcoes.status,
    dataAssinatura: opcoes.dataAssinatura,
    observacoes: opcoes.observacoes ?? null,
  };
  await prisma.contrato.upsert({ where: { id }, create: { id, ...dados }, update: dados });
  return id;
}

interface OpcoesDeParcela {
  numeroContrato: string;
  contratoId: string;
  numero: number;
  tipo: TipoParcela;
  valorOriginalCentavos: number;
  vencimento: Date;
  descricao: string;
  status: StatusParcela;
  valorPagoCentavos?: number;
  jurosRecebidosCentavos?: number;
  multaRecebidaCentavos?: number;
  descontoConcedidoCentavos?: number;
  pagoEm?: Date | null;
  formaPagamento?: FormaPagamento | null;
  renegociacaoOrigemId?: string | null;
  renegociacaoId?: string | null;
}

/** Parte "cobranca" de uma parcela: o que varia por cenario, sem os campos de identidade. */
type EstadoDaParcela = { status: StatusParcela } & Partial<
  Pick<
    OpcoesDeParcela,
    | 'valorPagoCentavos'
    | 'jurosRecebidosCentavos'
    | 'multaRecebidaCentavos'
    | 'descontoConcedidoCentavos'
    | 'pagoEm'
    | 'formaPagamento'
    | 'renegociacaoOrigemId'
    | 'renegociacaoId'
  >
>;

async function inserirParcela(opcoes: OpcoesDeParcela): Promise<string> {
  const id = identificador(`parcela:${opcoes.numeroContrato}:${opcoes.tipo}:${opcoes.numero}`);
  const dados = {
    contratoId: opcoes.contratoId,
    numero: opcoes.numero,
    tipo: opcoes.tipo,
    valorOriginalCentavos: opcoes.valorOriginalCentavos,
    vencimento: opcoes.vencimento,
    descricao: opcoes.descricao,
    status: opcoes.status,
    valorPagoCentavos: opcoes.valorPagoCentavos ?? 0,
    jurosRecebidosCentavos: opcoes.jurosRecebidosCentavos ?? 0,
    multaRecebidaCentavos: opcoes.multaRecebidaCentavos ?? 0,
    descontoConcedidoCentavos: opcoes.descontoConcedidoCentavos ?? 0,
    pagoEm: opcoes.pagoEm ?? null,
    formaPagamento: opcoes.formaPagamento ?? null,
    renegociacaoOrigemId: opcoes.renegociacaoOrigemId ?? null,
    renegociacaoId: opcoes.renegociacaoId ?? null,
  };
  await prisma.parcela.upsert({ where: { id }, create: { id, ...dados }, update: dados });
  return id;
}

interface OpcoesDePagamento {
  chave: string;
  parcelaId: string;
  contratoId: string;
  valorPrincipalCentavos: number;
  valorJurosCentavos?: number;
  valorMultaCentavos?: number;
  valorDescontoCentavos?: number;
  pagoEm: Date;
  formaPagamento: FormaPagamento;
  origem?: string;
  estornado?: boolean;
  observacoes?: string;
}

async function inserirPagamento(opcoes: OpcoesDePagamento): Promise<void> {
  const id = identificador(`pagamento:${opcoes.chave}`);
  const juros = opcoes.valorJurosCentavos ?? 0;
  const multa = opcoes.valorMultaCentavos ?? 0;
  const desconto = opcoes.valorDescontoCentavos ?? 0;
  const dados = {
    parcelaId: opcoes.parcelaId,
    contratoId: opcoes.contratoId,
    valorPrincipalCentavos: opcoes.valorPrincipalCentavos,
    valorJurosCentavos: juros,
    valorMultaCentavos: multa,
    valorDescontoCentavos: desconto,
    valorTotalCentavos: opcoes.valorPrincipalCentavos + juros + multa - desconto,
    pagoEm: opcoes.pagoEm,
    formaPagamento: opcoes.formaPagamento,
    origem: opcoes.origem ?? 'MANUAL',
    registradoPor: 'seed',
    estornado: opcoes.estornado ?? false,
    observacoes: opcoes.observacoes ?? null,
  };
  await prisma.pagamento.upsert({ where: { id }, create: { id, ...dados }, update: dados });
}

interface OpcoesDeDocumento {
  chave: string;
  contratoId: string;
  parcelaId: string;
  tipo: TipoDocumento;
  status: StatusDocumento;
  valorCentavos: number;
  vencimento: Date;
  baixadoEm?: Date | null;
}

async function inserirDocumento(opcoes: OpcoesDeDocumento): Promise<void> {
  const id = identificador(`documento:${opcoes.chave}`);
  const identificadorExterno = `fake-${opcoes.chave}`;
  const temBoleto = opcoes.tipo === 'BOLETO' || opcoes.tipo === 'BOLETO_COM_PIX';
  const temPix = opcoes.tipo === 'PIX' || opcoes.tipo === 'BOLETO_COM_PIX';
  const dados = {
    contratoId: opcoes.contratoId,
    parcelaId: opcoes.parcelaId,
    tipo: opcoes.tipo,
    provedor: 'fake',
    identificadorExterno,
    nossoNumero: temBoleto ? `0000${hashDeTexto(opcoes.chave) % 100000}`.slice(-8) : null,
    linhaDigitavel: temBoleto
      ? '34191.79001 01043.510047 91020.150008 8 99990000' + String(opcoes.valorCentavos).padStart(6, '0')
      : null,
    codigoDeBarras: temBoleto ? '34198999900000000000104351004791020150008' : null,
    pixCopiaECola: temPix
      ? '00020126360014BR.GOV.BCB.PIX0114+5514999990000520400005303986540' +
        (opcoes.valorCentavos / 100).toFixed(2) +
        '5802BR5920GESTRATO EMPREEND6009SAO PAULO62070503***6304ABCD'
      : null,
    pixQrCodeBase64: null,
    urlDoDocumento: `https://demo.gestrato.local/documentos/${identificadorExterno}`,
    valorCentavos: opcoes.valorCentavos,
    vencimento: opcoes.vencimento,
    status: opcoes.status,
    baixadoEm: opcoes.baixadoEm ?? (opcoes.status === 'PAGO' ? opcoes.vencimento : null),
  };
  await prisma.documentoDeCobranca.upsert({
    where: { provedor_identificadorExterno: { provedor: 'fake', identificadorExterno } },
    create: { id, ...dados },
    update: dados,
  });
}

interface OpcoesDeCobranca {
  chave: string;
  contratoId: string;
  parcelaId: string;
  clienteId: string;
  gatilho: Gatilho;
  dias: number;
  canal: Canal;
  destino: string;
  status: StatusCobranca;
  valorCobradoCentavos: number;
  dataDeReferencia: Date;
  enviadaEm?: Date | null;
  ultimoErro?: string | null;
  tentativas?: number;
}

async function inserirCobranca(opcoes: OpcoesDeCobranca): Promise<void> {
  const id = identificador(`cobranca:${opcoes.chave}`);
  const chaveDeIdempotencia = `demo:${opcoes.chave}`;
  const dados = {
    contratoId: opcoes.contratoId,
    parcelaId: opcoes.parcelaId,
    clienteId: opcoes.clienteId,
    gatilho: opcoes.gatilho,
    dias: opcoes.dias,
    canal: opcoes.canal,
    destino: opcoes.destino,
    assunto: opcoes.canal === 'EMAIL' ? 'Sua parcela do contrato' : null,
    mensagem: 'Mensagem de cobranca gerada pelo seed de demonstracao.',
    valorCobradoCentavos: opcoes.valorCobradoCentavos,
    dataDeReferencia: opcoes.dataDeReferencia,
    status: opcoes.status,
    tentativas: opcoes.tentativas ?? (opcoes.status === 'ENVIADA' ? 1 : opcoes.status === 'FALHA' ? 3 : 0),
    ultimoErro: opcoes.ultimoErro ?? (opcoes.status === 'FALHA' ? 'Numero de WhatsApp invalido.' : null),
    identificadorNoProvedor: opcoes.status === 'ENVIADA' ? `msg-${hashDeTexto(opcoes.chave)}` : null,
    enviadaEm: opcoes.enviadaEm ?? (opcoes.status === 'ENVIADA' ? opcoes.dataDeReferencia : null),
  };
  await prisma.cobranca.upsert({
    where: { chaveDeIdempotencia },
    create: { id, chaveDeIdempotencia, ...dados },
    update: dados,
  });
}

interface OpcoesDeRenegociacao {
  chave: string;
  contratoId: string;
  status: StatusRenegociacao;
  saldoOriginalCentavos: number;
  encargosCentavos?: number;
  descontoCentavos?: number;
  valorNegociadoCentavos: number;
  entradaCentavos?: number;
  dataEntrada?: Date | null;
  quantidadeDeParcelas: number;
  primeiroVencimento: Date;
  periodicidade: Periodicidade;
  acordadoEm: Date;
  motivo?: string;
}

async function inserirRenegociacao(opcoes: OpcoesDeRenegociacao): Promise<string> {
  const id = identificador(`renegociacao:${opcoes.chave}`);
  const dados = {
    contratoId: opcoes.contratoId,
    saldoOriginalCentavos: opcoes.saldoOriginalCentavos,
    encargosCentavos: opcoes.encargosCentavos ?? 0,
    descontoCentavos: opcoes.descontoCentavos ?? 0,
    valorNegociadoCentavos: opcoes.valorNegociadoCentavos,
    entradaCentavos: opcoes.entradaCentavos ?? 0,
    dataEntrada: opcoes.dataEntrada ?? null,
    quantidadeDeParcelas: opcoes.quantidadeDeParcelas,
    primeiroVencimento: opcoes.primeiroVencimento,
    periodicidade: opcoes.periodicidade,
    status: opcoes.status,
    motivo: opcoes.motivo ?? null,
    acordadoEm: opcoes.acordadoEm,
    registradoPor: 'seed',
  };
  await prisma.renegociacao.upsert({ where: { id }, create: { id, ...dados }, update: dados });
  return id;
}

interface OpcoesDeAnexo {
  chave: string;
  escopo: 'CLIENTE' | 'CONTRATO';
  donoId: string;
  categoria: string;
  nomeOriginal: string;
  tipoMime?: string;
  tamanhoBytes?: number;
  descricao?: string;
}

async function inserirAnexo(opcoes: OpcoesDeAnexo): Promise<void> {
  const id = identificador(`anexo:${opcoes.chave}`);
  const chaveNoArmazenamento = `demo/${opcoes.escopo.toLowerCase()}/${opcoes.chave}`;
  const dados = {
    escopo: opcoes.escopo,
    donoId: opcoes.donoId,
    categoria: opcoes.categoria as never,
    nomeOriginal: opcoes.nomeOriginal,
    tipoMime: opcoes.tipoMime ?? 'application/pdf',
    tamanhoBytes: opcoes.tamanhoBytes ?? 128_000,
    descricao: opcoes.descricao ?? null,
    enviadoPor: 'seed',
  };
  await prisma.anexo.upsert({
    where: { chaveNoArmazenamento },
    create: { id, chaveNoArmazenamento, ...dados },
    update: dados,
  });
}

async function semearCenariosDeStatus(
  clientes: ClienteSemeado[],
  lotes: Map<string, LoteSemeado>,
): Promise<void> {
  const acharLote = (chave: string): LoteSemeado =>
    obrigatorio(lotes.get(chave), `Lote ${chave} nao existe para o cenario de status.`);

  // ---- cliente pessoa juridica (cobre TipoPessoa.JURIDICA)
  const documentoJuridico = gerarCnpj(11_204_500);
  const idJuridico = identificador(`cliente:${documentoJuridico}`);
  const dadosJuridico = {
    nome: 'Construtora Horizonte Norte LTDA',
    tipoPessoa: 'JURIDICA' as const,
    email: 'financeiro@horizontenorte.com.br',
    telefone: '1433221100',
    whatsapp: '1433221100',
    dataNascimento: null,
    logradouro: 'Avenida das Nações',
    numero: '900',
    bairro: 'Distrito Industrial',
    cidade: 'Marília',
    uf: 'SP',
    cep: '17512900',
    observacoes: 'Cliente pessoa jurídica (demonstração de todos os estados).',
    ativo: true,
  };
  await prisma.cliente.upsert({
    where: { documento: documentoJuridico },
    create: { id: idJuridico, documento: documentoJuridico, ...dadosJuridico },
    update: dadosJuridico,
  });

  const ref = DATA_DE_REFERENCIA;

  // ==================================================================
  // 1) Contrato QUITADO — pessoa juridica, tudo pago, lote vendido.
  //    Cobre StatusContrato.QUITADO e as formas DINHEIRO, CARTAO, CHEQUE.
  // ==================================================================
  {
    const lote = acharLote(chaveDeLote('palmeiras', 'A', '01'));
    const numero = '2023/0001';
    const assinatura = dataUtc(2023, 1, 10);
    const entrada = somarDias(assinatura, 5);
    const primeiro = dataUtc(2023, 3, 10);
    const total = 60_000_00;
    const valorEntrada = 12_000_00;
    const qtd = 6;
    const valorParcela = (total - valorEntrada) / qtd;
    const contratoId = await inserirContrato({
      numero,
      clienteId: idJuridico,
      loteId: lote.id,
      status: 'QUITADO',
      valorTotalCentavos: total,
      valorEntradaCentavos: valorEntrada,
      dataAssinatura: assinatura,
      dataEntrada: entrada,
      primeiroVencimento: primeiro,
      quantidadeDeParcelas: qtd,
      periodicidade: 'MENSAL',
      formaPagamentoEntrada: 'DINHEIRO',
      indiceReajuste: 'NENHUM',
      observacoes: 'Contrato quitado integralmente.',
    });
    await prisma.lote.update({ where: { id: lote.id }, data: { situacao: 'VENDIDO' } });

    const parcelaEntrada = await inserirParcela({
      numeroContrato: numero,
      contratoId,
      numero: 0,
      tipo: 'ENTRADA',
      valorOriginalCentavos: valorEntrada,
      vencimento: entrada,
      descricao: 'Entrada',
      status: 'PAGA',
      valorPagoCentavos: valorEntrada,
      pagoEm: entrada,
      formaPagamento: 'DINHEIRO',
    });
    await inserirPagamento({
      chave: `${numero}:ENTRADA`,
      parcelaId: parcelaEntrada,
      contratoId,
      valorPrincipalCentavos: valorEntrada,
      pagoEm: entrada,
      formaPagamento: 'DINHEIRO',
    });

    const formas: FormaPagamento[] = ['CARTAO', 'CHEQUE', 'PIX', 'BOLETO', 'CARTAO', 'CHEQUE'];
    for (let indice = 0; indice < qtd; indice += 1) {
      const venc = vencimentoDoPlano(primeiro, indice, 'MENSAL');
      const forma = obrigatorio(formas[indice], 'Forma inexistente.');
      const parcelaId = await inserirParcela({
        numeroContrato: numero,
        contratoId,
        numero: indice + 1,
        tipo: 'FINANCIAMENTO',
        valorOriginalCentavos: valorParcela,
        vencimento: venc,
        descricao: `Parcela ${indice + 1}/${qtd}`,
        status: 'PAGA',
        valorPagoCentavos: valorParcela,
        pagoEm: venc,
        formaPagamento: forma,
      });
      await inserirPagamento({
        chave: `${numero}:${indice + 1}`,
        parcelaId,
        contratoId,
        valorPrincipalCentavos: valorParcela,
        pagoEm: venc,
        formaPagamento: forma,
      });
    }

    await inserirAnexo({
      chave: `${numero}:contrato-assinado`,
      escopo: 'CONTRATO',
      donoId: contratoId,
      categoria: 'CONTRATO_ASSINADO',
      nomeOriginal: 'contrato-assinado.pdf',
    });
    await inserirAnexo({
      chave: `${numero}:quitacao`,
      escopo: 'CONTRATO',
      donoId: contratoId,
      categoria: 'TERMO_DE_QUITACAO',
      nomeOriginal: 'termo-de-quitacao.pdf',
    });
  }

  // ==================================================================
  // 2) Contrato CANCELADO — entrada paga, demais parcelas canceladas,
  //    lote devolvido a vitrine (DISPONIVEL).
  // ==================================================================
  {
    const cliente = obrigatorio(clientes[10], 'Cliente 10 inexistente.');
    const lote = acharLote(chaveDeLote('palmeiras', 'A', '02'));
    const numero = '2024/0031';
    const assinatura = dataUtc(2024, 3, 5);
    const entrada = somarDias(assinatura, 5);
    const primeiro = dataUtc(2024, 5, 5);
    const total = 90_000_00;
    const valorEntrada = 9_000_00;
    const qtd = 12;
    const valorParcela = (total - valorEntrada) / qtd;
    const contratoId = await inserirContrato({
      numero,
      clienteId: cliente.id,
      loteId: lote.id,
      status: 'CANCELADO',
      valorTotalCentavos: total,
      valorEntradaCentavos: valorEntrada,
      dataAssinatura: assinatura,
      dataEntrada: entrada,
      primeiroVencimento: primeiro,
      quantidadeDeParcelas: qtd,
      periodicidade: 'MENSAL',
      formaPagamentoEntrada: 'BOLETO',
      indiceReajuste: 'NENHUM',
      observacoes: 'Cancelado por desistência do comprador antes da 1ª parcela.',
    });
    // Cancelado: o lote volta a ficar disponivel na vitrine.
    await prisma.lote.update({ where: { id: lote.id }, data: { situacao: 'DISPONIVEL' } });

    const parcelaEntrada = await inserirParcela({
      numeroContrato: numero,
      contratoId,
      numero: 0,
      tipo: 'ENTRADA',
      valorOriginalCentavos: valorEntrada,
      vencimento: entrada,
      descricao: 'Entrada',
      status: 'PAGA',
      valorPagoCentavos: valorEntrada,
      pagoEm: entrada,
      formaPagamento: 'BOLETO',
    });
    await inserirPagamento({
      chave: `${numero}:ENTRADA`,
      parcelaId: parcelaEntrada,
      contratoId,
      valorPrincipalCentavos: valorEntrada,
      pagoEm: entrada,
      formaPagamento: 'BOLETO',
    });
    for (let indice = 0; indice < qtd; indice += 1) {
      await inserirParcela({
        numeroContrato: numero,
        contratoId,
        numero: indice + 1,
        tipo: 'FINANCIAMENTO',
        valorOriginalCentavos: valorParcela,
        vencimento: vencimentoDoPlano(primeiro, indice, 'MENSAL'),
        descricao: `Parcela ${indice + 1}/${qtd}`,
        status: 'CANCELADA',
      });
    }
  }

  // ==================================================================
  // 3) Contrato DISTRATADO — parte paga e depois distratado; lote fica
  //    INDISPONIVEL; a entrada foi devolvida (pagamento estornado).
  // ==================================================================
  {
    const cliente = obrigatorio(clientes[11], 'Cliente 11 inexistente.');
    const lote = acharLote(chaveDeLote('cerrado', 'A', '01'));
    const numero = '2024/0032';
    const assinatura = dataUtc(2024, 2, 8);
    const entrada = somarDias(assinatura, 5);
    const primeiro = dataUtc(2024, 4, 8);
    const total = 72_000_00;
    const valorEntrada = 7_200_00;
    const qtd = 12;
    const valorParcela = (total - valorEntrada) / qtd;
    const contratoId = await inserirContrato({
      numero,
      clienteId: cliente.id,
      loteId: lote.id,
      status: 'DISTRATADO',
      valorTotalCentavos: total,
      valorEntradaCentavos: valorEntrada,
      dataAssinatura: assinatura,
      dataEntrada: entrada,
      primeiroVencimento: primeiro,
      quantidadeDeParcelas: qtd,
      periodicidade: 'MENSAL',
      formaPagamentoEntrada: 'PIX',
      indiceReajuste: 'NENHUM',
      observacoes: 'Distrato firmado; retenção de 10% e devolução do restante.',
    });
    await prisma.lote.update({ where: { id: lote.id }, data: { situacao: 'INDISPONIVEL' } });

    const parcelaEntrada = await inserirParcela({
      numeroContrato: numero,
      contratoId,
      numero: 0,
      tipo: 'ENTRADA',
      valorOriginalCentavos: valorEntrada,
      vencimento: entrada,
      descricao: 'Entrada',
      status: 'CANCELADA',
      valorPagoCentavos: valorEntrada,
      pagoEm: entrada,
      formaPagamento: 'PIX',
    });
    // Pagamento estornado (cobre Pagamento.estornado = true) — a entrada foi
    // recebida e depois devolvida no distrato.
    await inserirPagamento({
      chave: `${numero}:ENTRADA`,
      parcelaId: parcelaEntrada,
      contratoId,
      valorPrincipalCentavos: valorEntrada,
      pagoEm: entrada,
      formaPagamento: 'PIX',
      estornado: true,
      observacoes: 'Devolvido ao cliente no distrato.',
    });
    // Duas parcelas pagas antes do distrato, depois canceladas.
    for (let indice = 0; indice < qtd; indice += 1) {
      const numeroParcela = indice + 1;
      await inserirParcela({
        numeroContrato: numero,
        contratoId,
        numero: numeroParcela,
        tipo: 'FINANCIAMENTO',
        valorOriginalCentavos: valorParcela,
        vencimento: vencimentoDoPlano(primeiro, indice, 'MENSAL'),
        descricao: `Parcela ${numeroParcela}/${qtd}`,
        status: 'CANCELADA',
      });
    }

    await inserirAnexo({
      chave: `${numero}:distrato`,
      escopo: 'CONTRATO',
      donoId: contratoId,
      categoria: 'DISTRATO',
      nomeOriginal: 'distrato-assinado.pdf',
    });
  }

  // ==================================================================
  // 4) Contrato ATIVO complexo — cobre StatusParcela.PAGA_PARCIAL (com
  //    juros e multa recebidos), periodicidade TRIMESTRAL, IndiceReajuste
  //    INPC + registro de Reajuste, forma PERMUTA, e TODOS os status de
  //    documento e de cobranca.
  // ==================================================================
  {
    const cliente = obrigatorio(clientes[2], 'Cliente 2 inexistente.');
    const lote = acharLote(chaveDeLote('palmeiras', 'B', '03'));
    const numero = '2025/0030';
    const assinatura = dataUtc(2025, 1, 15);
    const entrada = somarDias(assinatura, 5);
    const primeiro = dataUtc(2025, 3, 15);
    const total = 120_000_00;
    const valorEntrada = 24_000_00;
    const qtd = 12;
    const valorParcela = (total - valorEntrada) / qtd;
    const periodicidade: Periodicidade = 'TRIMESTRAL';
    const contratoId = await inserirContrato({
      numero,
      clienteId: cliente.id,
      loteId: lote.id,
      status: 'ATIVO',
      valorTotalCentavos: total,
      valorEntradaCentavos: valorEntrada,
      dataAssinatura: assinatura,
      dataEntrada: entrada,
      primeiroVencimento: primeiro,
      quantidadeDeParcelas: qtd,
      periodicidade,
      formaPagamentoEntrada: 'PERMUTA',
      indiceReajuste: 'INPC',
      observacoes: 'Entrada por permuta de veículo; parcela 4 paga parcialmente.',
    });
    await prisma.lote.update({ where: { id: lote.id }, data: { situacao: 'VENDIDO' } });

    const parcelaEntrada = await inserirParcela({
      numeroContrato: numero,
      contratoId,
      numero: 0,
      tipo: 'ENTRADA',
      valorOriginalCentavos: valorEntrada,
      vencimento: entrada,
      descricao: 'Entrada (permuta)',
      status: 'PAGA',
      valorPagoCentavos: valorEntrada,
      pagoEm: entrada,
      formaPagamento: 'PERMUTA',
    });
    await inserirPagamento({
      chave: `${numero}:ENTRADA`,
      parcelaId: parcelaEntrada,
      contratoId,
      valorPrincipalCentavos: valorEntrada,
      pagoEm: entrada,
      formaPagamento: 'PERMUTA',
    });

    const idsDasParcelas: string[] = [];
    for (let indice = 0; indice < qtd; indice += 1) {
      const numeroParcela = indice + 1;
      const venc = vencimentoDoPlano(primeiro, indice, periodicidade);
      let estado: EstadoDaParcela = { status: 'PENDENTE' };
      if (numeroParcela <= 3) {
        estado = {
          status: 'PAGA',
          valorPagoCentavos: valorParcela,
          pagoEm: venc,
          formaPagamento: 'PIX',
        };
      } else if (numeroParcela === 4) {
        // Pagamento parcial: metade do principal, com multa e juros do atraso.
        const principalPago = valorParcela / 2;
        const juros = 240_00;
        const multa = 160_00;
        estado = {
          status: 'PAGA_PARCIAL',
          valorPagoCentavos: principalPago,
          jurosRecebidosCentavos: juros,
          multaRecebidaCentavos: multa,
          pagoEm: somarDias(venc, 12),
          formaPagamento: 'BOLETO',
        };
      }
      const parcelaId = await inserirParcela({
        numeroContrato: numero,
        contratoId,
        numero: numeroParcela,
        tipo: 'FINANCIAMENTO',
        valorOriginalCentavos: valorParcela,
        vencimento: venc,
        descricao: `Parcela ${numeroParcela}/${qtd}`,
        ...estado,
      });
      idsDasParcelas.push(parcelaId);

      if (numeroParcela <= 3) {
        await inserirPagamento({
          chave: `${numero}:${numeroParcela}`,
          parcelaId,
          contratoId,
          valorPrincipalCentavos: valorParcela,
          pagoEm: venc,
          formaPagamento: 'PIX',
        });
      }
      if (numeroParcela === 4) {
        await inserirPagamento({
          chave: `${numero}:${numeroParcela}`,
          parcelaId,
          contratoId,
          valorPrincipalCentavos: valorParcela / 2,
          valorJurosCentavos: 240_00,
          valorMultaCentavos: 160_00,
          pagoEm: somarDias(venc, 12),
          formaPagamento: 'BOLETO',
        });
      }
    }

    const parcela = (numeroParcela: number): string =>
      obrigatorio(idsDasParcelas[numeroParcela - 1], `Parcela ${numeroParcela} nao mapeada.`);

    // Reajuste INPC aplicado da parcela 6 em diante (cobre IndiceReajuste.INPC
    // e a tabela reajustes).
    await prisma.reajuste.upsert({
      where: { id: identificador(`reajuste:${numero}`) },
      create: {
        id: identificador(`reajuste:${numero}`),
        contratoId,
        indice: 'INPC',
        percentual: 4.5,
        aplicadoAPartirDe: vencimentoDoPlano(primeiro, 5, periodicidade),
        parcelasAfetadas: 7,
        registradoPor: 'seed',
      },
      update: {
        indice: 'INPC',
        percentual: 4.5,
        aplicadoAPartirDe: vencimentoDoPlano(primeiro, 5, periodicidade),
        parcelasAfetadas: 7,
      },
    });

    // Documentos em TODOS os status (EMITIDO, PAGO, CANCELADO, EXPIRADO, FALHA)
    // e nos tres tipos (BOLETO, PIX, BOLETO_COM_PIX).
    await inserirDocumento({
      chave: `${numero}:doc-pago`,
      contratoId,
      parcelaId: parcela(1),
      tipo: 'PIX',
      status: 'PAGO',
      valorCentavos: valorParcela,
      vencimento: vencimentoDoPlano(primeiro, 0, periodicidade),
    });
    await inserirDocumento({
      chave: `${numero}:doc-emitido`,
      contratoId,
      parcelaId: parcela(5),
      tipo: 'BOLETO_COM_PIX',
      status: 'EMITIDO',
      valorCentavos: valorParcela,
      vencimento: vencimentoDoPlano(primeiro, 4, periodicidade),
    });
    await inserirDocumento({
      chave: `${numero}:doc-cancelado`,
      contratoId,
      parcelaId: parcela(5),
      tipo: 'BOLETO',
      status: 'CANCELADO',
      valorCentavos: valorParcela,
      vencimento: vencimentoDoPlano(primeiro, 4, periodicidade),
    });
    await inserirDocumento({
      chave: `${numero}:doc-expirado`,
      contratoId,
      parcelaId: parcela(4),
      tipo: 'BOLETO',
      status: 'EXPIRADO',
      valorCentavos: valorParcela,
      vencimento: vencimentoDoPlano(primeiro, 3, periodicidade),
    });
    await inserirDocumento({
      chave: `${numero}:doc-falha`,
      contratoId,
      parcelaId: parcela(6),
      tipo: 'PIX',
      status: 'FALHA',
      valorCentavos: valorParcela,
      vencimento: vencimentoDoPlano(primeiro, 5, periodicidade),
    });

    // Cobrancas em TODOS os status (ENVIADA, PENDENTE, FALHA, CANCELADA),
    // cobrindo os tres canais e os tres gatilhos.
    await inserirCobranca({
      chave: `${numero}:cob-enviada`,
      contratoId,
      parcelaId: parcela(5),
      clienteId: cliente.id,
      gatilho: 'APOS_O_VENCIMENTO',
      dias: 5,
      canal: 'WHATSAPP',
      destino: '14997451188',
      status: 'ENVIADA',
      valorCobradoCentavos: valorParcela,
      dataDeReferencia: somarDias(vencimentoDoPlano(primeiro, 4, periodicidade), 5),
    });
    await inserirCobranca({
      chave: `${numero}:cob-pendente`,
      contratoId,
      parcelaId: parcela(6),
      clienteId: cliente.id,
      gatilho: 'ANTES_DO_VENCIMENTO',
      dias: 5,
      canal: 'EMAIL',
      destino: 'carla.prado@exemplo.com.br',
      status: 'PENDENTE',
      valorCobradoCentavos: valorParcela,
      dataDeReferencia: somarDias(vencimentoDoPlano(primeiro, 5, periodicidade), -5),
    });
    await inserirCobranca({
      chave: `${numero}:cob-falha`,
      contratoId,
      parcelaId: parcela(5),
      clienteId: cliente.id,
      gatilho: 'NO_VENCIMENTO',
      dias: 0,
      canal: 'SMS',
      destino: '14997451188',
      status: 'FALHA',
      valorCobradoCentavos: valorParcela,
      dataDeReferencia: vencimentoDoPlano(primeiro, 4, periodicidade),
    });
    await inserirCobranca({
      chave: `${numero}:cob-cancelada`,
      contratoId,
      parcelaId: parcela(5),
      clienteId: cliente.id,
      gatilho: 'APOS_O_VENCIMENTO',
      dias: 30,
      canal: 'EMAIL',
      destino: 'carla.prado@exemplo.com.br',
      status: 'CANCELADA',
      valorCobradoCentavos: valorParcela,
      dataDeReferencia: somarDias(vencimentoDoPlano(primeiro, 4, periodicidade), 30),
    });

    // Anexos que faltavam (ADITIVO, COMPROVANTE_PAGAMENTO, OUTRO).
    await inserirAnexo({
      chave: `${numero}:aditivo`,
      escopo: 'CONTRATO',
      donoId: contratoId,
      categoria: 'ADITIVO',
      nomeOriginal: 'aditivo-reajuste-inpc.pdf',
    });
    await inserirAnexo({
      chave: `${numero}:comprovante`,
      escopo: 'CONTRATO',
      donoId: contratoId,
      categoria: 'COMPROVANTE_PAGAMENTO',
      nomeOriginal: 'comprovante-parcela-04.jpg',
      tipoMime: 'image/jpeg',
    });
    await inserirAnexo({
      chave: `${numero}:outro`,
      escopo: 'CONTRATO',
      donoId: contratoId,
      categoria: 'OUTRO',
      nomeOriginal: 'observacoes-diversas.pdf',
    });
  }

  // ==================================================================
  // 5) Contrato ATIVO com RENEGOCIACAO VIGENTE — parcelas originais
  //    RENEGOCIADAS e novas parcelas tipo RENEGOCIACAO (periodicidade
  //    BIMESTRAL). Cobre StatusParcela.RENEGOCIADA, TipoParcela.RENEGOCIACAO
  //    e StatusRenegociacao.VIGENTE.
  // ==================================================================
  {
    const cliente = obrigatorio(clientes[9], 'Cliente 9 inexistente.');
    const lote = acharLote(chaveDeLote('cerrado', 'A', '03'));
    const numero = '2025/0031';
    const assinatura = dataUtc(2025, 2, 10);
    const entrada = somarDias(assinatura, 5);
    const primeiro = dataUtc(2025, 4, 10);
    const total = 60_000_00;
    const valorEntrada = 6_000_00;
    const qtd = 12;
    const valorParcela = (total - valorEntrada) / qtd;
    const contratoId = await inserirContrato({
      numero,
      clienteId: cliente.id,
      loteId: lote.id,
      status: 'ATIVO',
      valorTotalCentavos: total,
      valorEntradaCentavos: valorEntrada,
      dataAssinatura: assinatura,
      dataEntrada: entrada,
      primeiroVencimento: primeiro,
      quantidadeDeParcelas: qtd,
      periodicidade: 'MENSAL',
      formaPagamentoEntrada: 'PIX',
      indiceReajuste: 'IPCA',
      observacoes: 'Parcelas 3 a 5 renegociadas em um acordo vigente.',
    });
    await prisma.lote.update({ where: { id: lote.id }, data: { situacao: 'VENDIDO' } });

    // Acordo criado primeiro: as parcelas originais e as novas apontam para ele.
    const acordadoEm = dataUtc(2025, 8, 20);
    const primeiroDoAcordo = dataUtc(2025, 9, 1);
    const saldoRenegociado = valorParcela * 3;
    const renegociacaoId = await inserirRenegociacao({
      chave: `${numero}:acordo`,
      contratoId,
      status: 'VIGENTE',
      saldoOriginalCentavos: saldoRenegociado,
      encargosCentavos: 1_500_00,
      descontoCentavos: 500_00,
      valorNegociadoCentavos: saldoRenegociado + 1_500_00 - 500_00,
      entradaCentavos: 2_500_00,
      dataEntrada: primeiroDoAcordo,
      quantidadeDeParcelas: 6,
      primeiroVencimento: primeiroDoAcordo,
      periodicidade: 'BIMESTRAL',
      acordadoEm,
      motivo: 'Dificuldade financeira temporária; acordo com entrada e 6 parcelas.',
    });

    // Entrada + parcelas originais. 1-2 pagas, 3-5 renegociadas, 6-12 pendentes.
    const parcelaEntrada = await inserirParcela({
      numeroContrato: numero,
      contratoId,
      numero: 0,
      tipo: 'ENTRADA',
      valorOriginalCentavos: valorEntrada,
      vencimento: entrada,
      descricao: 'Entrada',
      status: 'PAGA',
      valorPagoCentavos: valorEntrada,
      pagoEm: entrada,
      formaPagamento: 'PIX',
    });
    await inserirPagamento({
      chave: `${numero}:ENTRADA`,
      parcelaId: parcelaEntrada,
      contratoId,
      valorPrincipalCentavos: valorEntrada,
      pagoEm: entrada,
      formaPagamento: 'PIX',
    });
    for (let indice = 0; indice < qtd; indice += 1) {
      const numeroParcela = indice + 1;
      const venc = vencimentoDoPlano(primeiro, indice, 'MENSAL');
      let extra: EstadoDaParcela = { status: 'PENDENTE' };
      if (numeroParcela <= 2) {
        extra = { status: 'PAGA', valorPagoCentavos: valorParcela, pagoEm: venc, formaPagamento: 'PIX' };
      } else if (numeroParcela <= 5) {
        extra = { status: 'RENEGOCIADA', renegociacaoOrigemId: renegociacaoId };
      }
      const parcelaId = await inserirParcela({
        numeroContrato: numero,
        contratoId,
        numero: numeroParcela,
        tipo: 'FINANCIAMENTO',
        valorOriginalCentavos: valorParcela,
        vencimento: venc,
        descricao: `Parcela ${numeroParcela}/${qtd}`,
        ...extra,
      });
      if (numeroParcela <= 2) {
        await inserirPagamento({
          chave: `${numero}:${numeroParcela}`,
          parcelaId,
          contratoId,
          valorPrincipalCentavos: valorParcela,
          pagoEm: venc,
          formaPagamento: 'PIX',
        });
      }
    }

    // Parcelas novas, nascidas do acordo (tipo RENEGOCIACAO).
    const valorParcelaAcordo = (saldoRenegociado + 1_500_00 - 500_00 - 2_500_00) / 6;
    for (let indice = 0; indice < 6; indice += 1) {
      const numeroParcela = indice + 1;
      const venc = vencimentoDoPlano(primeiroDoAcordo, indice, 'BIMESTRAL');
      const pago = numeroParcela === 1;
      const parcelaId = await inserirParcela({
        numeroContrato: numero,
        contratoId,
        numero: numeroParcela,
        tipo: 'RENEGOCIACAO',
        valorOriginalCentavos: valorParcelaAcordo,
        vencimento: venc,
        descricao: `Acordo ${numeroParcela}/6`,
        status: pago ? 'PAGA' : 'PENDENTE',
        valorPagoCentavos: pago ? valorParcelaAcordo : 0,
        pagoEm: pago ? venc : null,
        formaPagamento: pago ? 'PIX' : null,
        renegociacaoId,
      });
      if (pago) {
        await inserirPagamento({
          chave: `${numero}:acordo:${numeroParcela}`,
          parcelaId,
          contratoId,
          valorPrincipalCentavos: valorParcelaAcordo,
          pagoEm: venc,
          formaPagamento: 'PIX',
        });
      }
    }

    await inserirAnexo({
      chave: `${numero}:termo-renegociacao`,
      escopo: 'CONTRATO',
      donoId: contratoId,
      categoria: 'TERMO_DE_RENEGOCIACAO',
      nomeOriginal: 'termo-de-renegociacao.pdf',
    });
  }

  // ==================================================================
  // 6) Renegociacoes historicas — cobrem os status CUMPRIDA, ROMPIDA e
  //    CANCELADA, alem das periodicidades SEMESTRAL e ANUAL. Sao apenas
  //    registros de historico, sem reescrever as parcelas dos contratos.
  // ==================================================================
  {
    const historicas: Array<{
      contrato: string;
      status: StatusRenegociacao;
      periodicidade: Periodicidade;
      motivo: string;
    }> = [
      { contrato: '2024/0013', status: 'CUMPRIDA', periodicidade: 'SEMESTRAL', motivo: 'Acordo quitado no prazo.' },
      { contrato: '2025/0011', status: 'ROMPIDA', periodicidade: 'ANUAL', motivo: 'Cliente deixou de pagar o acordo.' },
      { contrato: '2025/0005', status: 'CANCELADA', periodicidade: 'MENSAL', motivo: 'Acordo cancelado a pedido do cliente.' },
    ];
    for (const item of historicas) {
      const contratoId = identificador(`contrato:${item.contrato}`);
      await inserirRenegociacao({
        chave: `${item.contrato}:historico`,
        contratoId,
        status: item.status,
        saldoOriginalCentavos: 15_000_00,
        encargosCentavos: 900_00,
        descontoCentavos: 400_00,
        valorNegociadoCentavos: 15_500_00,
        entradaCentavos: 2_000_00,
        dataEntrada: somarDias(ref, -200),
        quantidadeDeParcelas: 6,
        primeiroVencimento: somarDias(ref, -180),
        periodicidade: item.periodicidade,
        acordadoEm: somarDias(ref, -210),
        motivo: item.motivo,
      });
    }
  }

  // ==================================================================
  // 7) Anexos de cliente — cobrem as categorias de documento pessoal e o
  //    escopo CLIENTE.
  // ==================================================================
  {
    const dono = obrigatorio(clientes[0], 'Cliente 0 inexistente.');
    const anexosDeCliente: Array<{ categoria: string; nome: string; mime?: string }> = [
      { categoria: 'RG', nome: 'rg-frente-verso.jpg', mime: 'image/jpeg' },
      { categoria: 'CPF', nome: 'cpf.pdf' },
      { categoria: 'COMPROVANTE_RESIDENCIA', nome: 'conta-de-luz.pdf' },
      { categoria: 'COMPROVANTE_RENDA', nome: 'holerite.pdf' },
      { categoria: 'CERTIDAO', nome: 'certidao-de-casamento.pdf' },
    ];
    for (const anexo of anexosDeCliente) {
      await inserirAnexo({
        chave: `cliente:${dono.documento}:${anexo.categoria}`,
        escopo: 'CLIENTE',
        donoId: dono.id,
        categoria: anexo.categoria,
        nomeOriginal: anexo.nome,
        tipoMime: anexo.mime,
      });
    }
  }

  // ==================================================================
  // 8) Eventos de webhook — um conciliado com sucesso e um com erro
  //    pendente de reprocessamento.
  // ==================================================================
  {
    await prisma.eventoDeWebhook.upsert({
      where: {
        provedor_identificadorExterno_tipo: {
          provedor: 'fake',
          identificadorExterno: 'evt_pix_0001',
          tipo: 'pagamento.confirmado',
        },
      },
      create: {
        id: identificador('webhook:evt_pix_0001'),
        provedor: 'fake',
        identificadorExterno: 'evt_pix_0001',
        tipo: 'pagamento.confirmado',
        cargaUtil: { evento: 'pagamento.confirmado', valorCentavos: 800_000, meio: 'PIX' },
        processadoEm: ref,
      },
      update: {
        cargaUtil: { evento: 'pagamento.confirmado', valorCentavos: 800_000, meio: 'PIX' },
        processadoEm: ref,
        erro: null,
      },
    });
    await prisma.eventoDeWebhook.upsert({
      where: {
        provedor_identificadorExterno_tipo: {
          provedor: 'fake',
          identificadorExterno: 'evt_boleto_0002',
          tipo: 'pagamento.confirmado',
        },
      },
      create: {
        id: identificador('webhook:evt_boleto_0002'),
        provedor: 'fake',
        identificadorExterno: 'evt_boleto_0002',
        tipo: 'pagamento.confirmado',
        cargaUtil: { evento: 'pagamento.confirmado', nossoNumero: '00099887', meio: 'BOLETO' },
        processadoEm: null,
        erro: 'Parcela não encontrada para conciliação (nosso número desconhecido).',
      },
      update: {
        cargaUtil: { evento: 'pagamento.confirmado', nossoNumero: '00099887', meio: 'BOLETO' },
        processadoEm: null,
        erro: 'Parcela não encontrada para conciliação (nosso número desconhecido).',
      },
    });
  }
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

  const resumirGrupos = (grupos: Array<{ status: string; _count: number }>): string =>
    grupos
      .map((grupo) => `${grupo.status}=${grupo._count}`)
      .sort()
      .join('  ');

  const [
    contratosPorStatus,
    parcelasPorStatus,
    cobrancasPorStatus,
    documentosPorStatus,
    renegociacoesPorStatus,
  ] = await Promise.all([
    prisma.contrato.groupBy({ by: ['status'], _count: true }),
    prisma.parcela.groupBy({ by: ['status'], _count: true }),
    prisma.cobranca.groupBy({ by: ['status'], _count: true }),
    prisma.documentoDeCobranca.groupBy({ by: ['status'], _count: true }),
    prisma.renegociacao.groupBy({ by: ['status'], _count: true }),
  ]);
  const [anexos, webhooks, reajustes] = await Promise.all([
    prisma.anexo.count(),
    prisma.eventoDeWebhook.count(),
    prisma.reajuste.count(),
  ]);

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
    '  Cobertura de status (cenários de demonstração)',
    `    contratos ............... ${resumirGrupos(contratosPorStatus)}`,
    `    parcelas ................ ${resumirGrupos(parcelasPorStatus)}`,
    `    cobranças ............... ${resumirGrupos(cobrancasPorStatus)}`,
    `    documentos .............. ${resumirGrupos(documentosPorStatus)}`,
    `    renegociações ........... ${resumirGrupos(renegociacoesPorStatus)}`,
    `    anexos .................. ${anexos}   reajustes: ${reajustes}   webhooks: ${webhooks}`,
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

  await semearCenariosDeStatus(clientes, lotes);
  console.log('  cenários de status (cobertura completa dos enums) ok');

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
