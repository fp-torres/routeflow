import { ConflictException, Inject, Injectable } from '@nestjs/common';
import {
  addDaysIso,
  diffDaysIso,
  isoToUtcDate,
  isoWeekday,
  startOfWeekIso,
  todayIso,
  weekOfMonth,
  type IsoDate,
  type RouteTemplateKind,
} from '@routeflow/types';
import { APP_CONFIG, type AppConfig } from '../../config/env';
import { DB } from '../../database/database.module';
import type { Db, Prisma, Tx } from '../../database/prisma.types';
import { isoDate, isoDateOrNull } from '../../common/serialize';
import { HomeAddressService } from '../settings/home-address.service';
import { SettingsService } from '../settings/settings.service';

const templateInclude = {
  stops: {
    include: {
      store: {
        select: {
          id: true,
          code: true,
          name: true,
          neighborhood: true,
          region: true,
          active: true,
        },
      },
    },
  },
} satisfies Prisma.RouteTemplateInclude;
export type TemplateWithStops = Prisma.RouteTemplateGetPayload<{ include: typeof templateInclude }>;

export interface TemplateSlot {
  templateId: string;
  stops: TemplateWithStops['stops'];
}

/**
 * Planejamento: resolve qual roteiro vale para cada data e materializa rotas.
 * Precedência: alteração na data (rota já existente) > roteiro mensal > roteiro
 * semanal (ciclo de N semanas) > roteiro padrão (por dia da semana).
 */
@Injectable()
export class PlannerService {
  private lastEnsure = new Map<string, number>();

  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly settings: SettingsService,
    private readonly homeAddress: HomeAddressService,
  ) {}

  today(): IsoDate {
    return todayIso(this.config.timeZone);
  }

  loadTemplates(employeeId: string): Promise<TemplateWithStops[]> {
    return this.db.routeTemplate.findMany({
      where: { employeeId, active: true },
      include: templateInclude,
    });
  }

  private cycleIndex(template: TemplateWithStops, date: IsoDate): number {
    const anchor =
      isoDateOrNull(template.anchorDate) ??
      isoDateOrNull(template.validFrom) ??
      isoDate(template.createdAt);
    const weeks = Math.floor(diffDaysIso(startOfWeekIso(anchor), startOfWeekIso(date)) / 7);
    const cycle = Math.max(1, template.cycleWeeks);
    return (((weeks % cycle) + cycle) % cycle) + 1;
  }

  slotFor(templates: TemplateWithStops[], date: IsoDate): TemplateSlot | null {
    const weekday = isoWeekday(date);
    const order: RouteTemplateKind[] = ['MONTHLY', 'WEEKLY', 'STANDARD'];
    for (const kind of order) {
      const candidates = templates.filter((t) => {
        const from = isoDateOrNull(t.validFrom);
        const until = isoDateOrNull(t.validUntil);
        return t.kind === kind && t.active && (!from || from <= date) && (!until || until >= date);
      });
      for (const template of candidates) {
        const weekIndex =
          kind === 'MONTHLY'
            ? weekOfMonth(date)
            : kind === 'WEEKLY'
              ? this.cycleIndex(template, date)
              : 0;
        const stops = template.stops
          .filter((s) => s.weekday === weekday && s.weekIndex === weekIndex && s.store.active)
          .sort((a, b) => a.order - b.order);
        if (stops.length) return { templateId: template.id, stops };
      }
    }
    return null;
  }

  async home(
    employeeId: string,
  ): Promise<{ address: string; latitude: number | null; longitude: number | null }> {
    const home = await this.homeAddress.getActive(employeeId);
    return home
      ? { address: home.address, latitude: home.latitude, longitude: home.longitude }
      : { address: '', latitude: null, longitude: null };
  }

  /** Cria visita + parada para cada loja, a partir da posição informada. */
  async appendStops(
    tx: Tx,
    route: { id: string; employeeId: string; date: Date },
    storeIds: string[],
    startOrder: number,
    extra: { rescheduledFromId?: string; notes?: string | null } = {},
  ) {
    const visits = [];
    for (const [index, storeId] of storeIds.entries()) {
      const visit = await tx.visit.create({
        data: {
          routeId: route.id,
          storeId,
          employeeId: route.employeeId,
          scheduledDate: route.date,
          order: startOrder + index,
          ...(extra.rescheduledFromId ? { rescheduledFromId: extra.rescheduledFromId } : {}),
          ...(extra.notes ? { notes: extra.notes } : {}),
        },
      });
      await tx.routeStop.create({
        data: { routeId: route.id, storeId, visitId: visit.id, order: startOrder + index },
      });
      visits.push(visit);
    }
    return visits;
  }

  private dominantRegion(regions: Array<string | null>): string | null {
    const counts = new Map<string, number>();
    for (const r of regions) if (r) counts.set(r, (counts.get(r) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  }

  /** Garante que exista a rota do dia; para hoje/futuro, nasce com as lojas do roteiro. */
  async ensureRoute(employeeId: string, date: IsoDate, templates?: TemplateWithStops[]) {
    const existing = await this.db.route.findUnique({
      where: { employeeId_date: { employeeId, date: isoToUtcDate(date) } },
    });
    if (existing) return existing;
    const slot =
      date >= this.today()
        ? this.slotFor(templates ?? (await this.loadTemplates(employeeId)), date)
        : null;
    const home = await this.home(employeeId);
    try {
      return await this.db.$transaction(
        async (tx) => {
          const route = await tx.route.create({
            data: {
              employeeId,
              date: isoToUtcDate(date),
              startAddress: home.address,
              startLatitude: home.latitude,
              startLongitude: home.longitude,
              templateId: slot?.templateId ?? null,
              region: slot ? this.dominantRegion(slot.stops.map((s) => s.store.region)) : null,
            },
          });
          if (slot)
            await this.appendStops(
              tx,
              route,
              slot.stops.map((s) => s.storeId),
              1,
            );
          return route;
        },
        { timeout: 30_000 },
      );
    } catch (error) {
      // Corrida: outra requisição criou a rota no mesmo instante
      const again = await this.db.route.findUnique({
        where: { employeeId_date: { employeeId, date: isoToUtcDate(date) } },
      });
      if (again) return again;
      throw error;
    }
  }

  /** Gera rotas a partir dos roteiros no período (idempotente: não duplica dias existentes). */
  async generate(
    employeeId: string,
    from: IsoDate,
    to: IsoDate,
    overwrite = false,
  ): Promise<{ created: IsoDate[]; replaced: IsoDate[]; skipped: IsoDate[] }> {
    if (diffDaysIso(from, to) > 92) throw new ConflictException('Gere no máximo 3 meses por vez.');
    const templates = await this.loadTemplates(employeeId);
    const existing = await this.db.route.findMany({
      where: { employeeId, date: { gte: isoToUtcDate(from), lte: isoToUtcDate(to) } },
      include: { visits: { select: { status: true, _count: { select: { photos: true } } } } },
    });
    const byDate = new Map(existing.map((r) => [isoDate(r.date), r]));
    const result = {
      created: [] as IsoDate[],
      replaced: [] as IsoDate[],
      skipped: [] as IsoDate[],
    };
    for (let date = from; date <= to; date = addDaysIso(date, 1)) {
      const slot = this.slotFor(templates, date);
      const route = byDate.get(date);
      if (!slot) {
        result.skipped.push(date);
        continue;
      }
      if (!route) {
        await this.ensureRoute(employeeId, date, templates);
        result.created.push(date);
        continue;
      }
      const untouched = route.visits.every((v) => v.status === 'PENDING' && v._count.photos === 0);
      if (overwrite && untouched && date >= this.today()) {
        await this.db.$transaction(
          async (tx) => {
            await tx.routeStop.deleteMany({ where: { routeId: route.id } });
            await tx.visit.deleteMany({ where: { routeId: route.id } });
            await tx.route.update({
              where: { id: route.id },
              data: { templateId: slot.templateId, legsComputedAt: null },
            });
            await this.appendStops(
              tx,
              route,
              slot.stops.map((s) => s.storeId),
              1,
            );
          },
          { timeout: 30_000 },
        );
        result.replaced.push(date);
      } else result.skipped.push(date);
    }
    return result;
  }

  /** Mantém a agenda dos próximos dias preenchida conforme o roteiro (configurável). */
  async ensureUpcoming(employeeId: string): Promise<void> {
    const last = this.lastEnsure.get(employeeId) ?? 0;
    if (Date.now() - last < 5 * 60_000) return;
    this.lastEnsure.set(employeeId, Date.now());
    const settings = await this.settings.get();
    if (!settings.autoGenerateRoutes || settings.routeGenerationHorizonDays <= 0) return;
    const today = this.today();
    await this.generate(employeeId, today, addDaysIso(today, settings.routeGenerationHorizonDays));
  }

  resetCache(): void {
    this.lastEnsure.clear();
  }
}
