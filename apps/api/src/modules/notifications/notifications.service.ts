import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  addDaysIso,
  computeLetterValidity,
  describeDaysLeft,
  isoToUtcDate,
  todayIso,
  type NotificationDto,
  type NotificationType,
} from '@routeflow/types';
import { APP_CONFIG, type AppConfig } from '../../config/env';
import { DB } from '../../database/database.module';
import type { Db } from '../../database/prisma.types';
import { isoDateOrNull, isoInstant } from '../../common/serialize';
import { SettingsService } from '../settings/settings.service';

export interface NewNotification {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  dedupeKey?: string | null;
}

/**
 * Central de notificações internas. Canais futuros (e-mail, push, WhatsApp)
 * podem ser plugados em `deliver()` sem alterar quem gera as notificações.
 */
@Injectable()
export class NotificationsService implements OnApplicationBootstrap {
  private readonly logger = new Logger('Notifications');

  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly settings: SettingsService,
  ) {}

  onApplicationBootstrap(): void {
    if (this.config.env === 'test') return;
    setTimeout(
      () => void this.runDailyChecks().catch((e: unknown) => this.logger.warn(String(e))),
      20_000,
    ).unref();
  }

  async createMany(items: NewNotification[]): Promise<number> {
    if (items.length === 0) return 0;
    const result = await this.db.notification.createMany({
      data: items.map((i) => ({
        userId: i.userId,
        type: i.type,
        title: i.title,
        message: i.message,
        link: i.link ?? null,
        dedupeKey: i.dedupeKey ?? null,
      })),
      skipDuplicates: true,
    });
    return result.count;
  }

  async list(userId: string, unreadOnly: boolean): Promise<NotificationDto[]> {
    const rows = await this.db.notification.findMany({
      where: { userId, ...(unreadOnly ? { read: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      link: n.link,
      read: n.read,
      createdAt: isoInstant(n.createdAt),
    }));
  }

  unreadCount(userId: string): Promise<number> {
    return this.db.notification.count({ where: { userId, read: false } });
  }

  async markRead(userId: string, id: string): Promise<void> {
    const result = await this.db.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
    if (result.count === 0) throw new NotFoundException('Notificação não encontrada.');
  }

  async markAllRead(userId: string): Promise<number> {
    return (
      await this.db.notification.updateMany({
        where: { userId, read: false },
        data: { read: true },
      })
    ).count;
  }

  /** Executado diariamente às 7h (horário de Brasília) e alguns segundos após o boot. */
  @Cron('0 7 * * *', { name: 'routeflow-daily-checks', timeZone: 'America/Sao_Paulo' })
  async runDailyChecks(): Promise<number> {
    const today = todayIso(this.config.timeZone);
    const thresholds = await this.settings.thresholds();
    const users = await this.db.user.findMany({ where: { active: true }, select: { id: true } });
    const items: NewNotification[] = [];

    const letters = await this.db.authorizationLetter.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        expirationDate: { lte: isoToUtcDate(addDaysIso(today, thresholds.warningDays)) },
      },
      include: { stores: { include: { store: { select: { id: true, code: true, name: true } } } } },
    });
    for (const letter of letters) {
      const expirationDate = isoDateOrNull(letter.expirationDate);
      const { validity, daysLeft } = computeLetterValidity(
        { status: letter.status, expirationDate },
        today,
        thresholds,
      );
      if (validity !== 'EXPIRED' && validity !== 'CRITICAL' && validity !== 'EXPIRING') continue;
      if (validity === 'EXPIRED' && daysLeft != null && daysLeft < -30) continue;
      const covered = letter.stores.map((s) => s.store);
      const single = covered.length === 1 ? covered[0]! : null;
      const scope = single ? single.code : `${letter.network ?? 'carta'} (${covered.length} lojas)`;
      const names =
        covered
          .slice(0, 4)
          .map((s) => s.code)
          .join(', ') + (covered.length > 4 ? ` e mais ${covered.length - 4}` : '');
      const type: NotificationType =
        validity === 'EXPIRED' ? 'AUTHORIZATION_EXPIRED' : 'AUTHORIZATION_EXPIRING';
      for (const user of users) {
        items.push({
          userId: user.id,
          type,
          title: `${validity === 'EXPIRED' ? 'Autorização vencida' : 'Autorização vencendo'} — ${scope}`,
          message: `"${letter.title}" (${names}). ${describeDaysLeft(daysLeft)}.`,
          link: single ? `/lojas/${single.id}/autorizacoes` : '/autorizacoes',
          dedupeKey: `auth:${validity}:${letter.id}:${expirationDate}:${user.id}`,
        });
      }
    }

    const visitsToday = await this.db.visit.groupBy({
      by: ['employeeId'],
      where: { scheduledDate: isoToUtcDate(today), status: { in: ['PENDING', 'IN_PROGRESS'] } },
      _count: { _all: true },
    });
    for (const row of visitsToday) {
      items.push({
        userId: row.employeeId,
        type: 'VISIT_UPCOMING',
        title: `Você tem ${row._count._all} visita${row._count._all === 1 ? '' : 's'} hoje`,
        message: 'Abra a rota do dia para ver a ordem e os trajetos.',
        link: '/dashboard',
        dedupeKey: `visits-today:${row.employeeId}:${today}`,
      });
    }

    const yesterday = addDaysIso(today, -1);
    const leftovers = await this.db.visit.groupBy({
      by: ['employeeId'],
      where: { scheduledDate: isoToUtcDate(yesterday), status: { in: ['PENDING', 'IN_PROGRESS'] } },
      _count: { _all: true },
    });
    for (const row of leftovers) {
      items.push({
        userId: row.employeeId,
        type: 'VISIT_PENDING',
        title: `${row._count._all} visita${row._count._all === 1 ? '' : 's'} de ontem sem finalização`,
        message: 'Finalize, marque como não realizada ou reagende para manter o histórico correto.',
        link: `/visitas?date=${yesterday}`,
        dedupeKey: `visits-pending:${row.employeeId}:${yesterday}`,
      });
    }

    await this.db.notification.deleteMany({
      where: { read: true, createdAt: { lt: new Date(Date.now() - 90 * 86_400_000) } },
    });
    const created = await this.createMany(items);
    if (created) this.logger.log(`${created} notificação(ões) criada(s).`);
    return created;
  }
}
