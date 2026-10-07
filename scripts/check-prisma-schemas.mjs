#!/usr/bin/env node
/**
 * Garante que prisma/postgresql/schema.prisma e prisma/mysql/schema.prisma
 * representam a MESMA modelagem de negócio.
 *
 * Os arquivos só podem diferir:
 *   - no provider do bloco `datasource`;
 *   - no `output` do generator;
 *   - em comentários.
 *
 * Uso:
 *   node scripts/check-prisma-schemas.mjs          -> verifica (CI)
 *   node scripts/check-prisma-schemas.mjs --write  -> gera o schema MySQL a partir do PostgreSQL
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pgPath = path.join(root, 'prisma/postgresql/schema.prisma');
const myPath = path.join(root, 'prisma/mysql/schema.prisma');

function normalize(source) {
  return source
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, '').trimEnd())
    .filter((line) => !/^\s*provider\s*=\s*"(postgresql|mysql)"\s*$/.test(line))
    .filter((line) => !/^\s*output\s*=/.test(line))
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

function blocks(source) {
  const result = new Map();
  const regex = /^(model|enum)\s+(\w+)\s*\{([\s\S]*?)^\}/gm;
  let match;
  while ((match = regex.exec(source))) result.set(`${match[1]} ${match[2]}`, normalize(match[3]));
  return result;
}

const pg = fs.readFileSync(pgPath, 'utf8');

if (process.argv.includes('--write')) {
  const mysql = pg
    .replace('provider = "postgresql"', 'provider = "mysql"')
    .replace('apps/api/src/generated/prisma/postgresql', 'apps/api/src/generated/prisma/mysql')
    .replace('(PostgreSQL · desenvolvimento local)', '(MySQL/MariaDB · produção Hostinger)')
    .replace(
      'IMPORTANTE: prisma/mysql/schema.prisma representa',
      'IMPORTANTE: prisma/postgresql/schema.prisma representa',
    );
  fs.writeFileSync(myPath, mysql);
  console.info('prisma/mysql/schema.prisma atualizado a partir do schema PostgreSQL.');
  process.exit(0);
}

const my = fs.readFileSync(myPath, 'utf8');
const errors = [];
if (!/provider\s*=\s*"postgresql"/.test(pg))
  errors.push('Schema PostgreSQL sem provider "postgresql".');
if (!/provider\s*=\s*"mysql"/.test(my)) errors.push('Schema MySQL sem provider "mysql".');

const a = blocks(pg);
const b = blocks(my);
for (const [name, body] of a) {
  if (!b.has(name)) errors.push(`${name} existe no PostgreSQL mas não no MySQL.`);
  else if (b.get(name) !== body) errors.push(`${name} difere entre os schemas.`);
}
for (const name of b.keys())
  if (!a.has(name)) errors.push(`${name} existe no MySQL mas não no PostgreSQL.`);
if (normalize(pg) !== normalize(my) && errors.length === 0) {
  errors.push('Os schemas diferem fora de models/enums (generator/datasource).');
}

if (errors.length) {
  console.error('✖ Schemas Prisma fora de sincronia:\n  - ' + errors.join('\n  - '));
  console.error('\nCorrija manualmente ou rode: npm run db:sync-schemas');
  process.exit(1);
}
console.info(`✔ Schemas PostgreSQL e MySQL equivalentes (${a.size} models/enums).`);
