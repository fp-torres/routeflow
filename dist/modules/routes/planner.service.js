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
exports.PlannerService = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("@routeflow/types");
const env_1 = require("../../config/env");
const database_module_1 = require("../../database/database.module");
const serialize_1 = require("../../common/serialize");
const home_address_service_1 = require("../settings/home-address.service");
const settings_service_1 = require("../settings/settings.service");
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
};
/**
 * Planejamento: resolve qual roteiro vale para cada data e materializa rotas.
 * Precedência: alteração na data (rota já existente) > roteiro mensal > roteiro
 * semanal (ciclo de N semanas) > roteiro padrão (por dia da semana).
 */
let PlannerService = class PlannerService {
    constructor(db, config, settings, homeAddress) {
        this.db = db;
        this.config = config;
        this.settings = settings;
        this.homeAddress = homeAddress;
        this.lastEnsure = new Map();
    }
    today() {
        return (0, types_1.todayIso)(this.config.timeZone);
    }
    loadTemplates(employeeId) {
        return this.db.routeTemplate.findMany({
            where: { employeeId, active: true },
            include: templateInclude,
        });
    }
    cycleIndex(template, date) {
        const anchor = (0, serialize_1.isoDateOrNull)(template.anchorDate) ??
            (0, serialize_1.isoDateOrNull)(template.validFrom) ??
            (0, serialize_1.isoDate)(template.createdAt);
        const weeks = Math.floor((0, types_1.diffDaysIso)((0, types_1.startOfWeekIso)(anchor), (0, types_1.startOfWeekIso)(date)) / 7);
        const cycle = Math.max(1, template.cycleWeeks);
        return (((weeks % cycle) + cycle) % cycle) + 1;
    }
    slotFor(templates, date) {
        const weekday = (0, types_1.isoWeekday)(date);
        const order = ['MONTHLY', 'WEEKLY', 'STANDARD'];
        for (const kind of order) {
            const candidates = templates.filter((t) => {
                const from = (0, serialize_1.isoDateOrNull)(t.validFrom);
                const until = (0, serialize_1.isoDateOrNull)(t.validUntil);
                return t.kind === kind && t.active && (!from || from <= date) && (!until || until >= date);
            });
            for (const template of candidates) {
                const weekIndex = kind === 'MONTHLY'
                    ? (0, types_1.weekOfMonth)(date)
                    : kind === 'WEEKLY'
                        ? this.cycleIndex(template, date)
                        : 0;
                const stops = template.stops
                    .filter((s) => s.weekday === weekday && s.weekIndex === weekIndex && s.store.active)
                    .sort((a, b) => a.order - b.order);
                if (stops.length)
                    return { templateId: template.id, stops };
            }
        }
        return null;
    }
    async home(employeeId) {
        const home = await this.homeAddress.getActive(employeeId);
        return home
            ? { address: home.address, latitude: home.latitude, longitude: home.longitude }
            : { address: '', latitude: null, longitude: null };
    }
    /** Cria visita + parada para cada loja, a partir da posição informada. */
    async appendStops(tx, route, storeIds, startOrder, extra = {}) {
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
    dominantRegion(regions) {
        const counts = new Map();
        for (const r of regions)
            if (r)
                counts.set(r, (counts.get(r) ?? 0) + 1);
        return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    }
    /** Garante que exista a rota do dia; para hoje/futuro, nasce com as lojas do roteiro. */
    async ensureRoute(employeeId, date, templates) {
        const existing = await this.db.route.findUnique({
            where: { employeeId_date: { employeeId, date: (0, types_1.isoToUtcDate)(date) } },
        });
        if (existing)
            return existing;
        const slot = date >= this.today()
            ? this.slotFor(templates ?? (await this.loadTemplates(employeeId)), date)
            : null;
        const home = await this.home(employeeId);
        try {
            return await this.db.$transaction(async (tx) => {
                const route = await tx.route.create({
                    data: {
                        employeeId,
                        date: (0, types_1.isoToUtcDate)(date),
                        startAddress: home.address,
                        startLatitude: home.latitude,
                        startLongitude: home.longitude,
                        templateId: slot?.templateId ?? null,
                        region: slot ? this.dominantRegion(slot.stops.map((s) => s.store.region)) : null,
                    },
                });
                if (slot)
                    await this.appendStops(tx, route, slot.stops.map((s) => s.storeId), 1);
                return route;
            }, { timeout: 30_000 });
        }
        catch (error) {
            // Corrida: outra requisição criou a rota no mesmo instante
            const again = await this.db.route.findUnique({
                where: { employeeId_date: { employeeId, date: (0, types_1.isoToUtcDate)(date) } },
            });
            if (again)
                return again;
            throw error;
        }
    }
    /** Gera rotas a partir dos roteiros no período (idempotente: não duplica dias existentes). */
    async generate(employeeId, from, to, overwrite = false) {
        if ((0, types_1.diffDaysIso)(from, to) > 92)
            throw new common_1.ConflictException('Gere no máximo 3 meses por vez.');
        const templates = await this.loadTemplates(employeeId);
        const existing = await this.db.route.findMany({
            where: { employeeId, date: { gte: (0, types_1.isoToUtcDate)(from), lte: (0, types_1.isoToUtcDate)(to) } },
            include: { visits: { select: { status: true, _count: { select: { photos: true } } } } },
        });
        const byDate = new Map(existing.map((r) => [(0, serialize_1.isoDate)(r.date), r]));
        const result = {
            created: [],
            replaced: [],
            skipped: [],
        };
        for (let date = from; date <= to; date = (0, types_1.addDaysIso)(date, 1)) {
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
                await this.db.$transaction(async (tx) => {
                    await tx.routeStop.deleteMany({ where: { routeId: route.id } });
                    await tx.visit.deleteMany({ where: { routeId: route.id } });
                    await tx.route.update({
                        where: { id: route.id },
                        data: { templateId: slot.templateId, legsComputedAt: null },
                    });
                    await this.appendStops(tx, route, slot.stops.map((s) => s.storeId), 1);
                }, { timeout: 30_000 });
                result.replaced.push(date);
            }
            else
                result.skipped.push(date);
        }
        return result;
    }
    /** Mantém a agenda dos próximos dias preenchida conforme o roteiro (configurável). */
    async ensureUpcoming(employeeId) {
        const last = this.lastEnsure.get(employeeId) ?? 0;
        if (Date.now() - last < 5 * 60_000)
            return;
        this.lastEnsure.set(employeeId, Date.now());
        const settings = await this.settings.get();
        if (!settings.autoGenerateRoutes || settings.routeGenerationHorizonDays <= 0)
            return;
        const today = this.today();
        await this.generate(employeeId, today, (0, types_1.addDaysIso)(today, settings.routeGenerationHorizonDays));
    }
    resetCache() {
        this.lastEnsure.clear();
    }
};
exports.PlannerService = PlannerService;
exports.PlannerService = PlannerService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_module_1.DB)),
    __param(1, (0, common_1.Inject)(env_1.APP_CONFIG)),
    __metadata("design:paramtypes", [Object, Object, settings_service_1.SettingsService,
        home_address_service_1.HomeAddressService])
], PlannerService);
//# sourceMappingURL=planner.service.js.map