"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoutesService = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("@routeflow/types");
const database_module_1 = require("../../database/database.module");
const auth_user_1 = require("../../common/auth-user");
const mappers_1 = require("../../common/mappers");
const serialize_1 = require("../../common/serialize");
const audit_service_1 = require("../audit/audit.service");
const authorizations_service_1 = require("../authorizations/authorizations.service");
const notifications_service_1 = require("../notifications/notifications.service");
const settings_service_1 = require("../settings/settings.service");
const transport_module_1 = require("../transport/transport.module");
const planner_service_1 = require("./planner.service");
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
};
/** Itinerário gravado por trecho: { source, steps } em JSON. */
function legMeta(raw) {
    const value = (0, serialize_1.safeJsonParse)(raw, null);
    return {
        steps: Array.isArray(value?.steps) ? value.steps : null,
        source: value?.source === 'google' || value?.source === 'estimate' ? value.source : null,
    };
}
/** Google Maps em transporte público a partir da localização atual do celular. */
const transitFromHere = (address) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}&travelmode=transit`;
const MATRIX_TTL_MS = 10 * 60_000;
const matrixCache = new Map();
const TERMINAL = ['COMPLETED', 'NOT_COMPLETED', 'RESCHEDULED', 'CANCELLED'];
let RoutesService = class RoutesService {
    constructor(db, planner, letters, settings, transport, notifications, audit) {
        this.db = db;
        this.planner = planner;
        this.letters = letters;
        this.settings = settings;
        this.transport = transport;
        this.notifications = notifications;
        this.audit = audit;
    }
    async load(id, user) {
        const route = await this.db.route.findUnique({ where: { id }, include: detailInclude });
        if (!route)
            throw new common_1.NotFoundException('Rota não encontrada.');
        if (route.employeeId !== user.id && !(0, auth_user_1.canSeeAll)(user))
            throw new common_1.ForbiddenException('Esta rota pertence a outro funcionário.');
        return route;
    }
    summary(route) {
        const date = (0, serialize_1.isoDate)(route.date);
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
            estimatedTransportCost: (0, serialize_1.moneyOrNull)(route.estimatedTransportCost),
            actualTransportCost: (0, serialize_1.moneyOrNull)(route.actualTransportCost),
            employee: route.employee,
            holiday: (0, types_1.holidayOn)(date) ?? null,
        };
    }
    async list(query, user) {
        const employeeId = (0, auth_user_1.resolveEmployeeId)(user, query.employeeId);
        const routes = await this.db.route.findMany({
            where: {
                employeeId,
                ...(query.from || query.to
                    ? {
                        date: {
                            ...(query.from ? { gte: (0, types_1.isoToUtcDate)(query.from) } : {}),
                            ...(query.to ? { lte: (0, types_1.isoToUtcDate)(query.to) } : {}),
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
    homePoint(route) {
        return {
            label: 'Casa',
            address: route.startAddress || 'Endereço de casa não cadastrado',
            latitude: route.startLatitude,
            longitude: route.startLongitude,
        };
    }
    storePoint(store) {
        return {
            label: store.name,
            address: (0, types_1.fullAddressForMaps)(store),
            latitude: store.latitude,
            longitude: store.longitude,
        };
    }
    async detail(id, user) {
        let route = await this.load(id, user);
        if (!route.legsComputedAt && route.stops.length > 0) {
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
            address: (0, types_1.fullAddressForMaps)(s.store),
        }));
        const legLinks = (0, types_1.buildLegLinks)({ label: 'Casa', address: home.address }, points, 'transit');
        const legs = route.stops.map((stop, index) => ({
            index,
            fromLabel: index === 0 ? 'Casa' : route.stops[index - 1].store.name,
            toLabel: stop.store.name,
            mode: stop.transportMode,
            distanceMeters: stop.travelDistance,
            durationSeconds: stop.travelDuration,
            cost: (0, serialize_1.moneyOrNull)(stop.travelCost),
            summary: stop.travelSummary,
            ...legMeta(stop.travelSteps),
            transitUrl: legLinks[index]?.url ?? '',
        }));
        if (route.stops.length > 0) {
            legs.push({
                index: route.stops.length,
                fromLabel: route.stops[route.stops.length - 1].store.name,
                toLabel: 'Casa',
                mode: route.returnTransportMode,
                distanceMeters: route.returnDistance,
                durationSeconds: route.returnDuration,
                cost: (0, serialize_1.moneyOrNull)(route.returnTravelCost),
                summary: route.returnSummary,
                ...legMeta(route.returnSteps),
                transitUrl: legLinks[route.stops.length]?.url ?? '',
            });
        }
        const missing = route.stops.filter((s) => !(0, types_1.hasCoordinates)(s.store)).map((s) => s.store.name);
        const homeHasCoords = route.startLatitude != null && route.startLongitude != null;
        const optimizeHint = !homeHasCoords
            ? 'O endereço de casa ainda está sem localização (ela é obtida automaticamente). Confira o endereço em Configurações › Casa.'
            : missing.length
                ? `${missing.length} loja(s) ainda sem localização — ela é obtida automaticamente; se persistir, confira o endereço.`
                : route.stops.length < 2
                    ? 'São necessárias ao menos 2 paradas para reorganizar.'
                    : null;
        const next = route.stops.find((st) => st.visit && (st.visit.status === 'PENDING' || st.visit.status === 'IN_PROGRESS'));
        return {
            ...this.summary(route),
            startAddress: route.startAddress,
            startLatitude: route.startLatitude,
            startLongitude: route.startLongitude,
            notes: route.notes,
            stops: route.stops.map((stop) => ({
                id: stop.id,
                order: stop.order,
                store: (0, mappers_1.toStoreRef)(stop.store),
                visit: stop.visit
                    ? {
                        id: stop.visit.id,
                        status: stop.visit.status,
                        startedAt: stop.visit.startedAt ? (0, serialize_1.isoInstant)(stop.visit.startedAt) : null,
                        finishedAt: stop.visit.finishedAt ? (0, serialize_1.isoInstant)(stop.visit.finishedAt) : null,
                        photoCount: stop.visit._count.photos,
                    }
                    : null,
                authorization: auth.get(stop.storeId) ?? mappers_1.NO_AUTHORIZATION,
                travelDistance: stop.travelDistance,
                travelDuration: stop.travelDuration,
                transportMode: stop.transportMode,
                travelCost: (0, serialize_1.moneyOrNull)(stop.travelCost),
                travelSummary: stop.travelSummary,
            })),
            legs,
            fullRouteLinks: (0, types_1.buildFullRouteLinks)({ label: 'Casa', address: home.address }, points, settings.fullRouteTravelMode),
            legLinks,
            legsProvider: route.legsProvider,
            legsComputedAt: route.legsComputedAt ? (0, serialize_1.isoInstant)(route.legsComputedAt) : null,
            canOptimize: optimizeHint === null,
            optimizeHint,
            fullRouteTravelMode: settings.fullRouteTravelMode,
            optimizedAt: route.optimizedAt ? (0, serialize_1.isoInstant)(route.optimizedAt) : null,
            nextStop: next && next.visit
                ? {
                    stopId: next.id,
                    visitId: next.visit.id,
                    storeName: next.store.name,
                    transitUrl: transitFromHere((0, types_1.fullAddressForMaps)(next.store)),
                }
                : null,
        };
    }
    /** Calcula os trechos Casa → lojas → Casa (transporte público) e grava itinerários e totais. */
    async computeLegs(route) {
        const date = (0, serialize_1.isoDate)(route.date);
        const points = [this.homePoint(route), ...route.stops.map((s) => this.storePoint(s.store))];
        const pairs = route.stops.map((_, i) => [
            points[i],
            points[i + 1],
        ]);
        if (route.stops.length)
            pairs.push([points[points.length - 1], points[0]]);
        const results = [];
        // até 4 consultas simultâneas ao provedor de rotas
        for (let i = 0; i < pairs.length; i += 4) {
            results.push(...(await Promise.all(pairs.slice(i, i + 4).map(([a, b]) => this.transport.computeLeg(a, b, date)))));
        }
        const legs = results.slice(0, route.stops.length);
        const back = route.stops.length ? results[results.length - 1] : null;
        const sum = (values) => values.some((v) => v == null) || values.length === 0
            ? null
            : values.reduce((a, v) => a + (v ?? 0), 0);
        const stepsJson = (r) => r && r.steps && r.source !== 'unavailable'
            ? JSON.stringify({ source: r.source, steps: r.steps })
            : null;
        await this.db.$transaction([
            ...route.stops.map((stop, i) => this.db.routeStop.update({
                where: { id: stop.id },
                data: {
                    travelDistance: legs[i].distanceMeters,
                    travelDuration: legs[i].durationSeconds,
                    transportMode: legs[i].mode,
                    travelCost: legs[i].cost,
                    travelSummary: legs[i].summary?.slice(0, 500) ?? null,
                    travelSteps: stepsJson(legs[i]),
                },
            })),
            this.db.route.update({
                where: { id: route.id },
                data: {
                    returnDistance: back?.distanceMeters ?? null,
                    returnDuration: back?.durationSeconds ?? null,
                    returnTransportMode: back?.mode ?? null,
                    returnTravelCost: back?.cost ?? null,
                    returnSummary: back?.summary?.slice(0, 500) ?? null,
                    returnSteps: stepsJson(back),
                    estimatedDistance: sum(results.map((l) => l.distanceMeters)),
                    estimatedDuration: sum(results.map((l) => l.durationSeconds)),
                    estimatedTransportCost: sum(results.map((l) => l.cost)),
                    legsProvider: this.transport.provider.name,
                    legsComputedAt: new Date(),
                },
            }),
        ]);
    }
    async recalculate(id, user) {
        await this.computeLegs(await this.load(id, user));
        void this.audit.log({
            userId: user.id,
            entity: 'route',
            entityId: id,
            action: 'route.recalculate',
        });
        return this.detail(id, user);
    }
    async invalidate(routeId) {
        await this.db.route.update({ where: { id: routeId }, data: { legsComputedAt: null } });
    }
    notifyIfOther(route, user, message) {
        if (route.employeeId === user.id)
            return;
        void this.notifications.createMany([
            {
                userId: route.employeeId,
                type: 'ROUTE_CHANGED',
                title: `Rota de ${(0, types_1.formatDateBR)((0, serialize_1.isoDate)(route.date))} alterada`,
                message,
                link: `/rotas/${route.id}`,
            },
        ]);
    }
    async create(input, user) {
        // ADMIN/MANAGER podem criar a rota de outro funcionário ("visualizando como")
        const employeeId = (0, auth_user_1.resolveEmployeeId)(user, input.employeeId);
        const existing = await this.db.route.findUnique({
            where: { employeeId_date: { employeeId, date: (0, types_1.isoToUtcDate)(input.date) } },
        });
        if (existing)
            throw new common_1.ConflictException('Já existe uma rota para esta data.');
        const route = input.fromTemplate
            ? await this.planner.ensureRoute(employeeId, input.date)
            : await this.db.route.create({
                data: {
                    employeeId,
                    date: (0, types_1.isoToUtcDate)(input.date),
                    ...(await this.planner.home(employeeId).then((h) => ({
                        startAddress: h.address,
                        startLatitude: h.latitude,
                        startLongitude: h.longitude,
                    }))),
                },
            });
        if (input.storeIds.length) {
            const count = await this.db.routeStop.count({ where: { routeId: route.id } });
            await this.db.$transaction((tx) => this.planner.appendStops(tx, route, input.storeIds, count + 1), { timeout: 30_000 });
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
    async update(id, input, user) {
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
    async addStop(id, storeId, position, user) {
        const route = await this.load(id, user);
        const store = await this.db.store.findUnique({ where: { id: storeId } });
        if (!store || !store.active)
            throw new common_1.NotFoundException('Loja não encontrada ou inativa.');
        if (route.stops.some((s) => s.storeId === storeId))
            throw new common_1.ConflictException('Esta loja já está na rota do dia.');
        const end = route.stops.length + 1;
        const target = Math.min(Math.max(position ?? end, 1), end);
        await this.db.$transaction(async (tx) => {
            for (const stop of route.stops.filter((s) => s.order >= target)) {
                await tx.routeStop.update({ where: { id: stop.id }, data: { order: stop.order + 1 } });
                if (stop.visitId)
                    await tx.visit.update({ where: { id: stop.visitId }, data: { order: stop.order + 1 } });
            }
            await this.planner.appendStops(tx, route, [storeId], target);
        }, { timeout: 30_000 });
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
    async removeStop(id, stopId, user) {
        const route = await this.load(id, user);
        const stop = route.stops.find((s) => s.id === stopId);
        if (!stop)
            throw new common_1.NotFoundException('Parada não encontrada nesta rota.');
        if (stop.visit && (stop.visit.status !== 'PENDING' || stop.visit._count.photos > 0)) {
            throw new common_1.ConflictException('Esta visita já foi iniciada ou possui evidências. Use "Reagendar" ou "Não realizada".');
        }
        const remaining = route.stops.filter((s) => s.id !== stopId);
        await this.db.$transaction(async (tx) => {
            await tx.routeStop.delete({ where: { id: stopId } });
            if (stop.visitId)
                await tx.visit.delete({ where: { id: stop.visitId } });
            for (const [index, s] of remaining.entries()) {
                if (s.order === index + 1)
                    continue;
                await tx.routeStop.update({ where: { id: s.id }, data: { order: index + 1 } });
                if (s.visitId)
                    await tx.visit.update({ where: { id: s.visitId }, data: { order: index + 1 } });
            }
        }, { timeout: 30_000 });
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
    async applyOrder(route, stopIds) {
        const current = new Set(route.stops.map((s) => s.id));
        if (stopIds.length !== current.size || !stopIds.every((sid) => current.has(sid))) {
            throw new common_1.BadRequestException('A nova ordem precisa conter exatamente as paradas da rota.');
        }
        const byId = new Map(route.stops.map((s) => [s.id, s]));
        await this.db.$transaction(stopIds.flatMap((stopId, index) => {
            const stop = byId.get(stopId);
            return [
                this.db.routeStop.update({ where: { id: stopId }, data: { order: index + 1 } }),
                ...(stop.visitId
                    ? [this.db.visit.update({ where: { id: stop.visitId }, data: { order: index + 1 } })]
                    : []),
            ];
        }));
        await this.invalidate(route.id);
    }
    async reorder(id, stopIds, user) {
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
    /** Matriz de tempos em transporte público entre casa e lojas (guardada por 10 minutos). */
    async travelMatrix(route, points) {
        const key = [
            route.id,
            this.transport.provider.name,
            ...points.map((p) => `${p.latitude},${p.longitude}`),
        ].join('|');
        const cached = matrixCache.get(key);
        if (cached && Date.now() - cached.at < MATRIX_TTL_MS)
            return cached.matrix;
        const matrix = await this.transport.computeMatrix(points, (0, serialize_1.isoDate)(route.date));
        matrixCache.set(key, { at: Date.now(), matrix });
        if (matrixCache.size > 200)
            matrixCache.delete(matrixCache.keys().next().value);
        return matrix;
    }
    /**
     * Otimização OPCIONAL pela soma dos tempos de transporte público (Casa → lojas → Casa).
     * Visitas já iniciadas/finalizadas mantêm a posição; as pendentes são reorganizadas a partir
     * da última loja visitada. Ótimo exato até 13 paradas pendentes. Só altera com apply=true.
     */
    async optimize(id, apply, user) {
        const route = await this.load(id, user);
        const currentOrder = route.stops.map((s) => s.id);
        const missing = route.stops.filter((s) => !(0, types_1.hasCoordinates)(s.store)).map((s) => s.store.name);
        const base = {
            applied: false,
            canOptimize: false,
            reason: null,
            currentOrder,
            proposedOrder: currentOrder,
            currentDistanceKm: null,
            proposedDistanceKm: null,
            improvementKm: null,
            currentDurationSeconds: null,
            proposedDurationSeconds: null,
            improvementSeconds: null,
            fixedStops: 0,
            method: null,
            source: null,
            missingCoordinates: missing,
        };
        if (route.startLatitude == null || route.startLongitude == null) {
            return {
                ...base,
                reason: 'O endereço de casa ainda está sem localização. Confira o endereço em Configurações › Casa.',
            };
        }
        if (missing.length) {
            return {
                ...base,
                reason: `${missing.length} loja(s) ainda sem localização: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '…' : ''}.`,
            };
        }
        const isFixed = (s) => !!s.visit && s.visit.status !== 'PENDING' && s.visit.status !== 'BLOCKED';
        const fixed = route.stops.filter(isFixed);
        const pending = route.stops.filter((s) => !isFixed(s));
        if (pending.length < 2) {
            return {
                ...base,
                fixedStops: fixed.length,
                reason: 'Não há paradas pendentes suficientes para reorganizar.',
            };
        }
        const points = [this.homePoint(route), ...route.stops.map((s) => this.storePoint(s.store))];
        const matrix = await this.travelMatrix(route, points);
        const indexOf = new Map(route.stops.map((s, i) => [s.id, i + 1]));
        const start = fixed.length ? indexOf.get(fixed[fixed.length - 1].id) : 0;
        const result = (0, types_1.optimizePath)(matrix.seconds, start, 0, pending.map((s) => indexOf.get(s.id)));
        const proposedOrder = [
            ...fixed.map((s) => s.id),
            ...result.order.map((i) => route.stops[i - 1].id),
        ];
        const seconds = (order) => (0, types_1.pathCost)(matrix.seconds, 0, 0, order.map((sid) => indexOf.get(sid)));
        const km = (order) => {
            const idx = [0, ...order.map((sid) => indexOf.get(sid)), 0];
            let total = 0;
            for (let i = 0; i < idx.length - 1; i++) {
                const m = matrix.meters[idx[i]][idx[i + 1]];
                if (m == null)
                    return null;
                total += m;
            }
            return Math.round(total / 10) / 100;
        };
        const currentSeconds = Math.round(seconds(currentOrder));
        const proposedSeconds = Math.round(seconds(proposedOrder));
        const improvementSeconds = currentSeconds - proposedSeconds;
        const shouldApply = apply && improvementSeconds > 30;
        if (shouldApply) {
            await this.applyOrder(route, proposedOrder);
            await this.db.route.update({ where: { id }, data: { optimizedAt: new Date() } });
            void this.audit.log({
                userId: user.id,
                entity: 'route',
                entityId: id,
                action: 'route.optimize',
                metadata: { improvementSeconds, source: matrix.source, method: result.method },
            });
        }
        const currentKm = km(currentOrder);
        const proposedKm = km(proposedOrder);
        return {
            ...base,
            applied: shouldApply,
            canOptimize: true,
            proposedOrder,
            currentDurationSeconds: currentSeconds,
            proposedDurationSeconds: proposedSeconds,
            improvementSeconds,
            currentDistanceKm: currentKm,
            proposedDistanceKm: proposedKm,
            improvementKm: currentKm != null && proposedKm != null
                ? Math.round((currentKm - proposedKm) * 100) / 100
                : null,
            fixedStops: fixed.length,
            method: result.method,
            source: matrix.source,
            missingCoordinates: [],
        };
    }
    async generate(from, to, overwrite, user, employeeId) {
        const result = await this.planner.generate((0, auth_user_1.resolveEmployeeId)(user, employeeId), from, to, overwrite);
        void this.audit.log({
            userId: user.id,
            entity: 'route',
            action: 'route.generate',
            metadata: { from, to, overwrite, created: result.created.length },
        });
        return result;
    }
    /** Inclui uma loja na rota de uma data (criando a rota do dia se necessário). */
    async addStoreToDate(employeeId, date, storeId, extra = {}) {
        const store = await this.db.store.findUnique({ where: { id: storeId } });
        if (!store)
            throw new common_1.NotFoundException('Loja não encontrada.');
        const route = await this.planner.ensureRoute(employeeId, date);
        const already = await this.db.visit.findFirst({
            where: { routeId: route.id, storeId, status: { notIn: [...TERMINAL] } },
            select: { id: true },
        });
        if (already)
            throw new common_1.ConflictException(`${store.name} já está programada para ${(0, types_1.formatDateBR)(date)}.`);
        const count = await this.db.routeStop.count({ where: { routeId: route.id } });
        const [visit] = await this.db.$transaction((tx) => this.planner.appendStops(tx, route, [storeId], count + 1, extra), { timeout: 30_000 });
        await this.invalidate(route.id);
        return visit;
    }
    /** Atualiza status da rota conforme as visitas (iniciada/concluída). */
    async syncStatus(routeId) {
        const visits = await this.db.visit.findMany({ where: { routeId }, select: { status: true } });
        if (visits.length === 0)
            return;
        const open = visits.some((v) => v.status === 'PENDING' || v.status === 'IN_PROGRESS' || v.status === 'BLOCKED');
        const started = visits.some((v) => v.status !== 'PENDING');
        await this.db.route.update({
            where: { id: routeId },
            data: { status: !open ? 'COMPLETED' : started ? 'IN_PROGRESS' : 'PLANNED' },
        });
    }
    routeTotals(routes) {
        return {
            distance: routes.reduce((acc, r) => acc + (r.estimatedDistance ?? 0), 0),
            cost: routes.reduce((acc, r) => acc + (0, serialize_1.money)(r.estimatedTransportCost), 0),
        };
    }
};
exports.RoutesService = RoutesService;
exports.RoutesService = RoutesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_module_1.DB)),
    __metadata("design:paramtypes", [Object, planner_service_1.PlannerService,
        authorizations_service_1.AuthorizationsService,
        settings_service_1.SettingsService,
        transport_module_1.TransportService,
        notifications_service_1.NotificationsService,
        audit_service_1.AuditService])
], RoutesService);
//# sourceMappingURL=routes.service.js.map