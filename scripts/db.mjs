#!/usr/bin/env node
/**
 * Executor seguro dos comandos de banco do RouteFlow.
 *
 *   node scripts/db.mjs <comando> [postgresql|mysql] [-- argumentos extras]
 *
 * Comandos:
 *   generate     Gera o Prisma Client do provider (não precisa de banco)
 *   migrate      Aplica as migrations versionadas (prisma migrate deploy)
 *   deploy       Alias de migrate
 *   migrate-dev  Cria/aplica migrations em desenvolvimento (prisma migrate dev)
 *   status       Mostra o estado das migrations
 *   reset        Recria o banco PostgreSQL de desenvolvimento (destrutivo)
 *   seed         Cria usuário inicial, configurações e importa a planilha
 *   import       Importa (de forma idempotente) a planilha XLSX
 *   geocode      Preenche latitude/longitude das lojas sem coordenadas
 *   studio       Abre o Prisma Studio
 *
 * Proteções:
 *   - o provider do comando precisa bater com o esquema da URL do banco;
 *   - migrations PostgreSQL são bloqueadas com NODE_ENV=production
 *     (exceto ALLOW_POSTGRES_IN_PRODUCTION=true, usado só no Docker local);
 *   - migrate-dev e reset são bloqueados em produção.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

try {
  const dotenv = require('dotenv');
  dotenv.config({ path: path.join(root, '.env'), quiet: true });
} catch {
  // dotenv é opcional quando as variáveis vêm do ambiente (CI/Hostinger)
}

const PROVIDERS = ['postgresql', 'mysql'];
const [command, providerArg, ...rest] = process.argv.slice(2);
const extra = rest[0] === '--' ? rest.slice(1) : rest;

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

if (!command) fail('Informe um comando. Ex.: node scripts/db.mjs migrate postgresql');

const provider =
  (PROVIDERS.includes(providerArg) ? providerArg : process.env.DATABASE_PROVIDER) || 'postgresql';
if (!PROVIDERS.includes(provider))
  fail(`DATABASE_PROVIDER inválido: "${provider}". Use postgresql ou mysql.`);
if (providerArg && !PROVIDERS.includes(providerArg)) extra.unshift(providerArg);

const isProduction = process.env.NODE_ENV === 'production';
const configPath = path.join('prisma', provider, 'prisma.config.ts');

function resolveDatabaseUrl({ required }) {
  const specific = process.env[`DATABASE_URL_${provider.toUpperCase()}`];
  const url = specific || process.env.DATABASE_URL || '';
  if (!url) {
    if (required)
      fail(
        `Defina DATABASE_URL (ou DATABASE_URL_${provider.toUpperCase()}) para o provider ${provider}.`,
      );
    return '';
  }
  const scheme = url.split(':')[0].toLowerCase();
  const expected = provider === 'postgresql' ? ['postgresql', 'postgres'] : ['mysql', 'mariadb'];
  if (!expected.includes(scheme)) {
    fail(
      `A URL do banco usa "${scheme}://", mas o comando é para ${provider}. ` +
        'Comando bloqueado para evitar executar migrations no banco errado.',
    );
  }
  return url;
}

function guardProduction(destructive) {
  if (!isProduction) return;
  if (destructive) fail(`"${command}" não pode ser executado com NODE_ENV=production.`);
  if (provider === 'postgresql' && process.env.ALLOW_POSTGRES_IN_PRODUCTION !== 'true') {
    fail(
      'Produção usa MySQL/MariaDB. Migrations/seed PostgreSQL bloqueados com NODE_ENV=production.',
    );
  }
}

function run(cmd, args, env) {
  const result = spawnSync(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
  if (result.error) fail(result.error.message);
  process.exit(result.status ?? 1);
}

function prisma(args, { requireUrl = true } = {}) {
  const url = requireUrl ? resolveDatabaseUrl({ required: true }) : '';
  const cli = require.resolve('prisma/build/index.js');
  run(process.execPath, [cli, ...args, '--config', configPath, ...extra], {
    DATABASE_URL: url,
    DATABASE_PROVIDER: provider,
    PRISMA_HIDE_UPDATE_MESSAGE: '1',
  });
}

function ensureSharedPackages() {
  // O CLI importa @routeflow/types compilado; compila automaticamente se ainda não existir
  if (fs.existsSync(path.join(root, 'packages/types/dist/index.cjs'))) return;
  console.info('Compilando @routeflow/types (primeira execução)...');
  const result = spawnSync(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['run', 'build', '-w', '@routeflow/types'],
    { cwd: root, stdio: 'inherit' },
  );
  if (result.status !== 0)
    fail('Não foi possível compilar @routeflow/types. Rode: npm run build:packages');
}

function apiCli(name) {
  ensureSharedPackages();
  const url = resolveDatabaseUrl({ required: true });
  const compiled = path.join(root, 'apps/api/dist/cli', `${name}.js`);
  const source = path.join(root, 'apps/api/src/cli', `${name}.ts`);
  const env = { DATABASE_URL: url, DATABASE_PROVIDER: provider };
  if (fs.existsSync(source) && !isProduction) {
    const tsx = require.resolve('tsx/cli');
    run(process.execPath, [tsx, source, ...extra], env);
  }
  if (!fs.existsSync(compiled))
    fail(`Build da API não encontrado (${compiled}). Rode npm run build.`);
  run(process.execPath, [compiled, ...extra], env);
}

switch (command) {
  case 'generate':
    prisma(['generate'], { requireUrl: false });
    break;
  case 'migrate':
  case 'deploy':
    guardProduction(false);
    prisma(['migrate', 'deploy']);
    break;
  case 'migrate-dev':
    guardProduction(true);
    prisma(['migrate', 'dev']);
    break;
  case 'status':
    prisma(['migrate', 'status']);
    break;
  case 'reset':
    guardProduction(true);
    if (provider !== 'postgresql')
      fail('reset é permitido apenas no PostgreSQL de desenvolvimento.');
    prisma(['migrate', 'reset', '--force']);
    break;
  case 'studio':
    prisma(['studio']);
    break;
  case 'seed':
    guardProduction(false);
    apiCli('seed');
    break;
  case 'import':
    guardProduction(false);
    apiCli('import-spreadsheet');
    break;
  case 'geocode':
    apiCli('geocode-stores');
    break;
  default:
    fail(`Comando desconhecido: ${command}`);
}
