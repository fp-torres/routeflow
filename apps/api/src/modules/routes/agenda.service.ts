import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  diffDaysIso,
  eachDayIso,
  holidayOn,
  isoToUtcDate,
  isoWeekday,
  type AgendaDayDto,
  type AgendaResponse,
  type IsoDate,
} from '@routeflow/types';
import { DB } from '../../database/database.module';
import type { Db } from '../../database/prisma.types';
import { isoDate } from '../../common/serialize';
import { PlannerService } from './planner.service';

@Injectable()
export class AgendaService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly planner: PlannerService,
  ) {}

  async get(employeeId: string, from: IsoDate, to: IsoDate): Promise<AgendaResponse> {
    if (from > to) throw new BadRequestException('Período inválido.');
    if (diffDaysIso(from, to) > 92)
      throw new BadRequestException('Consulte no máximo 3 meses por vez.');
    const today = this.planner.today();
    if (to >= today) await this.planner.ensureUpcoming(employeeId);
    const [visits, routes, templates] = await Promise.all([
      this.db.visit.findMany({
        where: { employeeId, scheduledDate: { gte: isoToUtcDate(from), lte: isoToUtcDate(to) } },
        include: {
          store: {
            select: {
              id: true,
              code: true,
              name: true,
              network: true,
              neighborhood: true,
              region: true,
            },
          },
        },
        orderBy: [{ scheduledDate: 'asc' }, { order: 'asc' }],
      }),
      this.db.route.findMany({
        where: { employeeId, date: { gte: isoToUtcDate(from), lte: isoToUtcDate(to) } },
        select: { id: true, date: true, region: true },
      }),
      this.planner.loadTemplates(employeeId),
    ]);
    const routeByDate = new Map(routes.map((r) => [isoDate(r.date), r]));
    const days: AgendaDayDto[] = eachDayIso(from, to).map((date) => {
      const dayVisits = visits.filter((v) => isoDate(v.scheduledDate) === date);
      const route = routeByDate.get(date);
      const slot = !route && date >= today ? this.planner.slotFor(templates, date) : null;
      const counted = dayVisits.filter(
        (v) => v.status !== 'RESCHEDULED' && v.status !== 'CANCELLED',
      );
      const completed = counted.filter((v) => v.status === 'COMPLETED').length;
      const regions = [
        ...new Set(
          [
            route?.region,
            ...dayVisits.map((v) => v.store.region),
            ...(slot?.stops.map((s) => s.store.region) ?? []),
          ].filter((r): r is string => !!r),
        ),
      ];
      return {
        date,
        weekday: isoWeekday(date),
        holiday: holidayOn(date) ?? null,
        routeId: route?.id ?? null,
        regions,
        visits: dayVisits.map((v) => ({
          id: v.id,
          status: v.status,
          order: v.order,
          store: v.store,
        })),
        planned: slot
          ? slot.stops.map((s) => ({
              storeId: s.storeId,
              code: s.store.code,
              name: s.store.name,
              neighborhood: s.store.neighborhood,
              region: s.store.region,
            }))
          : [],
        total: counted.length,
        completed,
        progress: counted.length ? completed / counted.length : 0,
      };
    });
    return { from, to, today, days };
  }
}
