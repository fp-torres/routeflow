import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  buildFullRouteLinks,
  buildLegLinks,
  formatDateBR,
  fullAddressForMaps,
  hasCoordinates,
  holidayOn,
  isoToUtcDate,
  optimizeClosedTour,
  type IsoDate,
  type OptimizationPreviewDto,
  type RouteCreateInput,
  type RouteDetailDto,
  type RouteLegDto,
  type RouteQuery,
  type RouteSummaryDto,
  type RouteUpdateInput,
} from '@routeflow/types';
import { DB } from '../../database/database.module';
import type { Db, Prisma } from '../../database/prisma.types';
import { canSeeAll, resolveEmployeeId, type AuthUser } from '../../common/auth-user';
import { NO_AUTHORIZATION, toStoreRef } from '../../common/mappers';
import { isoDate, isoInstant, money, moneyOrNull } from '../../common/serialize';
import { AuditService } from '../audit/audit.service';
import { AuthorizationsService } from '../authorizations/authorizations.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SettingsService } from '../settings/settings.service';
import { TransportService } from '../transport/transport.module';
import type { LegPoint, LegResult } from '../transport/route-provider';
import { PlannerService } from './planner.service';

const detailInclude = {
  employee: { select: { id: true, name: true } },
  stops: {
    orderBy: { order: 'asc' },
    include: {
      store: true,
      visit: {
        select: {
          id: true,
          status: true,
          startedAt: true,
          finishedAt: true,
          _count: { select: { photos: true } },
        },
      },
    },
  },
} satisfies Prisma.RouteInclude;
type RouteDetailRow = Prisma.RouteGetPayload<{ include: typeof detailInclude }>;

const TERMINAL = ['COMPLETED', 'NOT_COMPLETED', 'RESCHEDULED', 'CANCELLED'] as const;

@Injectable()
export class RoutesService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly planner: PlannerService,
    private readonly letters: AuthorizationsService,
    private readonly settings: SettingsService,
    private readonly transport: TransportService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  private async load(id: string, user: AuthUser): Promise<RouteDetailRow> {
    const route = await this.db.route.findUnique({ where: { id }, include: detailInclude });
    if (!route) throw new NotFoundException('Rota não encontrada.');
    if (route.employeeId !== user.id && !canSeeAll(user))
      throw new ForbiddenException('Esta rota pertence a outro funcionário.');
    return route;
  }

  private summary(
    route: Omit<RouteDetailRow, 'stops'> & { stops: Array<{ visit: { status: string } | null }> },
  ): RouteSummaryDto {
    const date = isoDate(route.date);
    const statuses = route.stops.map((s) => s.visit?.status);
    return {
      id: route.id,
      date,
      status: route.status,
      region: route.region,
      stopCount: route.stops.length,
      completedCount: statuses.filter((s) => s === 'COMPLETED').length,
      pendingCount: statuses.filter((s) => s === 'PENDING' || s === 'IN_PROGRESS').length,
      estimatedDistance: route.estimatedDistance,
      estimatedDuration: route.estimatedDuration,
      estimatedTransportCost: moneyOrNull(route.estimatedTransportCost),
      actualTransportCost: moneyOrNull(route.actualTransportCost),
      employee: route.employee,
      holiday: holidayOn(date) ?? null,
    };
  }

  async list(query: RouteQuery, user: AuthUser): Promise<RouteSummaryDto[]> {
    const employeeId = resolveEmployeeId(user, query.employeeId);
    const routes = await this.db.route.findMany({
      where: {
        employeeId,
        ...(query.from || query.to
          ? {
              date: {
                ...(query.from ? { gte: isoToUtcDate(query.from) } : {}),
                ...(query.to ? { lte: isoToUtcDate(query.to) } : {}),
              },
            }
          : {}),
      },
      include: {
        employee: { select: { id: true, name: true } },
        stops: { select: { visit: { select: { status: true } } } },
      },
      orderBy: { date: 'asc' },
      take: 400,
    });
    return routes.map((r) => this.summary(r));
  }

  private homePoint(route: {
    startAddress: string;
    startLatitude: number | null;
    startLongitude: number | null;
  }): LegPoint {
    return {
      label: 'Casa',
      address: route.startAddress || 'Endereço de casa não cadastrado',
      latitude: route.startLatitude,
      longitude: route.startLongitude,
    };
  }

  private storePoint(store: RouteDetailRow['stops'][number]['store']): LegPoint {
    return {
      label: store.name,
      address: fullAddressForMaps(store),
      latitude: store.latitude,
      longitude: store.longitude,
    };
  }

  async detail(id: string, user: AuthUser): Promise<RouteDetailDto> {
    let route = await this.load(id, user);
    if (
      !route.legsComputedAt &&
      route.stops.length > 0 &&
      this.transport.provider.name === 'estimate'
    ) {
      await this.computeLegs(route);
      route = await this.load(id, user);
    }
    const [auth, settings] = await Promise.all([
      this.letters.summaries(route.stops.map((s) => s.storeId)),
      this.settings.get(),
    ]);
    const home = this.homePoint(route);
    const points = route.stops.map((s) => ({
      label: `${s.order}. ${s.store.name}`,
      address: fullAddressForMaps(s.store),
    }));
    const legLinks = buildLegLinks({ label: 'Casa', address: home.address }, points, 'transit');
    const legs: RouteLegDto[] = route.stops.map((stop, index) => ({
      index,
      fromLabel: index === 0 ? 'Casa' : route.stops[index - 1]!.store.name,
      toLabel: stop.store.name,
      mode: stop.transportMode,
      distanceMeters: stop.travelDistance,
      durationSeconds: stop.travelDuration,
      cost: moneyOrNull(stop.travelCost),
      summary: stop.travelSummary,
      transitUrl: legLinks[index]?.url ?? '',
    }));
    if (route.stops.length > 0) {
      legs.push({
        index: route.stops.length,
        fromLabel: route.stops[route.stops.length - 1]!.store.name,
        toLabel: 'Casa',
        mode: route.returnTransportMode,
        distanceMeters: route.returnDistance,
        durationSeconds: route.returnDuration,
        cost: moneyOrNull(route.returnTravelCost),
        summary: route.returnSummary,
        transitUrl: legLinks[route.stops.length]?.url ?? '',
      });
    }
    const missing = route.stops.filter((s) => !hasCoordinates(s.store)).map((s) => s.store.name);
    const homeHasCoords = route.startLatitude != null && route.startLongitude != null;
    const optimizeHint = !homeHasCoords
      ? 'Cadastre as coordenadas do endereço de casa (Configurações) para otimizar a rota.'
      : missing.length
        ? `${missing.length} loja(s) sem coordenadas. Use "Atualizar coordenadas" em Lojas.`
        : route.stops.length < 3
          ? 'São necessárias ao menos 3 paradas para otimizar.'
          : null;
    return {
      ...this.summary(route),
      startAddress: route.startAddress,
      startLatitude: route.startLatitude,
      startLongitude: route.startLongitude,
      notes: route.notes,
      stops: route.stops.map((stop) => ({
        id: stop.id,
        order: stop.order,
        store: toStoreRef(stop.store),
        visit: stop.visit
          ? {
              id: stop.visit.id,
              status: stop.visit.status,
              startedAt: stop.visit.startedAt ? isoInstant(stop.visit.startedAt) : null,
              finishedAt: stop.visit.finishedAt ? isoInstant(stop.visit.finishedAt) : null,
              photoCount: stop.visit._count.photos,
            }
          : null,
        authorization: auth.get(stop.storeId) ?? NO_AUTHORIZATION,
        travelDistance: stop.travelDistance,
        travelDuration: stop.travelDuration,
        transportMode: stop.transportMode,
        travelCost: moneyOrNull(stop.travelCost),
        travelSummary: stop.travelSummary,
      })),
      legs,
      fullRouteLinks: buildFullRouteLinks(
        { label: 'Casa', address: home.address },
        points,
        settings.fullRouteTravelMode,
      ),
      legLinks,
      legsProvider: route.legsProvider,
      legsComputedAt: route.legsComputedAt ? isoInstant(route.legsComputedAt) : null,
      canOptimize: optimizeHint === null,
      optimizeHint,
      fullRouteTravelMode: settings.fullRouteTravelMode,
    };
  }

  /** Calcula trechos Casa -> lojas -> Casa com o RouteProvider configurado e grava totais. */
  async computeLegs(route: RouteDetailRow): Promise<void> {
    const date = isoDate(route.date);
    const points = [this.homePoint(route), ...route.stops.map((s) => this.storePoint(s.store))];
    const results: LegResult[] = [];
    for (let i = 0; i < route.stops.length; i += 1)
      results.push(await this.transport.computeLeg(points[i]!, points[i + 1]!, date));
    const back = route.stops.length
      ? await this.transport.computeLeg(points[points.length - 1]!, points[0]!, date)
      : null;
    const all = back ? [...results, back] : results;
    const sum = (values: Array<number | null>) =>
      values.some((v) => v == null) || values.length === 0
        ? null
        : values.reduce<number>((a, v) => a + (v ?? 0), 0);
    await this.db.$transaction([
      ...route.stops.map((stop, i) =>
        this.db.routeStop.update({
          where: { id: stop.id },
          data: {
            travelDistance: results[i]!.distanceMeters,
            travelDuration: results[i]!.durationSeconds,
            transportMode: results[i]!.mode,
            travelCost: results[i]!.cost,
            travelSummary: results[i]!.summary?.slice(0, 500) ?? null,
          },
        }),
      ),
      this.db.route.update({
        where: { id: route.id },
        data: {
          returnDistance: back?.distanceMeters ?? null,
          returnDuration: back?.durationSeconds ?? null,
          returnTransportMode: back?.mode ?? null,
          returnTravelCost: back?.cost ?? null,
          returnSummary: back?.summary?.slice(0, 500) ?? null,
          estimatedDistance: sum(all.map((l) => l.distanceMeters)),
          estimatedDuration: sum(all.map((l) => l.durationSeconds)),
          estimatedTransportCost: sum(all.map((l) => l.cost)),
          legsProvider: this.transport.provider.name,
          legsComputedAt: new Date(),
        },
      }),
    ]);
  }

  async recalculate(id: string, user: AuthUser): Promise<RouteDetailDto> {
    await this.computeLegs(await this.load(id, user));
    void this.audit.log({
      userId: user.id,
      entity: 'route',
      entityId: id,
      action: 'route.recalculate',
    });
    return this.detail(id, user);
  }

  private async invalidate(routeId: string): Promise<void> {
    await this.db.route.update({ where: { id: routeId }, data: { legsComputedAt: null } });
  }

  private notifyIfOther(
    route: { employeeId: string; date: Date; id: string },
    user: AuthUser,
    message: string,
  ): void {
    if (route.employeeId === user.id) return;
    void this.notifications.createMany([
      {
        userId: route.employeeId,
        type: 'ROUTE_CHANGED',
        title: `Rota de ${formatDateBR(isoDate(route.date))} alterada`,
        message,
        link: `/rotas/${route.id}`,
      },
    ]);
  }

  async create(input: RouteCreateInput, user: AuthUser): Promise<RouteDetailDto> {
    const existing = await this.db.route.findUnique({
      where: { employeeId_date: { employeeId: user.id, date: isoToUtcDate(input.date) } },
    });
    if (existing) throw new ConflictException('Já existe uma rota para esta data.');
    const route = input.fromTemplate
      ? await this.planner.ensureRoute(user.id, input.date)
      : await this.db.route.create({
          data: {
            employeeId: user.id,
            date: isoToUtcDate(input.date),
            ...(await this.planner
              .home(user.id)
              .then((h) => ({
                startAddress: h.address,
                startLatitude: h.latitude,
                startLongitude: h.longitude,
              }))),
          },
        });
    if (input.storeIds.length) {
      const count = await this.db.routeStop.count({ where: { routeId: route.id } });
      await this.db.$transaction(
        (tx) => this.planner.appendStops(tx, route, input.storeIds, count + 1),
        { timeout: 30_000 },
      );
    }
    void this.audit.log({
      userId: user.id,
      entity: 'route',
      entityId: route.id,
      action: 'route.create',
      metadata: input,
    });
    return this.detail(route.id, user);
  }

  async update(id: string, input: RouteUpdateInput, user: AuthUser): Promise<RouteDetailDto> {
    await this.load(id, user);
    await this.db.route.update({
      where: { id },
      data: {
        ...(input.startAddress !== undefined
          ? {
              startAddress: input.startAddress,
              startLatitude: null,
              startLongitude: null,
              legsComputedAt: null,
            }
          : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.actualTransportCost !== undefined
          ? { actualTransportCost: input.actualTransportCost }
          : {}),
      },
    });
    void this.audit.log({
      userId: user.id,
      entity: 'route',
      entityId: id,
      action: 'route.update',
      metadata: input,
    });
    return this.detail(id, user);
  }

  async addStop(
    id: string,
    storeId: string,
    position: number | undefined,
    user: AuthUser,
  ): Promise<RouteDetailDto> {
    const route = await this.load(id, user);
    const store = await this.db.store.findUnique({ where: { id: storeId } });
    if (!store || !store.active) throw new NotFoundException('Loja não encontrada ou inativa.');
    if (route.stops.some((s) => s.storeId === storeId))
      throw new ConflictException('Esta loja já está na rota do dia.');
    const end = route.stops.length + 1;
    const target = Math.min(Math.max(position ?? end, 1), end);
    await this.db.$transaction(
      async (tx) => {
        for (const stop of route.stops.filter((s) => s.order >= target)) {
          await tx.routeStop.update({ where: { id: stop.id }, data: { order: stop.order + 1 } });
          if (stop.visitId)
            await tx.visit.update({ where: { id: stop.visitId }, data: { order: stop.order + 1 } });
        }
        await this.planner.appendStops(tx, route, [storeId], target);
      },
      { timeout: 30_000 },
    );
    await this.invalidate(id);
    this.notifyIfOther(route, user, `${store.name} foi adicionada à rota.`);
    void this.audit.log({
      userId: user.id,
      entity: 'route',
      entityId: id,
      action: 'route.add_stop',
      metadata: { storeId, position: target },
    });
    return this.detail(id, user);
  }

  async removeStop(id: string, stopId: string, user: AuthUser): Promise<RouteDetailDto> {
    const route = await this.load(id, user);
    const stop = route.stops.find((s) => s.id === stopId);
    if (!stop) throw new NotFoundException('Parada não encontrada nesta rota.');
    if (stop.visit && (stop.visit.status !== 'PENDING' || stop.visit._count.photos > 0)) {
      throw new ConflictException(
        'Esta visita já foi iniciada ou possui evidências. Use "Reagendar" ou "Não realizada".',
      );
    }
    const remaining = route.stops.filter((s) => s.id !== stopId);
    await this.db.$transaction(
      async (tx) => {
        await tx.routeStop.delete({ where: { id: stopId } });
        if (stop.visitId) await tx.visit.delete({ where: { id: stop.visitId } });
        for (const [index, s] of remaining.entries()) {
          if (s.order === index + 1) continue;
          await tx.routeStop.update({ where: { id: s.id }, data: { order: index + 1 } });
          if (s.visitId)
            await tx.visit.update({ where: { id: s.visitId }, data: { order: index + 1 } });
        }
      },
      { timeout: 30_000 },
    );
    await this.invalidate(id);
    this.notifyIfOther(route, user, `${stop.store.name} foi removida da rota.`);
    void this.audit.log({
      userId: user.id,
      entity: 'route',
      entityId: id,
      action: 'route.remove_stop',
      metadata: { storeId: stop.storeId },
    });
    return this.detail(id, user);
  }

  private async applyOrder(route: RouteDetailRow, stopIds: string[]): Promise<void> {
    const current = new Set(route.stops.map((s) => s.id));
    if (stopIds.length !== current.size || !stopIds.every((sid) => current.has(sid))) {
      throw new BadRequestException('A nova ordem precisa conter exatamente as paradas da rota.');
    }
    const byId = new Map(route.stops.map((s) => [s.id, s]));
    await this.db.$transaction(
      stopIds.flatMap((stopId, index) => {
        const stop = byId.get(stopId)!;
        return [
          this.db.routeStop.update({ where: { id: stopId }, data: { order: index + 1 } }),
          ...(stop.visitId
            ? [this.db.visit.update({ where: { id: stop.visitId }, data: { order: index + 1 } })]
            : []),
        ];
      }),
    );
    await this.invalidate(route.id);
  }

  async reorder(id: string, stopIds: string[], user: AuthUser): Promise<RouteDetailDto> {
    const route = await this.load(id, user);
    await this.applyOrder(route, stopIds);
    this.notifyIfOther(route, user, 'A ordem das visitas foi alterada.');
    void this.audit.log({
      userId: user.id,
      entity: 'route',
      entityId: id,
      action: 'route.reorder',
      metadata: { stopIds },
    });
    return this.detail(id, user);
  }

  /** Otimização OPCIONAL: retorna a proposta; só altera a ordem com apply=true. */
  async optimize(id: string, apply: boolean, user: AuthUser): Promise<OptimizationPreviewDto> {
    const route = await this.load(id, user);
    const currentOrder = route.stops.map((s) => s.id);
    const missing = route.stops.filter((s) => !hasCoordinates(s.store)).map((s) => s.store.name);
    const home = { latitude: route.startLatitude, longitude: route.startLongitude };
    const base = {
      currentOrder,
      proposedOrder: currentOrder,
      currentDistanceKm: null,
      proposedDistanceKm: null,
      improvementKm: null,
      missingCoordinates: missing,
    };
    if (!hasCoordinates(home))
      return {
        ...base,
        applied: false,
        canOptimize: false,
        reason: 'Endereço de casa sem coordenadas.',
      };
    if (missing.length)
      return { ...base, applied: false, canOptimize: false, reason: 'Há lojas sem coordenadas.' };
    if (route.stops.length < 3)
      return {
        ...base,
        applied: false,
        canOptimize: false,
        reason: 'São necessárias ao menos 3 paradas.',
      };
    const result = optimizeClosedTour(
      home,
      route.stops.map((s) => ({
        id: s.id,
        latitude: s.store.latitude!,
        longitude: s.store.longitude!,
      })),
    );
    const shouldApply = apply && result.improvementKm > 0.01;
    if (shouldApply) {
      await this.applyOrder(route, result.order);
      void this.audit.log({
        userId: user.id,
        entity: 'route',
        entityId: id,
        action: 'route.optimize',
        metadata: { improvementKm: result.improvementKm },
      });
    }
    return {
      applied: shouldApply,
      canOptimize: true,
      reason: null,
      currentOrder,
      proposedOrder: result.order,
      currentDistanceKm: Math.round(result.originalDistanceKm * 100) / 100,
      proposedDistanceKm: Math.round(result.distanceKm * 100) / 100,
      improvementKm: Math.round(result.improvementKm * 100) / 100,
      missingCoordinates: [],
    };
  }

  async generate(from: IsoDate, to: IsoDate, overwrite: boolean, user: AuthUser) {
    const result = await this.planner.generate(user.id, from, to, overwrite);
    void this.audit.log({
      userId: user.id,
      entity: 'route',
      action: 'route.generate',
      metadata: { from, to, overwrite, created: result.created.length },
    });
    return result;
  }

  /** Inclui uma loja na rota de uma data (criando a rota do dia se necessário). */
  async addStoreToDate(
    employeeId: string,
    date: IsoDate,
    storeId: string,
    extra: { rescheduledFromId?: string; notes?: string | null } = {},
  ) {
    const store = await this.db.store.findUnique({ where: { id: storeId } });
    if (!store) throw new NotFoundException('Loja não encontrada.');
    const route = await this.planner.ensureRoute(employeeId, date);
    const already = await this.db.visit.findFirst({
      where: { routeId: route.id, storeId, status: { notIn: [...TERMINAL] } },
      select: { id: true },
    });
    if (already)
      throw new ConflictException(`${store.name} já está programada para ${formatDateBR(date)}.`);
    const count = await this.db.routeStop.count({ where: { routeId: route.id } });
    const [visit] = await this.db.$transaction(
      (tx) => this.planner.appendStops(tx, route, [storeId], count + 1, extra),
      { timeout: 30_000 },
    );
    await this.invalidate(route.id);
    return visit!;
  }

  /** Atualiza status da rota conforme as visitas (iniciada/concluída). */
  async syncStatus(routeId: string): Promise<void> {
    const visits = await this.db.visit.findMany({ where: { routeId }, select: { status: true } });
    if (visits.length === 0) return;
    const open = visits.some(
      (v) => v.status === 'PENDING' || v.status === 'IN_PROGRESS' || v.status === 'BLOCKED',
    );
    const started = visits.some((v) => v.status !== 'PENDING');
    await this.db.route.update({
      where: { id: routeId },
      data: { status: !open ? 'COMPLETED' : started ? 'IN_PROGRESS' : 'PLANNED' },
    });
  }

  routeTotals(
    routes: Array<{ estimatedDistance: number | null; estimatedTransportCost: unknown }>,
  ) {
    return {
      distance: routes.reduce((acc, r) => acc + (r.estimatedDistance ?? 0), 0),
      cost: routes.reduce((acc, r) => acc + money(r.estimatedTransportCost), 0),
    };
  }
}
