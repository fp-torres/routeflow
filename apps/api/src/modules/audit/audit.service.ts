import { Inject, Injectable, Logger, type OnApplicationShutdown } from '@nestjs/common';
import type { AuditLogDto, AuditQuery, Paginated } from '@routeflow/types';
import { isoToUtcDate, addDaysIso } from '@routeflow/types';
import { DB } from '../../database/database.module';
import type { Db, Prisma } from '../../database/prisma.types';
import { isoInstant, paginate, safeJsonParse } from '../../common/serialize';

export interface AuditEntry {
  userId?: string | null;
  entity: string;
  entityId?: string | null;
  action: string;
  metadata?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/** Trilha de auditoria. Gravações nunca interrompem a operação principal. */
@Injectable()
export class AuditService implements OnApplicationShutdown {
  private readonly logger = new Logger('Audit');
  private readonly pending = new Set<Promise<unknown>>();

  constructor(@Inject(DB) private readonly db: Db) {}

  log(entry: AuditEntry): Promise<void> {
    const write = this.db.auditLog
      .create({
        data: {
          userId: entry.userId ?? null,
          entity: entry.entity,
          entityId: entry.entityId ?? null,
          action: entry.action,
          metadata:
            entry.metadata === undefined ? null : JSON.stringify(entry.metadata).slice(0, 60_000),
          ipAddress: entry.ipAddress ?? null,
          userAgent: entry.userAgent ?? null,
        },
      })
      .then(() => undefined)
      .catch((error: unknown) =>
        this.logger.warn(`Falha ao registrar auditoria (${entry.action}): ${String(error)}`),
      );
    this.pending.add(write);
    void write.finally(() => this.pending.delete(write));
    return write;
  }

  async onApplicationShutdown(): Promise<void> {
    await Promise.allSettled([...this.pending]);
  }

  async list(query: AuditQuery): Promise<Paginated<AuditLogDto>> {
    const where: Prisma.AuditLogWhereInput = {
      ...(query.entity ? { entity: query.entity } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: isoToUtcDate(query.from) } : {}),
              ...(query.to ? { lt: isoToUtcDate(addDaysIso(query.to, 1)) } : {}),
            },
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      this.db.auditLog.count({ where }),
      this.db.auditLog.findMany({
        where,
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return paginate(
      rows.map((row) => ({
        id: row.id,
        entity: row.entity,
        entityId: row.entityId,
        action: row.action,
        metadata: safeJsonParse(row.metadata, null),
        user: row.user,
        ipAddress: row.ipAddress,
        createdAt: isoInstant(row.createdAt),
      })),
      total,
      query.page,
      query.pageSize,
    );
  }
}
