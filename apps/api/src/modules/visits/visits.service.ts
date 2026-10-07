import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  formatDateBR,
  isoToUtcDate,
  todayIso,
  VISIT_STATUS_LABEL,
  type Paginated,
  type VisitActionResult,
  type VisitActivityInput,
  type VisitCreateInput,
  type VisitDetailDto,
  type VisitFinishInput,
  type VisitQuery,
  type VisitRescheduleInput,
  type VisitStartInput,
  type VisitSummaryDto,
  type VisitUpdateInput,
} from '@routeflow/types';
import { APP_CONFIG, type AppConfig } from '../../config/env';
import { DB } from '../../database/database.module';
import type { Db, Prisma } from '../../database/prisma.types';
import {
  canSeeAll,
  employeeFilter,
  resolveEmployeeId,
  type AuthUser,
} from '../../common/auth-user';
import { NO_AUTHORIZATION } from '../../common/mappers';
import { isoDate, isoInstant, money, moneyOrNull, paginate } from '../../common/serialize';
import { containsInsensitive } from '../../common/text-search';
import { toPhotoDto, toVisitSummary, visitSummaryInclude } from '../../common/visit-mappers';
import { AuditService } from '../audit/audit.service';
import { AuthorizationsService } from '../authorizations/authorizations.service';
import { RoutesService } from '../routes/routes.service';
import { SettingsService } from '../settings/settings.service';
import { StorageService } from '../storage/storage.service';

const detailInclude = {
  ...visitSummaryInclude,
  photos: { orderBy: { createdAt: 'asc' } },
  activities: {
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, name: true } } },
  },
  expenses: {
    orderBy: { createdAt: 'desc' },
    include: { employee: { select: { id: true, name: true } } },
  },
  rescheduledFrom: { select: { id: true, scheduledDate: true } },
  rescheduledTo: { select: { id: true, scheduledDate: true } },
} satisfies Prisma.VisitInclude;

/** Fluxo da visita: iniciar -> registrar atividade/fotos/observações -> finalizar. */
@Injectable()
export class VisitsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly letters: AuthorizationsService,
    private readonly settings: SettingsService,
    private readonly routes: RoutesService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  async list(query: VisitQuery, user: AuthUser): Promise<Paginated<VisitSummaryDto>> {
    const provider = this.config.database.provider;
    const employeeId = employeeFilter(user, query.employeeId);
    const and: Prisma.VisitWhereInput[] = [];
    if (employeeId) and.push({ employeeId });
    if (query.date) and.push({ scheduledDate: isoToUtcDate(query.date) });
    if (query.from) and.push({ scheduledDate: { gte: isoToUtcDate(query.from) } });
    if (query.to) and.push({ scheduledDate: { lte: isoToUtcDate(query.to) } });
    if (query.status?.length) and.push({ status: { in: query.status } });
    if (query.storeId) and.push({ storeId: query.storeId });
    if (query.network) and.push({ store: { network: query.network } });
    if (query.region) and.push({ store: { region: query.region } });
    if (query.search) {
      const c = containsInsensitive(provider, query.search);
      and.push({
        OR: [
          { store: { name: c } },
          { store: { code: c } },
          { store: { neighborhood: c } },
          { notes: c },
        ],
      });
    }
    const where: Prisma.VisitWhereInput = and.length ? { AND: and } : {};
    const descending = !query.date && !query.from;
    const [total, rows] = await Promise.all([
      this.db.visit.count({ where }),
      this.db.visit.findMany({
        where,
        include: visitSummaryInclude,
        orderBy: [{ scheduledDate: descending ? 'desc' : 'asc' }, { order: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    const auth = await this.letters.summaries(rows.map((r) => r.storeId));
    return paginate(
      rows.map((r) => toVisitSummary(r, auth.get(r.storeId) ?? NO_AUTHORIZATION)),
      total,
      query.page,
      query.pageSize,
    );
  }

  private async findAccessible(id: string, user: AuthUser) {
    const visit = await this.db.visit.findUnique({ where: { id }, include: { store: true } });
    if (!visit || (visit.employeeId !== user.id && !canSeeAll(user)))
      throw new NotFoundException('Visita não encontrada.');
    return visit;
  }

  async detail(id: string, user: AuthUser): Promise<VisitDetailDto> {
    const visit = await this.db.visit.findUnique({ where: { id }, include: detailInclude });
    if (!visit || (visit.employeeId !== user.id && !canSeeAll(user)))
      throw new NotFoundException('Visita não encontrada.');
    const [auth, letters, settings, next] = await Promise.all([
      this.letters.summaries([visit.storeId]),
      this.letters.list({ storeId: visit.storeId }),
      this.settings.get(),
      visit.routeId
        ? this.db.visit.findFirst({
            where: {
              routeId: visit.routeId,
              order: { gt: visit.order },
              status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] },
            },
            orderBy: { order: 'asc' },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);
    return {
      ...toVisitSummary(visit, auth.get(visit.storeId) ?? NO_AUTHORIZATION),
      statusReason: visit.statusReason,
      latitudeAtStart: visit.latitudeAtStart,
      longitudeAtStart: visit.longitudeAtStart,
      latitudeAtFinish: visit.latitudeAtFinish,
      longitudeAtFinish: visit.longitudeAtFinish,
      photos: visit.photos.map((p) => toPhotoDto(p, this.storage)),
      activities: visit.activities.map((a) => ({
        id: a.id,
        type: a.type,
        description: a.description,
        createdAt: isoInstant(a.createdAt),
        user: a.user,
      })),
      letters,
      expenses: visit.expenses.map((e) => ({
        id: e.id,
        date: isoDate(e.date),
        type: e.type,
        description: e.description,
        value: money(e.value),
        estimatedValue: moneyOrNull(e.estimatedValue),
        actualValue: moneyOrNull(e.actualValue),
        routeId: e.routeId,
        visitId: e.visitId,
        visitStoreName: visit.store.name,
        employee: e.employee,
        createdAt: isoInstant(e.createdAt),
      })),
      rescheduledFrom: visit.rescheduledFrom
        ? {
            id: visit.rescheduledFrom.id,
            scheduledDate: isoDate(visit.rescheduledFrom.scheduledDate),
          }
        : null,
      rescheduledTo: visit.rescheduledTo
        ? { id: visit.rescheduledTo.id, scheduledDate: isoDate(visit.rescheduledTo.scheduledDate) }
        : null,
      nextVisitId: next?.id ?? null,
      blockWithoutAuthorization: settings.blockVisitWithoutAuthorization,
      activityPresets: settings.activityPresets,
    };
  }

  async create(
    input: VisitCreateInput,
    user: AuthUser,
    employeeId?: string,
  ): Promise<VisitDetailDto> {
    const visit = await this.routes.addStoreToDate(
      resolveEmployeeId(user, employeeId),
      input.scheduledDate,
      input.storeId,
      { notes: input.notes ?? null },
    );
    void this.audit.log({
      userId: user.id,
      entity: 'visit',
      entityId: visit.id,
      action: 'visit.create',
      metadata: input,
    });
    return this.detail(visit.id, user);
  }

  async start(id: string, input: VisitStartInput, user: AuthUser): Promise<VisitActionResult> {
    const visit = await this.findAccessible(id, user);
    if (visit.status === 'IN_PROGRESS')
      throw new ConflictException('A visita já está em andamento.');
    if (visit.status !== 'PENDING' && visit.status !== 'BLOCKED') {
      throw new ConflictException(
        `Não é possível iniciar uma visita com status "${VISIT_STATUS_LABEL[visit.status]}".`,
      );
    }
    const [auth, settings] = await Promise.all([
      this.letters.summaries([visit.storeId]),
      this.settings.get(),
    ]);
    const hasValid = auth.get(visit.storeId)?.hasValid ?? false;
    if (!hasValid && settings.blockVisitWithoutAuthorization) {
      await this.db.visit.update({
        where: { id },
        data: { status: 'BLOCKED', statusReason: 'Loja sem carta de autorização válida' },
      });
      throw new ConflictException(
        'Visita bloqueada: a loja não possui carta de autorização válida (regra ativa nas configurações).',
      );
    }
    const now = new Date();
    await this.db.$transaction([
      this.db.visit.update({
        where: { id },
        data: {
          status: 'IN_PROGRESS',
          startedAt: now,
          finishedAt: null,
          statusReason: null,
          latitudeAtStart: input.latitude ?? null,
          longitudeAtStart: input.longitude ?? null,
          accuracyAtStart: input.accuracy ?? null,
        },
      }),
      this.db.visitActivity.create({
        data: {
          visitId: id,
          userId: user.id,
          type: 'STATUS_CHANGE',
          description: 'Visita iniciada',
        },
      }),
      this.db.routeStop.updateMany({ where: { visitId: id }, data: { actualArrival: now } }),
    ]);
    if (visit.routeId) await this.routes.syncStatus(visit.routeId);
    void this.audit.log({
      userId: user.id,
      entity: 'visit',
      entityId: id,
      action: 'visit.start',
      metadata: { withLocation: input.latitude != null },
    });
    return {
      visit: await this.detail(id, user),
      warning: hasValid
        ? null
        : 'Atenção: esta loja não possui carta de autorização válida. A visita foi iniciada mesmo assim.',
    };
  }

  async finish(id: string, input: VisitFinishInput, user: AuthUser): Promise<VisitActionResult> {
    const visit = await this.findAccessible(id, user);
    if (input.status === 'COMPLETED' && visit.status !== 'IN_PROGRESS')
      throw new ConflictException('Inicie a visita antes de finalizá-la.');
    if (input.status === 'NOT_COMPLETED') {
      if (!['PENDING', 'IN_PROGRESS', 'BLOCKED'].includes(visit.status))
        throw new ConflictException('Esta visita já foi encerrada.');
      if (!input.reason) throw new BadRequestException('Informe o motivo da visita não realizada.');
    }
    await this.db.$transaction([
      this.db.visit.update({
        where: { id },
        data: {
          status: input.status,
          finishedAt: new Date(),
          notes: input.notes ?? visit.notes,
          statusReason: input.reason ?? null,
          latitudeAtFinish: input.latitude ?? null,
          longitudeAtFinish: input.longitude ?? null,
          accuracyAtFinish: input.accuracy ?? null,
        },
      }),
      this.db.visitActivity.create({
        data: {
          visitId: id,
          userId: user.id,
          type: 'STATUS_CHANGE',
          description:
            input.status === 'COMPLETED'
              ? 'Visita concluída'
              : `Visita não realizada: ${input.reason}`,
        },
      }),
    ]);
    if (visit.routeId) await this.routes.syncStatus(visit.routeId);
    void this.audit.log({
      userId: user.id,
      entity: 'visit',
      entityId: id,
      action: 'visit.finish',
      metadata: { status: input.status },
    });
    return { visit: await this.detail(id, user), warning: null };
  }

  /**
   * Edição da visita — inclusive depois de finalizada (esqueceu algo? corrige aqui):
   * observações, resultado (concluída ⇄ não realizada), motivo e horários de início/fim.
   * Fotos, atividades e despesas continuam podendo ser adicionadas. Tudo fica no histórico.
   */
  async update(id: string, input: VisitUpdateInput, user: AuthUser): Promise<VisitDetailDto> {
    const visit = await this.findAccessible(id, user);
    const data: Prisma.VisitUpdateInput = {};
    const changes: string[] = [];
    const closed = visit.status === 'COMPLETED' || visit.status === 'NOT_COMPLETED';
    if (input.notes !== undefined && (input.notes ?? null) !== (visit.notes ?? null)) {
      data.notes = input.notes;
      changes.push('observações');
    }
    if (input.status && input.status !== visit.status) {
      const allowed: Record<string, string[]> = {
        PENDING: ['IN_PROGRESS', 'BLOCKED', 'CANCELLED', 'NOT_COMPLETED'],
        CANCELLED: ['PENDING', 'BLOCKED'],
        BLOCKED: ['PENDING'],
        // correção do resultado de uma visita já finalizada
        COMPLETED: ['NOT_COMPLETED'],
        NOT_COMPLETED: ['COMPLETED'],
      };
      if (!allowed[input.status]?.includes(visit.status)) {
        throw new ConflictException(
          `Não é possível mudar de "${VISIT_STATUS_LABEL[visit.status]}" para "${VISIT_STATUS_LABEL[input.status]}". Use iniciar, finalizar ou reagendar.`,
        );
      }
      data.status = input.status;
      data.statusReason =
        input.status === 'COMPLETED' ? null : (input.statusReason ?? visit.statusReason ?? null);
      if (input.status === 'PENDING') {
        data.startedAt = null;
        data.finishedAt = null;
      }
      changes.push(
        `resultado: ${VISIT_STATUS_LABEL[visit.status]} → ${VISIT_STATUS_LABEL[input.status]}`,
      );
    } else if (
      input.statusReason !== undefined &&
      (input.statusReason ?? null) !== (visit.statusReason ?? null)
    ) {
      data.statusReason = input.statusReason;
      changes.push('motivo');
    }
    let startedAt = visit.startedAt;
    let finishedAt = visit.finishedAt;
    if (input.startedAt !== undefined) {
      if (!closed && visit.status !== 'IN_PROGRESS') {
        throw new ConflictException(
          'O horário de início só pode ser ajustado em visitas iniciadas ou finalizadas.',
        );
      }
      const value = input.startedAt ? new Date(input.startedAt) : null;
      if ((value?.getTime() ?? null) !== (visit.startedAt?.getTime() ?? null)) {
        startedAt = value;
        data.startedAt = value;
        changes.push('horário de início');
      }
    }
    if (input.finishedAt !== undefined) {
      if (!closed)
        throw new ConflictException(
          'O horário de término só pode ser ajustado em visitas finalizadas.',
        );
      const value = input.finishedAt ? new Date(input.finishedAt) : null;
      if ((value?.getTime() ?? null) !== (visit.finishedAt?.getTime() ?? null)) {
        finishedAt = value;
        data.finishedAt = value;
        changes.push('horário de término');
      }
    }
    if (startedAt && finishedAt && startedAt > finishedAt) {
      throw new BadRequestException('O término precisa ser depois do início.');
    }
    if (changes.length === 0) return this.detail(id, user);
    await this.db.visit.update({ where: { id }, data });
    await this.db.visitActivity.create({
      data: {
        visitId: id,
        userId: user.id,
        type: data.status ? 'STATUS_CHANGE' : 'SYSTEM',
        description: `Visita editada${closed ? ' após a finalização' : ''}: ${changes.join(', ')}`,
      },
    });
    if (data.status && visit.routeId) await this.routes.syncStatus(visit.routeId);
    void this.audit.log({
      userId: user.id,
      entity: 'visit',
      entityId: id,
      action: 'visit.update',
      metadata: {
        changes,
        before: {
          status: visit.status,
          notes: visit.notes,
          startedAt: visit.startedAt,
          finishedAt: visit.finishedAt,
        },
        after: input,
      },
    });
    return this.detail(id, user);
  }

  async addActivity(
    id: string,
    input: VisitActivityInput,
    user: AuthUser,
  ): Promise<VisitDetailDto> {
    await this.findAccessible(id, user);
    await this.db.visitActivity.create({
      data: { visitId: id, userId: user.id, type: input.type, description: input.description },
    });
    void this.audit.log({
      userId: user.id,
      entity: 'visit',
      entityId: id,
      action: input.type === 'NOTE' ? 'visit.note' : 'visit.activity',
    });
    return this.detail(id, user);
  }

  async reschedule(
    id: string,
    input: VisitRescheduleInput,
    user: AuthUser,
  ): Promise<VisitDetailDto> {
    const visit = await this.findAccessible(id, user);
    if (['COMPLETED', 'RESCHEDULED', 'CANCELLED'].includes(visit.status))
      throw new ConflictException('Esta visita não pode ser reagendada.');
    if (input.date === isoDate(visit.scheduledDate))
      throw new BadRequestException('Escolha uma data diferente da atual.');
    if (input.date < todayIso(this.config.timeZone))
      throw new BadRequestException('Reagende para hoje ou uma data futura.');
    const created = await this.routes.addStoreToDate(visit.employeeId, input.date, visit.storeId, {
      rescheduledFromId: visit.id,
      notes: visit.notes,
    });
    const reason = input.reason ?? `Reagendada para ${formatDateBR(input.date)}`;
    await this.db.$transaction([
      this.db.visit.update({
        where: { id },
        data: { status: 'RESCHEDULED', statusReason: reason },
      }),
      this.db.visitActivity.create({
        data: { visitId: id, userId: user.id, type: 'STATUS_CHANGE', description: reason },
      }),
      this.db.visitActivity.create({
        data: {
          visitId: created.id,
          userId: user.id,
          type: 'SYSTEM',
          description: `Reagendada de ${formatDateBR(isoDate(visit.scheduledDate))}`,
        },
      }),
    ]);
    if (visit.routeId) await this.routes.syncStatus(visit.routeId);
    void this.audit.log({
      userId: user.id,
      entity: 'visit',
      entityId: id,
      action: 'visit.reschedule',
      metadata: { to: input.date, newVisitId: created.id },
    });
    return this.detail(created.id, user);
  }
}
