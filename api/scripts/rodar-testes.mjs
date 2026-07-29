import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Runner dos testes de dominio.
 *
 * O test runner do Node 20, ao varrer um diretorio, so reconhece arquivos com
 * extensao .js/.mjs/.cjs — arquivos .ts nunca casam com o padrao, e o comando
 * termina com "0 tests" sem avisar que nao encontrou nada. Glob na linha de
 * comando tambem nao resolve: o Windows nao expande curingas, e o Node so
 * ganhou suporte a glob em --test depois da versao 20.
 *
 * Entao montamos a lista de arquivos aqui e passamos explicitamente.
 */
const raizDoProjeto = fileURLToPath(new URL('..', import.meta.url));
const pastaDeTestes = join(raizDoProjeto, 'test');

function coletarTestes(pasta) {
  const encontrados = [];
  for (const item of readdirSync(pasta, { withFileTypes: true })) {
    const caminho = join(pasta, item.name);
    if (item.isDirectory()) encontrados.push(...coletarTestes(caminho));
    else if (item.name.endsWith('.test.ts')) encontrados.push(caminho);
  }
  return encontrados.sort();
}

const arquivos = coletarTestes(pastaDeTestes);

if (arquivos.length === 0) {
  console.error(`Nenhum arquivo *.test.ts encontrado em ${pastaDeTestes}.`);
  process.exit(1);
}

console.info(`Executando ${arquivos.length} arquivo(s) de teste:`);
for (const arquivo of arquivos) {
  console.info(`  - ${relative(raizDoProjeto, arquivo)}`);
}

// Chamamos o proprio Node com o carregador do tsx em vez de invocar o binario
// `npx`: no Windows, `spawn` de um .cmd sem shell falha com EINVAL.
const processo = spawn(
  process.execPath,
  ['--import', 'tsx', '--test', ...arquivos],
  { cwd: raizDoProjeto, stdio: 'inherit' },
);

processo.on('exit', (codigo) => process.exit(codigo ?? 1));
