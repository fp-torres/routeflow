import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  addDaysIso,
  endOfMonthIso,
  endOfWeekIso,
  expenseCreateSchema,
  isoToUtcDate,
  startOfMonthIso,
  startOfWeekIso,
  todayIso,
  TRANSPORT_TYPES,
  type ExpenseCreateInput,
  type ExpenseDto,
  type ExpenseQuery,
  type ExpenseSummaryDto,
  type ExpenseUpdateInput,
  type IsoDate,
  type Paginated,
} from '@routeflow/types';
import { APP_CONFIG, type AppConfig } from '../../config/env';
import { DB } from '../../database/database.module';
import type { Db, Prisma } from '../../database/prisma.types';
import { canSeeAll, employeeFilter, type AuthUser } from '../../common/auth-user';
import { isoDate, isoInstant, money, moneyOrNull, paginate } from '../../common/serialize';
import { AuditService } from '../audit/audit.service';

const include = {
  employee: { select: { id: true, name: true } },
  visit: { select: { store: { select: { name: true } } } },
} satisfies Prisma.TransportExpenseInclude;
type Row = Prisma.TransportExpenseGetPayload<{ include: typeof include }>;

export function toExpenseDto(row: Row): ExpenseDto {
  return {
    id: row.id,
    date: isoDate(row.date),
    type: row.type,
    description: row.description,
    value: money(row.value),
    estimatedValue: moneyOrNull(row.estimatedValue),
    actualValue: moneyOrNull(row.actualValue),
    routeId: row.routeId,
    visitId: row.visitId,
    visitStoreName: row.visit?.store.name ?? null,
    employee: row.employee,
    createdAt: isoInstant(row.createdAt),
  };
}

@Injectable()
export class ExpensesService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly audit: AuditService,
  ) {}

  private where(
    employeeId: string | undefined,
    from?: IsoDate,
    to?: IsoDate,
  ): Prisma.TransportExpenseWhereInput {
    return {
      ...(employeeId ? { employeeId } : {}),
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: isoToUtcDate(from) } : {}),
              ...(to ? { lte: isoToUtcDate(to) } : {}),
            },
          }
        : {}),
    };
  }

  async list(
    query: ExpenseQuery,
    user: AuthUser | null,
  ): Promise<Paginated<ExpenseDto> & { totalValue: number }> {
    const where: Prisma.TransportExpenseWhereInput = {
      ...this.where(
        user ? employeeFilter(user, query.employeeId) : query.employeeId,
        query.from,
        query.to,
      ),
      ...(query.type?.length ? { type: { in: query.type } } : {}),
      ...(query.routeId ? { routeId: query.routeId } : {}),
    };
    const [total, rows, sum] = await Promise.all([
      this.db.transportExpense.count({ where }),
      this.db.transportExpense.findMany({
        where,
        include,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.db.transportExpense.aggregate({ where, _sum: { value: true } }),
    ]);
    return {
      ...paginate(rows.map(toExpenseDto), total, query.page, query.pageSize),
      totalValue: money(sum._sum.value),
    };
  }

  private async assertLinks(
    employeeId: string,
    routeId?: string | null,
    visitId?: string | null,
  ): Promise<string | null> {
    let resolvedRoute = routeId ?? null;
    if (visitId) {
      const visit = await this.db.visit.findUnique({
        where: { id: visitId },
        select: { employeeId: true, routeId: true },
      });
      if (!visit || visit.employeeId !== employeeId)
        throw new BadRequestException('Visita inválida para esta despesa.');
      resolvedRoute = resolvedRoute ?? visit.routeId;
    }
    if (resolvedRoute) {
      const route = await this.db.route.findUnique({
        where: { id: resolvedRoute },
        select: { employeeId: true },
      });
      if (!route || route.employeeId !== employeeId)
        throw new BadRequestException('Rota inválida para esta despesa.');
    }
    return resolvedRoute;
  }

  async create(input: ExpenseCreateInput, user: AuthUser): Promise<ExpenseDto> {
    const data = expenseCreateSchema.parse(input);
    const routeId = await this.assertLinks(user.id, data.routeId, data.visitId);
    const value = data.actualValue ?? data.estimatedValue ?? 0;
    const row = await this.db.transportExpense.create({
      data: {
        employeeId: user.id,
        routeId,
        visitId: data.visitId ?? null,
        date: isoToUtcDate(data.date),
        type: data.type,
        description: data.description ?? null,
        value,
        estimatedValue: data.estimatedValue ?? null,
        actualValue: data.actualValue ?? null,
      },
      include,
    });
    if (routeId) await this.syncRouteActualCost(routeId);
    void this.audit.log({
      userId: user.id,
      entity: 'expense',
      entityId: row.id,
      action: 'expense.create',
      metadata: data,
    });
    return toExpenseDto(row);
  }

  private async load(id: string, user: AuthUser) {
    const row = await this.db.transportExpense.findUnique({ where: { id } });
    if (!row || (row.employeeId !== user.id && !canSeeAll(user)))
      throw new NotFoundException('Despesa não encontrada.');
    return row;
  }

  async update(id: string, input: ExpenseUpdateInput, user: AuthUser): Promise<ExpenseDto> {
    const current = await this.load(id, user);
    const estimatedValue =
      input.estimatedValue !== undefined
        ? input.estimatedValue
        : moneyOrNull(current.estimatedValue);
    const actualValue =
      input.actualValue !== undefined ? input.actualValue : moneyOrNull(current.actualValue);
    if (estimatedValue == null && actualValue == null)
      throw new BadRequestException('Informe o valor pago ou o estimado.');
    const row = await this.db.transportExpense.update({
      where: { id },
      data: {
        ...(input.date ? { date: isoToUtcDate(input.date) } : {}),
        ...(input.type ? { type: input.type } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        estimatedValue,
        actualValue,
        value: actualValue ?? estimatedValue ?? 0,
      },
      include,
    });
    if (row.routeId) await this.syncRouteActualCost(row.routeId);
    void this.audit.log({
      userId: user.id,
      entity: 'expense',
      entityId: id,
      action: 'expense.update',
      metadata: input,
    });
    return toExpenseDto(row);
  }

  async remove(id: string, user: AuthUser): Promise<void> {
    const row = await this.load(id, user);
    await this.db.transportExpense.delete({ where: { id } });
    if (row.routeId) await this.syncRouteActualCost(row.routeId);
    void this.audit.log({
      userId: user.id,
      entity: 'expense',
      entityId: id,
      action: 'expense.delete',
    });
  }

  /** Custo real da rota = soma das despesas registradas para ela. */
  private async syncRouteActualCost(routeId: string): Promise<void> {
    const sum = await this.db.transportExpense.aggregate({
      where: { routeId },
      _sum: { value: true },
    });
    await this.db.route.update({
      where: { id: routeId },
      data: { actualTransportCost: sum._sum.value ?? null },
    });
  }

  async sumBetween(employeeId: string | undefined, from: IsoDate, to: IsoDate): Promise<number> {
    const sum = await this.db.transportExpense.aggregate({
      where: this.where(employeeId, from, to),
      _sum: { value: true },
    });
    return money(sum._sum.value);
  }

  async summary(
    user: AuthUser,
    reference?: IsoDate,
    requestedEmployee?: string,
  ): Promise<ExpenseSummaryDto> {
    const employeeId = employeeFilter(user, requestedEmployee);
    const date = reference ?? todayIso(this.config.timeZone);
    const monthFrom = startOfMonthIso(date);
    const monthTo = endOfMonthIso(date);
    const [day, week, month, completed, byType, last30] = await Promise.all([
      this.sumBetween(employeeId, date, date),
      this.sumBetween(employeeId, startOfWeekIso(date), endOfWeekIso(date)),
      this.sumBetween(employeeId, monthFrom, monthTo),
      this.db.visit.count({
        where: {
          ...(employeeId ? { employeeId } : {}),
          status: 'COMPLETED',
          scheduledDate: { gte: isoToUtcDate(monthFrom), lte: isoToUtcDate(monthTo) },
        },
      }),
      this.db.transportExpense.groupBy({
        by: ['type'],
        where: this.where(employeeId, monthFrom, monthTo),
        _sum: { value: true },
      }),
      this.db.transportExpense.findMany({
        where: this.where(employeeId, addDaysIso(date, -29), date),
        select: { date: true, value: true },
      }),
    ]);
    const byDay = new Map<string, number>();
    for (let i = 29; i >= 0; i -= 1) byDay.set(addDaysIso(date, -i), 0);
    for (const row of last30)
      byDay.set(
        isoDate(row.date),
        Math.round(((byDay.get(isoDate(row.date)) ?? 0) + money(row.value)) * 100) / 100,
      );
    return {
      referenceDate: date,
      day,
      week,
      month,
      monthCompletedVisits: completed,
      averagePerVisit: completed ? Math.round((month / completed) * 100) / 100 : null,
      byType: TRANSPORT_TYPES.map((type) => ({
        type,
        total: money(byType.find((b) => b.type === type)?._sum.value),
      })).filter((t) => t.total > 0),
      byDay: [...byDay.entries()].map(([d, total]) => ({ date: d, total })),
    };
  }
}
