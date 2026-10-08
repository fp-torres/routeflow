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
exports.ExpensesService = void 0;
exports.toExpenseDto = toExpenseDto;
const common_1 = require("@nestjs/common");
const types_1 = require("@routeflow/types");
const env_1 = require("../../config/env");
const database_module_1 = require("../../database/database.module");
const auth_user_1 = require("../../common/auth-user");
const serialize_1 = require("../../common/serialize");
const audit_service_1 = require("../audit/audit.service");
const include = {
    employee: { select: { id: true, name: true } },
    visit: { select: { store: { select: { name: true } } } },
};
function toExpenseDto(row) {
    return {
        id: row.id,
        date: (0, serialize_1.isoDate)(row.date),
        type: row.type,
        description: row.description,
        value: (0, serialize_1.money)(row.value),
        estimatedValue: (0, serialize_1.moneyOrNull)(row.estimatedValue),
        actualValue: (0, serialize_1.moneyOrNull)(row.actualValue),
        routeId: row.routeId,
        visitId: row.visitId,
        visitStoreName: row.visit?.store.name ?? null,
        employee: row.employee,
        createdAt: (0, serialize_1.isoInstant)(row.createdAt),
    };
}
let ExpensesService = class ExpensesService {
    constructor(db, config, audit) {
        this.db = db;
        this.config = config;
        this.audit = audit;
    }
    where(employeeId, from, to) {
        return {
            ...(employeeId ? { employeeId } : {}),
            ...(from || to
                ? {
                    date: {
                        ...(from ? { gte: (0, types_1.isoToUtcDate)(from) } : {}),
                        ...(to ? { lte: (0, types_1.isoToUtcDate)(to) } : {}),
                    },
                }
                : {}),
        };
    }
    async list(query, user) {
        const where = {
            ...this.where(user ? (0, auth_user_1.employeeFilter)(user, query.employeeId) : query.employeeId, query.from, query.to),
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
            ...(0, serialize_1.paginate)(rows.map(toExpenseDto), total, query.page, query.pageSize),
            totalValue: (0, serialize_1.money)(sum._sum.value),
        };
    }
    async assertLinks(employeeId, routeId, visitId) {
        let resolvedRoute = routeId ?? null;
        if (visitId) {
            const visit = await this.db.visit.findUnique({
                where: { id: visitId },
                select: { employeeId: true, routeId: true },
            });
            if (!visit || visit.employeeId !== employeeId)
                throw new common_1.BadRequestException('Visita inválida para esta despesa.');
            resolvedRoute = resolvedRoute ?? visit.routeId;
        }
        if (resolvedRoute) {
            const route = await this.db.route.findUnique({
                where: { id: resolvedRoute },
                select: { employeeId: true },
            });
            if (!route || route.employeeId !== employeeId)
                throw new common_1.BadRequestException('Rota inválida para esta despesa.');
        }
        return resolvedRoute;
    }
    async create(input, user) {
        const data = types_1.expenseCreateSchema.parse(input);
        const routeId = await this.assertLinks(user.id, data.routeId, data.visitId);
        const value = data.actualValue ?? data.estimatedValue ?? 0;
        const row = await this.db.transportExpense.create({
            data: {
                employeeId: user.id,
                routeId,
                visitId: data.visitId ?? null,
                date: (0, types_1.isoToUtcDate)(data.date),
                type: data.type,
                description: data.description ?? null,
                value,
                estimatedValue: data.estimatedValue ?? null,
                actualValue: data.actualValue ?? null,
            },
            include,
        });
        if (routeId)
            await this.syncRouteActualCost(routeId);
        void this.audit.log({
            userId: user.id,
            entity: 'expense',
            entityId: row.id,
            action: 'expense.create',
            metadata: data,
        });
        return toExpenseDto(row);
    }
    async load(id, user) {
        const row = await this.db.transportExpense.findUnique({ where: { id } });
        if (!row || (row.employeeId !== user.id && !(0, auth_user_1.canSeeAll)(user)))
            throw new common_1.NotFoundException('Despesa não encontrada.');
        return row;
    }
    async update(id, input, user) {
        const current = await this.load(id, user);
        const estimatedValue = input.estimatedValue !== undefined
            ? input.estimatedValue
            : (0, serialize_1.moneyOrNull)(current.estimatedValue);
        const actualValue = input.actualValue !== undefined ? input.actualValue : (0, serialize_1.moneyOrNull)(current.actualValue);
        if (estimatedValue == null && actualValue == null)
            throw new common_1.BadRequestException('Informe o valor pago ou o estimado.');
        const row = await this.db.transportExpense.update({
            where: { id },
            data: {
                ...(input.date ? { date: (0, types_1.isoToUtcDate)(input.date) } : {}),
                ...(input.type ? { type: input.type } : {}),
                ...(input.description !== undefined ? { description: input.description } : {}),
                estimatedValue,
                actualValue,
                value: actualValue ?? estimatedValue ?? 0,
            },
            include,
        });
        if (row.routeId)
            await this.syncRouteActualCost(row.routeId);
        void this.audit.log({
            userId: user.id,
            entity: 'expense',
            entityId: id,
            action: 'expense.update',
            metadata: input,
        });
        return toExpenseDto(row);
    }
    async remove(id, user) {
        const row = await this.load(id, user);
        await this.db.transportExpense.delete({ where: { id } });
        if (row.routeId)
            await this.syncRouteActualCost(row.routeId);
        void this.audit.log({
            userId: user.id,
            entity: 'expense',
            entityId: id,
            action: 'expense.delete',
        });
    }
    /** Custo real da rota = soma das despesas registradas para ela. */
    async syncRouteActualCost(routeId) {
        const sum = await this.db.transportExpense.aggregate({
            where: { routeId },
            _sum: { value: true },
        });
        await this.db.route.update({
            where: { id: routeId },
            data: { actualTransportCost: sum._sum.value ?? null },
        });
    }
    async sumBetween(employeeId, from, to) {
        const sum = await this.db.transportExpense.aggregate({
            where: this.where(employeeId, from, to),
            _sum: { value: true },
        });
        return (0, serialize_1.money)(sum._sum.value);
    }
    async summary(user, reference, requestedEmployee) {
        const employeeId = (0, auth_user_1.employeeFilter)(user, requestedEmployee);
        const date = reference ?? (0, types_1.todayIso)(this.config.timeZone);
        const monthFrom = (0, types_1.startOfMonthIso)(date);
        const monthTo = (0, types_1.endOfMonthIso)(date);
        const [day, week, month, completed, byType, last30] = await Promise.all([
            this.sumBetween(employeeId, date, date),
            this.sumBetween(employeeId, (0, types_1.startOfWeekIso)(date), (0, types_1.endOfWeekIso)(date)),
            this.sumBetween(employeeId, monthFrom, monthTo),
            this.db.visit.count({
                where: {
                    ...(employeeId ? { employeeId } : {}),
                    status: 'COMPLETED',
                    scheduledDate: { gte: (0, types_1.isoToUtcDate)(monthFrom), lte: (0, types_1.isoToUtcDate)(monthTo) },
                },
            }),
            this.db.transportExpense.groupBy({
                by: ['type'],
                where: this.where(employeeId, monthFrom, monthTo),
                _sum: { value: true },
            }),
            this.db.transportExpense.findMany({
                where: this.where(employeeId, (0, types_1.addDaysIso)(date, -29), date),
                select: { date: true, value: true },
            }),
        ]);
        const byDay = new Map();
        for (let i = 29; i >= 0; i -= 1)
            byDay.set((0, types_1.addDaysIso)(date, -i), 0);
        for (const row of last30)
            byDay.set((0, serialize_1.isoDate)(row.date), Math.round(((byDay.get((0, serialize_1.isoDate)(row.date)) ?? 0) + (0, serialize_1.money)(row.value)) * 100) / 100);
        return {
            referenceDate: date,
            day,
            week,
            month,
            monthCompletedVisits: completed,
            averagePerVisit: completed ? Math.round((month / completed) * 100) / 100 : null,
            byType: types_1.TRANSPORT_TYPES.map((type) => ({
                type,
                total: (0, serialize_1.money)(byType.find((b) => b.type === type)?._sum.value),
            })).filter((t) => t.total > 0),
            byDay: [...byDay.entries()].map(([d, total]) => ({ date: d, total })),
        };
    }
};
exports.ExpensesService = ExpensesService;
exports.ExpensesService = ExpensesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_module_1.DB)),
    __param(1, (0, common_1.Inject)(env_1.APP_CONFIG)),
    __metadata("design:paramtypes", [Object, Object, audit_service_1.AuditService])
], ExpensesService);
//# sourceMappingURL=expenses.service.js.map