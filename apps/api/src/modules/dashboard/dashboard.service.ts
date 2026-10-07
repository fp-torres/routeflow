import { Inject, Injectable } from '@nestjs/common';
import {
  addDaysIso,
  eachDayIso,
  endOfMonthIso,
  endOfWeekIso,
  formatShortDateBR,
  holidayOn,
  isoToUtcDate,
  startOfMonthIso,
  startOfWeekIso,
  todayIso,
  TRANSPORT_TYPES,
  VISIT_STATUS_LABEL,
  VISIT_STATUSES,
  WEEKDAY_SHORT_LABEL,
  isoWeekday,
  type AuthorizationCounters,
  type ChartPoint,
  type DashboardAlert,
  type DashboardDto,
  type ExpiringLetterItem,
  type IsoDate,
  type ManagerMetricsDto,
  type VisitStatus,
} from '@routeflow/types';
import { APP_CONFIG, type AppConfig } from '../../config/env';
import { DB } from '../../database/database.module';
import type { Db } from '../../database/prisma.types';
import { resolveEmployeeId, type AuthUser } from '../../common/auth-user';
import { NO_AUTHORIZATION } from '../../common/mappers';
import { isoDate, isoInstant, money } from '../../common/serialize';
import { toVisitSummary, visitSummaryInclude } from '../../common/visit-mappers';
import { AuthorizationsService } from '../authorizations/authorizations.service';
import { ExpensesService } from '../expenses/expenses.service';
import { PlannerService } from '../routes/planner.service';
import { SettingsService } from '../settings/settings.service';
import { FaresService } from '../transport/fares.service';

@Injectable()
export class DashboardService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly planner: PlannerService,
    private readonly letters: AuthorizationsService,
    private readonly expenses: ExpensesService,
    private readonly settings: SettingsService,
    private readonly fares: FaresService,
  ) {}

  /** Situação das autorizações das lojas ativas (lojas que não exigem carta contam à parte). */
  async authorizationOverview(): Promise<
    AuthorizationCounters & { expiringSoon: ExpiringLetterItem[]; expiringIn7Days: number }
  > {
    const stores = await this.db.store.findMany({ where: { active: true }, select: { id: true } });
    const [summaries, letters] = await Promise.all([
      this.letters.summaries(stores.map((s) => s.id)),
      this.letters.list({}),
    ]);
    const counters: AuthorizationCounters = {
      valid: 0,
      expiring: 0,
      critical: 0,
      expired: 0,
      withoutLetter: 0,
      notRequired: 0,
    };
    for (const store of stores) {
      const s = summaries.get(store.id);
      if (!s || !s.required) counters.notRequired += 1;
      else if (!s.validity) counters.withoutLetter += 1;
      else if (s.validity === 'VALID' || s.validity === 'NO_EXPIRATION') counters.valid += 1;
      else if (s.validity === 'EXPIRING') counters.expiring += 1;
      else if (s.validity === 'CRITICAL') counters.critical += 1;
      else counters.expired += 1;
    }
    const items: ExpiringLetterItem[] = [];
    for (const letter of letters) {
      const relevant =
        letter.validity === 'CRITICAL' ||
        letter.validity === 'EXPIRING' ||
        (letter.validity === 'EXPIRED' && (letter.daysLeft ?? 0) >= -30);
      if (!relevant) continue;
      const covered = letter.stores.filter((s) => summaries.get(s.id)?.required);
      const first = covered[0];
      if (!first) continue;
      items.push({
        letterId: letter.id,
        storeId: first.id,
        storeName: covered.length > 1 ? `${letter.title} (${covered.length} lojas)` : first.name,
        storeCode: covered.length > 1 ? (letter.network ?? first.code) : first.code,
        expirationDate: letter.expirationDate,
        daysLeft: letter.daysLeft,
        validity: letter.validity,
      });
    }
    items.sort((x, y) => (x.daysLeft ?? 0) - (y.daysLeft ?? 0));
    return {
      ...counters,
      expiringSoon: items.slice(0, 12),
      expiringIn7Days: items.filter((i) => i.validity === 'CRITICAL').length,
    };
  }

  async employee(user: AuthUser, requested?: string | null): Promise<DashboardDto> {
    const employeeId = resolveEmployeeId(user, requested);
    const viewed =
      employeeId === user.id
        ? { id: user.id, name: user.name }
        : await this.db.user.findUniqueOrThrow({
            where: { id: employeeId },
            select: { id: true, name: true },
          });
    const today = todayIso(this.config.timeZone);
    await this.planner.ensureUpcoming(employeeId);
    const monthFrom = startOfMonthIso(today);
    const monthTo = endOfMonthIso(today);
    const [
      route,
      todayVisits,
      monthRoutes,
      auth,
      expensesToday,
      expensesMonth,
      faresNeedReview,
      home,
      storesWithoutCoords,
    ] = await Promise.all([
      this.db.route.findUnique({
        where: { employeeId_date: { employeeId, date: isoToUtcDate(today) } },
        include: {
          stops: {
            orderBy: { order: 'asc' },
            include: {
              store: { select: { id: true, code: true, name: true, neighborhood: true } },
              visit: { select: { id: true, status: true } },
            },
          },
        },
      }),
      this.db.visit.findMany({
        where: { employeeId, scheduledDate: isoToUtcDate(today) },
        include: visitSummaryInclude,
        orderBy: { order: 'asc' },
      }),
      this.db.route.aggregate({
        where: { employeeId, date: { gte: isoToUtcDate(monthFrom), lte: isoToUtcDate(monthTo) } },
        _sum: { estimatedDistance: true },
      }),
      this.authorizationOverview(),
      this.expenses.sumBetween(employeeId, today, today),
      this.expenses.sumBetween(employeeId, monthFrom, monthTo),
      this.fares.needsReview(),
      this.db.homeAddress.findFirst({ where: { employeeId, active: true } }),
      this.db.store.count({
        where: { active: true, OR: [{ latitude: null }, { longitude: null }] },
      }),
    ]);
    const active = todayVisits.filter(
      (v) => v.status !== 'RESCHEDULED' && v.status !== 'CANCELLED',
    );
    const count = (status: VisitStatus) => active.filter((v) => v.status === status).length;
    const counts = {
      total: active.length,
      completed: count('COMPLETED'),
      pending: count('PENDING') + count('BLOCKED'),
      inProgress: count('IN_PROGRESS'),
      notCompleted: count('NOT_COMPLETED'),
      rescheduled: todayVisits.filter((v) => v.status === 'RESCHEDULED').length,
    };
    const summaries = await this.letters.summaries(todayVisits.map((v) => v.storeId));
    const next =
      active.find((v) => v.status === 'IN_PROGRESS') ??
      active.find((v) => v.status === 'PENDING' || v.status === 'BLOCKED') ??
      null;
    const withoutValid = active
      .filter((v) => !(summaries.get(v.storeId)?.hasValid ?? false))
      .map((v) => ({ storeId: v.storeId, code: v.store.code, name: v.store.name }));

    const holiday = holidayOn(today) ?? null;
    const alerts: DashboardAlert[] = [];
    if (holiday)
      alerts.push({
        id: 'holiday',
        tone: 'info',
        title: `Hoje é ${holiday.kind === 'national' ? 'feriado' : 'ponto facultativo'}: ${holiday.name}`,
        description: 'Confirme o funcionamento das lojas antes de sair.',
        link: null,
      });
    if (!home)
      alerts.push({
        id: 'home',
        tone: 'warning',
        title: 'Endereço de casa não cadastrado',
        description: 'Ele é a origem e o destino final das rotas.',
        link: '/configuracoes',
      });
    if (auth.expiringIn7Days > 0) {
      alerts.push({
        id: 'auth-7',
        tone: 'danger',
        title: `${auth.expiringIn7Days} autorizaç${auth.expiringIn7Days === 1 ? 'ão vence' : 'ões vencem'} nos próximos 7 dias.`,
        description: 'Providencie a renovação junto às lojas.',
        link: '/autorizacoes?validity=CRITICAL',
      });
    }
    if (auth.expired > 0)
      alerts.push({
        id: 'auth-expired',
        tone: 'critical',
        title: `${auth.expired} loja${auth.expired === 1 ? '' : 's'} com autorização expirada`,
        description: 'Visitas não são bloqueadas, mas a carta precisa ser renovada.',
        link: '/autorizacoes?validity=EXPIRED',
      });
    if (withoutValid.length > 0) {
      alerts.push({
        id: 'today-auth',
        tone: 'warning',
        title: `${withoutValid.length} loja${withoutValid.length === 1 ? '' : 's'} de hoje sem carta de autorização válida`,
        description:
          withoutValid
            .slice(0, 4)
            .map((s) => s.code)
            .join(', ') + (withoutValid.length > 4 ? '…' : ''),
        link: '/autorizacoes',
      });
    }
    if (faresNeedReview)
      alerts.push({
        id: 'fares',
        tone: 'info',
        title: 'Tarifas de transporte não confirmadas',
        description:
          'Revise os valores de referência para que as estimativas de custo fiquem corretas.',
        link: '/configuracoes?tab=tarifas',
      });
    if (storesWithoutCoords > 0)
      alerts.push({
        id: 'coords',
        tone: 'neutral',
        title: `${storesWithoutCoords} loja${storesWithoutCoords === 1 ? '' : 's'} sem coordenadas`,
        description: 'Necessárias para distância, custo estimado e otimização de rota.',
        link: '/lojas?withoutCoordinates=1',
      });

    const charts = await this.employeeCharts(employeeId, today);
    const timelineRows = await this.db.visitActivity.findMany({
      where: { visit: { employeeId } },
      include: { visit: { select: { id: true, store: { select: { name: true, code: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 12,
    });

    return {
      user: viewed,
      today,
      holiday,
      todayRoute: route
        ? {
            id: route.id,
            region: route.region,
            estimatedDistance: route.estimatedDistance,
            estimatedDuration: route.estimatedDuration,
            estimatedTransportCost:
              route.estimatedTransportCost == null ? null : money(route.estimatedTransportCost),
            stops: route.stops.map((s) => ({
              order: s.order,
              visitId: s.visit?.id ?? null,
              storeId: s.store.id,
              code: s.store.code,
              name: s.store.name,
              neighborhood: s.store.neighborhood,
              status: s.visit?.status ?? null,
            })),
          }
        : null,
      counts,
      progress: counts.total ? (counts.completed + counts.notCompleted) / counts.total : 0,
      nextVisit: next
        ? toVisitSummary(next, summaries.get(next.storeId) ?? NO_AUTHORIZATION)
        : null,
      expenses: {
        today: expensesToday,
        month: expensesMonth,
        estimatedToday:
          route?.estimatedTransportCost == null ? null : money(route.estimatedTransportCost),
      },
      distance: {
        todayMeters: route?.estimatedDistance ?? null,
        monthMeters: monthRoutes._sum.estimatedDistance ?? null,
      },
      authorizations: auth,
      todayStoresWithoutValidAuthorization: withoutValid,
      alerts,
      charts,
      timeline: timelineRows.map((a) => ({
        id: a.id,
        kind: a.type,
        title: `${a.visit.store.code} — ${a.visit.store.name}`,
        description: a.description,
        createdAt: isoInstant(a.createdAt),
        link: `/visitas/${a.visit.id}`,
      })),
      faresNeedReview,
    };
  }

  private async employeeCharts(
    employeeId: string,
    today: IsoDate,
  ): Promise<DashboardDto['charts']> {
    const from = addDaysIso(startOfWeekIso(today), -7);
    const to = endOfWeekIso(today);
    const monthFrom = startOfMonthIso(today);
    const monthTo = endOfMonthIso(today);
    const [visits, monthVisits, expenseRows] = await Promise.all([
      this.db.visit.findMany({
        where: { employeeId, scheduledDate: { gte: isoToUtcDate(from), lte: isoToUtcDate(to) } },
        select: { scheduledDate: true, status: true },
      }),
      this.db.visit.findMany({
        where: {
          employeeId,
          scheduledDate: { gte: isoToUtcDate(monthFrom), lte: isoToUtcDate(monthTo) },
        },
        select: { status: true, store: { select: { region: true } } },
      }),
      this.db.transportExpense.findMany({
        where: {
          employeeId,
          date: {
            gte: isoToUtcDate(addDaysIso(startOfWeekIso(today), -49)),
            lte: isoToUtcDate(to),
          },
        },
        select: { date: true, value: true },
      }),
    ]);
    const visitsByDay: ChartPoint[] = eachDayIso(from, to).map((date) => {
      const day = visits.filter(
        (v) =>
          isoDate(v.scheduledDate) === date &&
          v.status !== 'RESCHEDULED' &&
          v.status !== 'CANCELLED',
      );
      return {
        key: date,
        label: `${WEEKDAY_SHORT_LABEL[isoWeekday(date)]} ${formatShortDateBR(date)}`,
        total: day.length,
        completed: day.filter((v) => v.status === 'COMPLETED').length,
      };
    });
    const regions = new Map<string, ChartPoint>();
    for (const v of monthVisits) {
      if (v.status === 'RESCHEDULED' || v.status === 'CANCELLED') continue;
      const region = v.store.region ?? 'Sem região';
      const point = regions.get(region) ?? { key: region, label: region, total: 0, completed: 0 };
      point.total += 1;
      if (v.status === 'COMPLETED') point.completed = (point.completed ?? 0) + 1;
      regions.set(region, point);
    }
    const weeks: ChartPoint[] = [];
    for (let i = 7; i >= 0; i -= 1) {
      const start = addDaysIso(startOfWeekIso(today), -7 * i);
      const end = addDaysIso(start, 6);
      const total = expenseRows
        .filter((e) => isoDate(e.date) >= start && isoDate(e.date) <= end)
        .reduce((acc, e) => acc + money(e.value), 0);
      weeks.push({
        key: start,
        label: formatShortDateBR(start),
        total: Math.round(total * 100) / 100,
      });
    }
    return {
      visitsByDay,
      visitsByRegion: [...regions.values()].sort((a, b) => b.total - a.total),
      expensesByWeek: weeks,
      statusDistribution: VISIT_STATUSES.map((status) => ({
        status,
        label: VISIT_STATUS_LABEL[status],
        total: monthVisits.filter((v) => v.status === status).length,
      })).filter((s) => s.total > 0),
    };
  }

  /** Indicadores gerenciais do período (também usados no painel público e nos relatórios). */
  async metrics(from: IsoDate, to: IsoDate, employeeId?: string): Promise<ManagerMetricsDto> {
    const employeeWhere = employeeId ? { employeeId } : {};
    const [visits, expenses, byType, routes, auth] = await Promise.all([
      this.db.visit.findMany({
        where: {
          ...employeeWhere,
          scheduledDate: { gte: isoToUtcDate(from), lte: isoToUtcDate(to) },
        },
        select: {
          status: true,
          scheduledDate: true,
          store: { select: { network: true, region: true } },
        },
      }),
      this.expenses.sumBetween(employeeId, from, to),
      this.db.transportExpense.groupBy({
        by: ['type'],
        where: { ...employeeWhere, date: { gte: isoToUtcDate(from), lte: isoToUtcDate(to) } },
        _sum: { value: true },
      }),
      this.db.route.findMany({
        where: { ...employeeWhere, date: { gte: isoToUtcDate(from), lte: isoToUtcDate(to) } },
        select: { estimatedDistance: true },
      }),
      this.authorizationOverview(),
    ]);
    const by = (status: VisitStatus) => visits.filter((v) => v.status === status).length;
    const totals = {
      scheduled: visits.length,
      completed: by('COMPLETED'),
      pending: by('PENDING'),
      inProgress: by('IN_PROGRESS'),
      notCompleted: by('NOT_COMPLETED'),
      rescheduled: by('RESCHEDULED'),
      cancelled: by('CANCELLED'),
      blocked: by('BLOCKED'),
    };
    const effective = visits.filter((v) => v.status !== 'RESCHEDULED' && v.status !== 'CANCELLED');
    const workingDays = new Set(effective.map((v) => isoDate(v.scheduledDate))).size;
    const group = (key: (v: (typeof visits)[number]) => string): ChartPoint[] => {
      const map = new Map<string, ChartPoint>();
      for (const v of effective) {
        const k = key(v);
        const p = map.get(k) ?? { key: k, label: k, total: 0, completed: 0 };
        p.total += 1;
        if (v.status === 'COMPLETED') p.completed = (p.completed ?? 0) + 1;
        map.set(k, p);
      }
      return [...map.values()].sort((a, b) => b.total - a.total);
    };
    const byDay = eachDayIso(from, to)
      .map((date) => {
        const day = effective.filter((v) => isoDate(v.scheduledDate) === date);
        return {
          key: date,
          label: formatShortDateBR(date),
          total: day.length,
          completed: day.filter((v) => v.status === 'COMPLETED').length,
        };
      })
      .filter((p) => p.total > 0);
    const withDistance = routes.filter((r) => r.estimatedDistance != null);
    return {
      from,
      to,
      totals,
      completionRate: effective.length ? totals.completed / effective.length : 0,
      averageVisitsPerDay: workingDays ? Math.round((totals.completed / workingDays) * 10) / 10 : 0,
      workingDays,
      byNetwork: group((v) => v.store.network),
      byRegion: group((v) => v.store.region ?? 'Sem região'),
      byDay,
      byStatus: VISIT_STATUSES.map((status) => ({
        status,
        label: VISIT_STATUS_LABEL[status],
        total: by(status),
      })).filter((s) => s.total > 0),
      expenses: {
        total: expenses,
        perVisit: totals.completed ? Math.round((expenses / totals.completed) * 100) / 100 : null,
        byType: TRANSPORT_TYPES.map((type) => ({
          type,
          total: money(byType.find((b) => b.type === type)?._sum.value),
        })).filter((t) => t.total > 0),
      },
      distance: {
        totalMeters: withDistance.length
          ? withDistance.reduce((acc, r) => acc + (r.estimatedDistance ?? 0), 0)
          : null,
        routesWithEstimate: withDistance.length,
        routes: routes.length,
      },
      authorizations: {
        valid: auth.valid,
        expiring: auth.expiring,
        critical: auth.critical,
        expired: auth.expired,
        withoutLetter: auth.withoutLetter,
        notRequired: auth.notRequired,
        expiringSoon: auth.expiringSoon,
      },
    };
  }
}
