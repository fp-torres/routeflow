#!/usr/bin/env node
/**
 * Monta o pacote de produção para a Hostinger (Business Web Hosting, sem VPS)
 * em ./release — pronto para o "Node.js Web App" do hPanel:
 *
 *   release/
 *     package.json   -> apenas dependências de runtime (versões exatas)
 *     dist/          -> API NestJS compilada (+ Prisma Clients gerados, sem binários nativos)
 *     public/        -> build do React (servido pela própria API)
 *     prisma/mysql/  -> schema + migrations MySQL/MariaDB (prisma migrate deploy)
 *     vendor/        -> pacote interno @routeflow/types compilado
 *     data/          -> planilha inicial (omitida com --no-data)
 *
 * Pré-requisito: npm run build
 * Uso: node scripts/prepare-release.mjs [--no-data] [--zip]
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'release');
const args = new Set(process.argv.slice(2));

function fail(message) {
  console.error(`✖ ${message}`);
  process.exit(1);
}

const required = [
  'apps/api/dist/main.js',
  'apps/web/dist/index.html',
  'packages/types/dist/index.cjs',
];
for (const file of required)
  if (!fs.existsSync(path.join(root, file)))
    fail(`${file} não encontrado. Rode "npm run build" antes.`);

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const copy = (from, to, filter) =>
  fs.cpSync(path.join(root, from), path.join(out, to), { recursive: true, filter });

copy('apps/api/dist', 'dist', (src) => !src.endsWith('.tsbuildinfo') && !src.includes('.spec.'));
copy('apps/web/dist', 'public');
copy('prisma/mysql', 'prisma/mysql');
copy('packages/types/dist', 'vendor/routeflow-types/dist');
fs.writeFileSync(
  path.join(out, 'vendor/routeflow-types/package.json'),
  JSON.stringify(
    {
      name: '@routeflow/types',
      version: '1.0.0',
      private: true,
      main: './dist/index.cjs',
      types: './dist/index.d.cts',
      dependencies: { zod: readVersion('zod') },
    },
    null,
    2,
  ),
);
if (!args.has('--no-data') && fs.existsSync(path.join(root, 'data'))) copy('data', 'data');
fs.copyFileSync(path.join(root, '.env.example'), path.join(out, '.env.example'));

function readVersion(name) {
  const file = path.join(root, 'node_modules', name, 'package.json');
  if (!fs.existsSync(file)) fail(`Dependência ${name} não instalada (rode npm ci).`);
  return JSON.parse(fs.readFileSync(file, 'utf8')).version;
}

const api = JSON.parse(fs.readFileSync(path.join(root, 'apps/api/package.json'), 'utf8'));
const dependencies = {};
for (const name of Object.keys(api.dependencies)) {
  dependencies[name] =
    name === '@routeflow/types' ? 'file:vendor/routeflow-types' : readVersion(name);
}
dependencies.prisma = readVersion('prisma');

const pkg = {
  name: 'routeflow-app',
  version: JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version,
  private: true,
  routeflowRelease: true,
  description: 'RouteFlow — pacote de produção (API NestJS + frontend React).',
  engines: { node: '>=20.19.0' },
  scripts: {
    build: 'echo "Pacote pré-compilado: nada a compilar."',
    start: 'node dist/main.js',
    'db:deploy': 'prisma migrate deploy --config prisma/mysql/prisma.config.ts',
    'db:seed': 'node dist/cli/seed.js',
    'import:xlsx': 'node dist/cli/import-spreadsheet.js',
    'geocode:stores': 'node dist/cli/geocode-stores.js',
  },
  dependencies,
};
fs.writeFileSync(path.join(out, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
fs.writeFileSync(
  path.join(out, 'README-DEPLOY.md'),
  `# RouteFlow — pacote de produção\n\n1. Variáveis de ambiente no hPanel (veja .env.example): NODE_ENV=production, DATABASE_PROVIDER=mysql, DATABASE_URL, JWT_SECRET, APP_URL, TRUST_PROXY=true, STORAGE_PATH (pasta FORA desta aplicação).\n2. Instalar: npm install --omit=dev\n3. Migrations (MySQL/MariaDB): npm run db:deploy\n4. Seed inicial (usuário + planilha): SEED_USER_PASSWORD=... npm run db:seed\n5. Iniciar: npm start  (arquivo de entrada: dist/main.js)\n\nGuia completo: docs/deployment.md no repositório.\n`,
);

if (args.has('--zip')) {
  execFileSync('zip', ['-qr', path.join(root, 'routeflow-release.zip'), '.'], {
    cwd: out,
    stdio: 'inherit',
  });
  console.info('✔ routeflow-release.zip gerado.');
}
console.info(
  `✔ Release pronta em ${path.relative(root, out)}/ (${Object.keys(dependencies).length} dependências de runtime).`,
);
