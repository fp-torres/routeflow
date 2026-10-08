"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mariaDbPoolConfig = mariaDbPoolConfig;
exports.createDatabaseClient = createDatabaseClient;
/** Converte mysql://usuario:senha@host:porta/banco?ssl=true em configuração do driver mariadb. */
function mariaDbPoolConfig(url, poolSize) {
    const parsed = new URL(url.replace(/^mysql:/i, 'mariadb:'));
    const ssl = parsed.searchParams.get('ssl') === 'true' || parsed.searchParams.get('sslmode') === 'require';
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
function createDatabaseClient(database) {
    if (database.provider === 'mysql') {
        const { PrismaClient } = require('../generated/prisma/mysql/client');
        const { PrismaMariaDb } = require('@prisma/adapter-mariadb');
        const client = new PrismaClient({
            adapter: new PrismaMariaDb(mariaDbPoolConfig(database.url, database.poolSize)),
        });
        return client;
    }
    const { PrismaClient } = require('../generated/prisma/postgresql/client');
    const { PrismaPg } = require('@prisma/adapter-pg');
    return new PrismaClient({
        adapter: new PrismaPg({ connectionString: database.url, max: database.poolSize }),
    });
}
//# sourceMappingURL=database.factory.js.map