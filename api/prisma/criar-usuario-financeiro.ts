/**
 * Runner ISOLADO: cria (ou atualiza) um usuario confinado ao modulo Financeiro
 * e garante os perfis de acesso ligados ao novo modelo por-modulo (ver/editar).
 *
 * Roda com `npm run criar:usuario-financeiro`.
 *
 * Diferente de `seed.ts`, este script NAO injeta massa de demonstracao — mexe
 * apenas na area de Acesso (perfis + um usuario). E seguro rodar contra o banco
 * real: todas as operacoes sao `upsert` idempotentes e aditivas, sem apagar nada.
 *
 * O que faz:
 *   1. Garante os perfis de sistema no modelo por-modulo:
 *        - Administrador / Financeiro passam a ter VER_FINANCEIRO + EDITAR_FINANCEIRO
 *          (senao perderiam o modulo Financeiro, agora protegido por permissao).
 *        - Consulta ganha VER_FINANCEIRO (somente leitura).
 *        - Cria "Financeiro (restrito)" = VER + EDITAR + SOMENTE_FINANCEIRO.
 *   2. Cria o usuario restrito com senha ALEATORIA forte (impressa ao final).
 *
 * Variaveis de ambiente opcionais:
 *   FIN_NOME   (default "Financeiro Restrito")
 *   FIN_EMAIL  (default "financeiro-restrito@gestrato.local")
 *   FIN_SENHA  (default: senha aleatoria gerada e impressa)
 */

import { randomBytes, randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { config as carregarEnv } from 'dotenv';

carregarEnv();

const prisma = new PrismaClient();

const PERFIL_ADMIN = '00000000-0000-0000-0000-0000000000a1';
const PERFIL_FINANCEIRO = '00000000-0000-0000-0000-0000000000a2';
const PERFIL_CONSULTA = '00000000-0000-0000-0000-0000000000a4';
const PERFIL_FINANCEIRO_RESTRITO = '00000000-0000-0000-0000-0000000000a5';

const TODAS_PERMISSOES = [
  'CADASTRAR', 'GERIR_CONTRATOS', 'RECEBER_PAGAMENTO', 'EMITIR_DOCUMENTO',
  'ENVIAR_COBRANCA', 'CONFIGURAR_REGUA', 'RENEGOCIAR', 'ANEXAR_ARQUIVO',
  'REMOVER_ANEXO', 'GERIR_USUARIOS', 'VER_FINANCEIRO', 'EDITAR_FINANCEIRO',
];

interface EspecificacaoDePerfil {
  id: string;
  nome: string;
  descricao: string;
  permissoes: string[];
}

/**
 * Perfis afetados pelo modelo por-modulo. NAO inclui o Vendedor: ele nao muda.
 * `SOMENTE_FINANCEIRO` so entra no perfil restrito — nunca num perfil amplo.
 */
const PERFIS: EspecificacaoDePerfil[] = [
  { id: PERFIL_ADMIN, nome: 'Administrador', descricao: 'Acesso total ao sistema', permissoes: TODAS_PERMISSOES },
  {
    id: PERFIL_FINANCEIRO,
    nome: 'Financeiro',
    descricao: 'Operação financeira, cobrança e recebimentos',
    permissoes: TODAS_PERMISSOES.filter((p) => p !== 'GERIR_USUARIOS'),
  },
  { id: PERFIL_CONSULTA, nome: 'Consulta', descricao: 'Somente leitura', permissoes: ['VER_FINANCEIRO'] },
  {
    id: PERFIL_FINANCEIRO_RESTRITO,
    nome: 'Financeiro (restrito)',
    descricao: 'Acesso exclusivo ao modulo Financeiro (ver e editar)',
    permissoes: ['VER_FINANCEIRO', 'EDITAR_FINANCEIRO', 'SOMENTE_FINANCEIRO'],
  },
];

/** Senha forte legivel: 4 blocos de 4 chars de um alfabeto sem ambiguidades. */
function gerarSenha(): string {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = randomBytes(16);
  let bruto = '';
  for (const byte of bytes) bruto += alfabeto[byte % alfabeto.length];
  return `${bruto.slice(0, 4)}-${bruto.slice(4, 8)}-${bruto.slice(8, 12)}-${bruto.slice(12, 16)}`;
}

async function main(): Promise<void> {
  const nome = process.env.FIN_NOME?.trim() || 'Financeiro Restrito';
  const email = process.env.FIN_EMAIL?.trim() || 'financeiro-restrito@gestrato.local';
  const senha = process.env.FIN_SENHA?.trim() || gerarSenha();

  console.log('→ Garantindo perfis de acesso (modelo por-modulo)...');
  for (const perfil of PERFIS) {
    await prisma.perfil.upsert({
      where: { id: perfil.id },
      create: {
        id: perfil.id,
        nome: perfil.nome,
        descricao: perfil.descricao,
        permissoes: perfil.permissoes,
        sistema: true,
      },
      update: { nome: perfil.nome, descricao: perfil.descricao, permissoes: perfil.permissoes, sistema: true },
    });
    console.log(`   ✓ ${perfil.nome}: [${perfil.permissoes.join(', ')}]`);
  }

  console.log(`→ Criando/atualizando usuario "${nome}" <${email}>...`);
  const senhaHash = bcrypt.hashSync(senha, 10);
  const usuario = await prisma.usuario.upsert({
    where: { email },
    create: {
      id: randomUUID(),
      nome,
      email,
      senhaHash,
      perfilId: PERFIL_FINANCEIRO_RESTRITO,
      ativo: true,
    },
    update: { nome, senhaHash, perfilId: PERFIL_FINANCEIRO_RESTRITO, ativo: true },
  });

  console.log('\n========================================================');
  console.log('  Usuario do Financeiro (acesso restrito) pronto');
  console.log('========================================================');
  console.log(`  Nome:  ${usuario.nome}`);
  console.log(`  Email: ${usuario.email}`);
  console.log(`  Senha: ${senha}`);
  console.log(`  Perfil: Financeiro (restrito)`);
  console.log('  Permissoes: VER_FINANCEIRO, EDITAR_FINANCEIRO, SOMENTE_FINANCEIRO');
  console.log('========================================================');
  console.log('  Guarde a senha: ela nao fica salva em texto, so o hash.');
  console.log('========================================================\n');
}

main()
  .catch((erro) => {
    console.error('Falha ao criar o usuario do financeiro:', erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
