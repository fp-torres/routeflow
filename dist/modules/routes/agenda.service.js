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
exports.AgendaService = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("@routeflow/types");
const database_module_1 = require("../../database/database.module");
const serialize_1 = require("../../common/serialize");
const planner_service_1 = require("./planner.service");
let AgendaService = class AgendaService {
    constructor(db, planner) {
        this.db = db;
        this.planner = planner;
    }
    async get(employeeId, from, to) {
        if (from > to)
            throw new common_1.BadRequestException('Período inválido.');
        if ((0, types_1.diffDaysIso)(from, to) > 92)
            throw new common_1.BadRequestException('Consulte no máximo 3 meses por vez.');
        const today = this.planner.today();
        if (to >= today)
            await this.planner.ensureUpcoming(employeeId);
        const [visits, routes, templates] = await Promise.all([
            this.db.visit.findMany({
                where: { employeeId, scheduledDate: { gte: (0, types_1.isoToUtcDate)(from), lte: (0, types_1.isoToUtcDate)(to) } },
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
                where: { employeeId, date: { gte: (0, types_1.isoToUtcDate)(from), lte: (0, types_1.isoToUtcDate)(to) } },
                select: { id: true, date: true, region: true },
            }),
            this.planner.loadTemplates(employeeId),
        ]);
        const routeByDate = new Map(routes.map((r) => [(0, serialize_1.isoDate)(r.date), r]));
        const days = (0, types_1.eachDayIso)(from, to).map((date) => {
            const dayVisits = visits.filter((v) => (0, serialize_1.isoDate)(v.scheduledDate) === date);
            const route = routeByDate.get(date);
            const slot = !route && date >= today ? this.planner.slotFor(templates, date) : null;
            const counted = dayVisits.filter((v) => v.status !== 'RESCHEDULED' && v.status !== 'CANCELLED');
            const completed = counted.filter((v) => v.status === 'COMPLETED').length;
            const regions = [
                ...new Set([
                    route?.region,
                    ...dayVisits.map((v) => v.store.region),
                    ...(slot?.stops.map((s) => s.store.region) ?? []),
                ].filter((r) => !!r)),
            ];
            return {
                date,
                weekday: (0, types_1.isoWeekday)(date),
                holiday: (0, types_1.holidayOn)(date) ?? null,
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
};
exports.AgendaService = AgendaService;
exports.AgendaService = AgendaService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_module_1.DB)),
    __metadata("design:paramtypes", [Object, planner_service_1.PlannerService])
], AgendaService);
//# sourceMappingURL=agenda.service.js.map