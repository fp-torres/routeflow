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
exports.TemplatesService = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("@routeflow/types");
const database_module_1 = require("../../database/database.module");
const auth_user_1 = require("../../common/auth-user");
const mappers_1 = require("../../common/mappers");
const serialize_1 = require("../../common/serialize");
const audit_service_1 = require("../audit/audit.service");
const planner_service_1 = require("./planner.service");
const include = {
    stops: {
        include: { store: true },
        orderBy: [{ weekIndex: 'asc' }, { weekday: 'asc' }, { order: 'asc' }],
    },
};
function toDto(row) {
    return {
        id: row.id,
        name: row.name,
        kind: row.kind,
        cycleWeeks: row.cycleWeeks,
        anchorDate: (0, serialize_1.isoDateOrNull)(row.anchorDate),
        validFrom: (0, serialize_1.isoDateOrNull)(row.validFrom),
        validUntil: (0, serialize_1.isoDateOrNull)(row.validUntil),
        active: row.active,
        notes: row.notes,
        stops: row.stops.map((s) => ({
            id: s.id,
            order: s.order,
            weekday: s.weekday,
            weekIndex: s.weekIndex,
            store: (0, mappers_1.toStoreRef)(s.store),
        })),
    };
}
/** Roteiro padrão / semanal / mensal: quais lojas visitar em cada dia. */
let TemplatesService = class TemplatesService {
    constructor(db, planner, audit) {
        this.db = db;
        this.planner = planner;
        this.audit = audit;
    }
    async list(employeeId) {
        const rows = await this.db.routeTemplate.findMany({
            where: { employeeId },
            include,
            orderBy: [{ active: 'desc' }, { createdAt: 'asc' }],
        });
        return rows.map(toDto);
    }
    async load(id, user) {
        const row = await this.db.routeTemplate.findUnique({ where: { id }, include });
        if (!row)
            throw new common_1.NotFoundException('Roteiro não encontrado.');
        if (row.employeeId !== user.id && !(0, auth_user_1.canSeeAll)(user))
            throw new common_1.ForbiddenException();
        return row;
    }
    dates(input) {
        const conv = (v) => v === undefined ? undefined : v ? (0, types_1.isoToUtcDate)(v) : null;
        return {
            anchorDate: conv(input.anchorDate),
            validFrom: conv(input.validFrom),
            validUntil: conv(input.validUntil),
        };
    }
    async create(input, user) {
        const data = types_1.templateCreateSchema.parse(input);
        const row = await this.db.routeTemplate.create({
            data: {
                employeeId: user.id,
                name: data.name,
                kind: data.kind,
                cycleWeeks: data.kind === 'WEEKLY' ? data.cycleWeeks : 1,
                active: data.active,
                notes: data.notes ?? null,
                ...this.dates(data),
            },
            include,
        });
        this.planner.resetCache();
        void this.audit.log({
            userId: user.id,
            entity: 'route_template',
            entityId: row.id,
            action: 'template.create',
            metadata: data,
        });
        return toDto(row);
    }
    async update(id, input, user) {
        await this.load(id, user);
        const data = types_1.templateUpdateSchema.parse(input);
        const row = await this.db.routeTemplate.update({
            where: { id },
            data: {
                ...(data.name !== undefined ? { name: data.name } : {}),
                ...(data.kind !== undefined ? { kind: data.kind } : {}),
                ...(data.cycleWeeks !== undefined ? { cycleWeeks: data.cycleWeeks } : {}),
                ...(data.active !== undefined ? { active: data.active } : {}),
                ...(data.notes !== undefined ? { notes: data.notes } : {}),
                ...this.dates(data),
            },
            include,
        });
        this.planner.resetCache();
        void this.audit.log({
            userId: user.id,
            entity: 'route_template',
            entityId: id,
            action: 'template.update',
            metadata: data,
        });
        return toDto(row);
    }
    async remove(id, user) {
        await this.load(id, user);
        await this.db.routeTemplate.delete({ where: { id } });
        this.planner.resetCache();
        void this.audit.log({
            userId: user.id,
            entity: 'route_template',
            entityId: id,
            action: 'template.delete',
        });
    }
    /** Define as lojas (em ordem) de um dia do roteiro. */
    async setDay(id, input, user) {
        const template = await this.load(id, user);
        if (template.kind === 'STANDARD' && input.weekIndex !== 0)
            throw new common_1.BadRequestException('O roteiro padrão não usa índice de semana.');
        if (template.kind === 'WEEKLY' &&
            (input.weekIndex < 1 || input.weekIndex > template.cycleWeeks)) {
            throw new common_1.BadRequestException(`Semana do ciclo deve estar entre 1 e ${template.cycleWeeks}.`);
        }
        if (template.kind === 'MONTHLY' && (input.weekIndex < 1 || input.weekIndex > 5))
            throw new common_1.BadRequestException('Semana do mês deve estar entre 1 e 5.');
        const unique = [...new Set(input.storeIds)];
        const found = await this.db.store.count({ where: { id: { in: unique } } });
        if (found !== unique.length)
            throw new common_1.BadRequestException('Uma ou mais lojas não existem.');
        await this.db.$transaction([
            this.db.routeTemplateStop.deleteMany({
                where: { templateId: id, weekday: input.weekday, weekIndex: input.weekIndex },
            }),
            this.db.routeTemplateStop.createMany({
                data: unique.map((storeId, index) => ({
                    templateId: id,
                    storeId,
                    weekday: input.weekday,
                    weekIndex: input.weekIndex,
                    order: index + 1,
                })),
            }),
        ]);
        this.planner.resetCache();
        void this.audit.log({
            userId: user.id,
            entity: 'route_template',
            entityId: id,
            action: 'template.set_day',
            metadata: input,
        });
        return toDto(await this.load(id, user));
    }
};
exports.TemplatesService = TemplatesService;
exports.TemplatesService = TemplatesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_module_1.DB)),
    __metadata("design:paramtypes", [Object, planner_service_1.PlannerService,
        audit_service_1.AuditService])
], TemplatesService);
//# sourceMappingURL=templates.service.js.map