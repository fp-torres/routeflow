/**
 * Tipos do banco. A aplicação é tipada com o Prisma Client gerado a partir do
 * schema PostgreSQL; o client MySQL é gerado do schema equivalente (mesmos
 * models/enums — garantido por `npm run db:check`) e tem a mesma API em runtime.
 */
import type { Prisma, PrismaClient } from '../generated/prisma/postgresql/client';

export type Db = PrismaClient;
export type Tx = Prisma.TransactionClient;
export type { Prisma };
