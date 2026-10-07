/* eslint-disable @typescript-eslint/no-require-imports -- carrega sob demanda apenas o client/driver do provider ativo */
import type { AppConfig } from '../config/env';
import type { Db } from './prisma.types';

/** Converte mysql://usuario:senha@host:porta/banco?ssl=true em configuração do driver mariadb. */
export function mariaDbPoolConfig(url: string, poolSize: number) {
  const parsed = new URL(url.replace(/^mysql:/i, 'mariadb:'));
  const ssl =
    parsed.searchParams.get('ssl') === 'true' || parsed.searchParams.get('sslmode') === 'require';
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: decodeURIComponent(parsed.pathname.replace(/^\//, '')),
    connectionLimit: poolSize,
    connectTimeout: 10_000,
    allowPublicKeyRetrieval: parsed.searchParams.get('allowPublicKeyRetrieval') !== 'false',
    ...(ssl
      ? {
          ssl: {
            rejectUnauthorized: parsed.searchParams.get('sslaccept') !== 'accept_invalid_certs',
          },
        }
      : {}),
  };
}

/**
 * Fábrica única do Prisma Client. É o ÚNICO ponto da aplicação que conhece o
 * provider: escolhe o client gerado e o driver adapter correto (sem binários nativos).
 */
export function createDatabaseClient(database: AppConfig['database']): Db {
  if (database.provider === 'mysql') {
    const { PrismaClient } =
      require('../generated/prisma/mysql/client') as typeof import('../generated/prisma/mysql/client');
    const { PrismaMariaDb } =
      require('@prisma/adapter-mariadb') as typeof import('@prisma/adapter-mariadb');
    const client = new PrismaClient({
      adapter: new PrismaMariaDb(mariaDbPoolConfig(database.url, database.poolSize)),
    });
    return client as unknown as Db;
  }
  const { PrismaClient } =
    require('../generated/prisma/postgresql/client') as typeof import('../generated/prisma/postgresql/client');
  const { PrismaPg } = require('@prisma/adapter-pg') as typeof import('@prisma/adapter-pg');
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: database.url, max: database.poolSize }),
  });
}
