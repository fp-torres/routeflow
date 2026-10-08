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
exports.VisitsService = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("@routeflow/types");
const env_1 = require("../../config/env");
const database_module_1 = require("../../database/database.module");
const auth_user_1 = require("../../common/auth-user");
const mappers_1 = require("../../common/mappers");
const serialize_1 = require("../../common/serialize");
const text_search_1 = require("../../common/text-search");
const visit_mappers_1 = require("../../common/visit-mappers");
const audit_service_1 = require("../audit/audit.service");
const authorizations_service_1 = require("../authorizations/authorizations.service");
const routes_service_1 = require("../routes/routes.service");
const settings_service_1 = require("../settings/settings.service");
const storage_service_1 = require("../storage/storage.service");
const detailInclude = {
    ...visit_mappers_1.visitSummaryInclude,
    photos: { orderBy: { createdAt: 'asc' } },
    activities: {
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true } } },
    },
    expenses: {
        orderBy: { createdAt: 'desc' },
        include: { employee: { select: { id: true, name: true } } },
    },
    rescheduledFrom: { select: { id: true, scheduledDate: true } },
    rescheduledTo: { select: { id: true, scheduledDate: true } },
};
/** Fluxo da visita: iniciar -> registrar atividade/fotos/observações -> finalizar. */
let VisitsService = class VisitsService {
    constructor(db, config, letters, settings, routes, storage, audit) {
        this.db = db;
        this.config = config;
        this.letters = letters;
        this.settings = settings;
        this.routes = routes;
        this.storage = storage;
        this.audit = audit;
    }
    async list(query, user) {
        const provider = this.config.database.provider;
        const employeeId = (0, auth_user_1.employeeFilter)(user, query.employeeId);
        const and = [];
        if (employeeId)
            and.push({ employeeId });
        if (query.date)
            and.push({ scheduledDate: (0, types_1.isoToUtcDate)(query.date) });
        if (query.from)
            and.push({ scheduledDate: { gte: (0, types_1.isoToUtcDate)(query.from) } });
        if (query.to)
            and.push({ scheduledDate: { lte: (0, types_1.isoToUtcDate)(query.to) } });
        if (query.status?.length)
            and.push({ status: { in: query.status } });
        if (query.storeId)
            and.push({ storeId: query.storeId });
        if (query.network)
            and.push({ store: { network: query.network } });
        if (query.region)
            and.push({ store: { region: query.region } });
        if (query.search) {
            const c = (0, text_search_1.containsInsensitive)(provider, query.search);
            and.push({
                OR: [
                    { store: { name: c } },
                    { store: { code: c } },
                    { store: { neighborhood: c } },
                    { notes: c },
                ],
            });
        }
        const where = and.length ? { AND: and } : {};
        const descending = !query.date && !query.from;
        const [total, rows] = await Promise.all([
            this.db.visit.count({ where }),
            this.db.visit.findMany({
                where,
                include: visit_mappers_1.visitSummaryInclude,
                orderBy: [{ scheduledDate: descending ? 'desc' : 'asc' }, { order: 'asc' }],
                skip: (query.page - 1) * query.pageSize,
                take: query.pageSize,
            }),
        ]);
        const auth = await this.letters.summaries(rows.map((r) => r.storeId));
        return (0, serialize_1.paginate)(rows.map((r) => (0, visit_mappers_1.toVisitSummary)(r, auth.get(r.storeId) ?? mappers_1.NO_AUTHORIZATION)), total, query.page, query.pageSize);
    }
    async findAccessible(id, user) {
        const visit = await this.db.visit.findUnique({ where: { id }, include: { store: true } });
        if (!visit || (visit.employeeId !== user.id && !(0, auth_user_1.canSeeAll)(user)))
            throw new common_1.NotFoundException('Visita não encontrada.');
        return visit;
    }
    async detail(id, user) {
        const visit = await this.db.visit.findUnique({ where: { id }, include: detailInclude });
        if (!visit || (visit.employeeId !== user.id && !(0, auth_user_1.canSeeAll)(user)))
            throw new common_1.NotFoundException('Visita não encontrada.');
        const [auth, letters, settings, next] = await Promise.all([
            this.letters.summaries([visit.storeId]),
            this.letters.list({ storeId: visit.storeId }),
            this.settings.get(),
            visit.routeId
                ? this.db.visit.findFirst({
                    where: {
                        routeId: visit.routeId,
                        order: { gt: visit.order },
                        status: { in: ['PENDING', 'IN_PROGRESS', 'BLOCKED'] },
                    },
                    orderBy: { order: 'asc' },
                    select: { id: true },
                })
                : Promise.resolve(null),
        ]);
        return {
            ...(0, visit_mappers_1.toVisitSummary)(visit, auth.get(visit.storeId) ?? mappers_1.NO_AUTHORIZATION),
            statusReason: visit.statusReason,
            latitudeAtStart: visit.latitudeAtStart,
            longitudeAtStart: visit.longitudeAtStart,
            latitudeAtFinish: visit.latitudeAtFinish,
            longitudeAtFinish: visit.longitudeAtFinish,
            photos: visit.photos.map((p) => (0, visit_mappers_1.toPhotoDto)(p, this.storage)),
            activities: visit.activities.map((a) => ({
                id: a.id,
                type: a.type,
                description: a.description,
                createdAt: (0, serialize_1.isoInstant)(a.createdAt),
                user: a.user,
            })),
            letters,
            expenses: visit.expenses.map((e) => ({
                id: e.id,
                date: (0, serialize_1.isoDate)(e.date),
                type: e.type,
                description: e.description,
                value: (0, serialize_1.money)(e.value),
                estimatedValue: (0, serialize_1.moneyOrNull)(e.estimatedValue),
                actualValue: (0, serialize_1.moneyOrNull)(e.actualValue),
                routeId: e.routeId,
                visitId: e.visitId,
                visitStoreName: visit.store.name,
                employee: e.employee,
                createdAt: (0, serialize_1.isoInstant)(e.createdAt),
            })),
            rescheduledFrom: visit.rescheduledFrom
                ? {
                    id: visit.rescheduledFrom.id,
                    scheduledDate: (0, serialize_1.isoDate)(visit.rescheduledFrom.scheduledDate),
                }
                : null,
            rescheduledTo: visit.rescheduledTo
                ? { id: visit.rescheduledTo.id, scheduledDate: (0, serialize_1.isoDate)(visit.rescheduledTo.scheduledDate) }
                : null,
            nextVisitId: next?.id ?? null,
            blockWithoutAuthorization: settings.blockVisitWithoutAuthorization,
            activityPresets: settings.activityPresets,
        };
    }
    async create(input, user, employeeId) {
        const visit = await this.routes.addStoreToDate((0, auth_user_1.resolveEmployeeId)(user, employeeId), input.scheduledDate, input.storeId, { notes: input.notes ?? null });
        void this.audit.log({
            userId: user.id,
            entity: 'visit',
            entityId: visit.id,
            action: 'visit.create',
            metadata: input,
        });
        return this.detail(visit.id, user);
    }
    async start(id, input, user) {
        const visit = await this.findAccessible(id, user);
        if (visit.status === 'IN_PROGRESS')
            throw new common_1.ConflictException('A visita já está em andamento.');
        if (visit.status !== 'PENDING' && visit.status !== 'BLOCKED') {
            throw new common_1.ConflictException(`Não é possível iniciar uma visita com status "${types_1.VISIT_STATUS_LABEL[visit.status]}".`);
        }
        const [auth, settings] = await Promise.all([
            this.letters.summaries([visit.storeId]),
            this.settings.get(),
        ]);
        const hasValid = auth.get(visit.storeId)?.hasValid ?? false;
        if (!hasValid && settings.blockVisitWithoutAuthorization) {
            await this.db.visit.update({
                where: { id },
                data: { status: 'BLOCKED', statusReason: 'Loja sem carta de autorização válida' },
            });
            throw new common_1.ConflictException('Visita bloqueada: a loja não possui carta de autorização válida (regra ativa nas configurações).');
        }
        const now = new Date();
        await this.db.$transaction([
            this.db.visit.update({
                where: { id },
                data: {
                    status: 'IN_PROGRESS',
                    startedAt: now,
                    finishedAt: null,
                    statusReason: null,
                    latitudeAtStart: input.latitude ?? null,
                    longitudeAtStart: input.longitude ?? null,
                    accuracyAtStart: input.accuracy ?? null,
                },
            }),
            this.db.visitActivity.create({
                data: {
                    visitId: id,
                    userId: user.id,
                    type: 'STATUS_CHANGE',
                    description: 'Visita iniciada',
                },
            }),
            this.db.routeStop.updateMany({ where: { visitId: id }, data: { actualArrival: now } }),
        ]);
        if (visit.routeId)
            await this.routes.syncStatus(visit.routeId);
        void this.audit.log({
            userId: user.id,
            entity: 'visit',
            entityId: id,
            action: 'visit.start',
            metadata: { withLocation: input.latitude != null },
        });
        return {
            visit: await this.detail(id, user),
            warning: hasValid
                ? null
                : 'Atenção: esta loja não possui carta de autorização válida. A visita foi iniciada mesmo assim.',
        };
    }
    async finish(id, input, user) {
        const visit = await this.findAccessible(id, user);
        if (input.status === 'COMPLETED' && visit.status !== 'IN_PROGRESS')
            throw new common_1.ConflictException('Inicie a visita antes de finalizá-la.');
        if (input.status === 'NOT_COMPLETED') {
            if (!['PENDING', 'IN_PROGRESS', 'BLOCKED'].includes(visit.status))
                throw new common_1.ConflictException('Esta visita já foi encerrada.');
            if (!input.reason)
                throw new common_1.BadRequestException('Informe o motivo da visita não realizada.');
        }
        await this.db.$transaction([
            this.db.visit.update({
                where: { id },
                data: {
                    status: input.status,
                    finishedAt: new Date(),
                    notes: input.notes ?? visit.notes,
                    statusReason: input.reason ?? null,
                    latitudeAtFinish: input.latitude ?? null,
                    longitudeAtFinish: input.longitude ?? null,
                    accuracyAtFinish: input.accuracy ?? null,
                },
            }),
            this.db.visitActivity.create({
                data: {
                    visitId: id,
                    userId: user.id,
                    type: 'STATUS_CHANGE',
                    description: input.status === 'COMPLETED'
                        ? 'Visita concluída'
                        : `Visita não realizada: ${input.reason}`,
                },
            }),
        ]);
        if (visit.routeId)
            await this.routes.syncStatus(visit.routeId);
        void this.audit.log({
            userId: user.id,
            entity: 'visit',
            entityId: id,
            action: 'visit.finish',
            metadata: { status: input.status },
        });
        return { visit: await this.detail(id, user), warning: null };
    }
    /**
     * Edição da visita — inclusive depois de finalizada (esqueceu algo? corrige aqui):
     * observações, resultado (concluída ⇄ não realizada), motivo e horários de início/fim.
     * Fotos, atividades e despesas continuam podendo ser adicionadas. Tudo fica no histórico.
     */
    async update(id, input, user) {
        const visit = await this.findAccessible(id, user);
        const data = {};
        const changes = [];
        const closed = visit.status === 'COMPLETED' || visit.status === 'NOT_COMPLETED';
        if (input.notes !== undefined && (input.notes ?? null) !== (visit.notes ?? null)) {
            data.notes = input.notes;
            changes.push('observações');
        }
        if (input.status && input.status !== visit.status) {
            const allowed = {
                PENDING: ['IN_PROGRESS', 'BLOCKED', 'CANCELLED', 'NOT_COMPLETED'],
                CANCELLED: ['PENDING', 'BLOCKED'],
                BLOCKED: ['PENDING'],
                // correção do resultado de uma visita já finalizada
                COMPLETED: ['NOT_COMPLETED'],
                NOT_COMPLETED: ['COMPLETED'],
            };
            if (!allowed[input.status]?.includes(visit.status)) {
                throw new common_1.ConflictException(`Não é possível mudar de "${types_1.VISIT_STATUS_LABEL[visit.status]}" para "${types_1.VISIT_STATUS_LABEL[input.status]}". Use iniciar, finalizar ou reagendar.`);
            }
            data.status = input.status;
            data.statusReason =
                input.status === 'COMPLETED' ? null : (input.statusReason ?? visit.statusReason ?? null);
            if (input.status === 'PENDING') {
                data.startedAt = null;
                data.finishedAt = null;
            }
            changes.push(`resultado: ${types_1.VISIT_STATUS_LABEL[visit.status]} → ${types_1.VISIT_STATUS_LABEL[input.status]}`);
        }
        else if (input.statusReason !== undefined &&
            (input.statusReason ?? null) !== (visit.statusReason ?? null)) {
            data.statusReason = input.statusReason;
            changes.push('motivo');
        }
        let startedAt = visit.startedAt;
        let finishedAt = visit.finishedAt;
        if (input.startedAt !== undefined) {
            if (!closed && visit.status !== 'IN_PROGRESS') {
                throw new common_1.ConflictException('O horário de início só pode ser ajustado em visitas iniciadas ou finalizadas.');
            }
            const value = input.startedAt ? new Date(input.startedAt) : null;
            if ((value?.getTime() ?? null) !== (visit.startedAt?.getTime() ?? null)) {
                startedAt = value;
                data.startedAt = value;
                changes.push('horário de início');
            }
        }
        if (input.finishedAt !== undefined) {
            if (!closed)
                throw new common_1.ConflictException('O horário de término só pode ser ajustado em visitas finalizadas.');
            const value = input.finishedAt ? new Date(input.finishedAt) : null;
            if ((value?.getTime() ?? null) !== (visit.finishedAt?.getTime() ?? null)) {
                finishedAt = value;
                data.finishedAt = value;
                changes.push('horário de término');
            }
        }
        if (startedAt && finishedAt && startedAt > finishedAt) {
            throw new common_1.BadRequestException('O término precisa ser depois do início.');
        }
        if (changes.length === 0)
            return this.detail(id, user);
        await this.db.visit.update({ where: { id }, data });
        await this.db.visitActivity.create({
            data: {
                visitId: id,
                userId: user.id,
                type: data.status ? 'STATUS_CHANGE' : 'SYSTEM',
                description: `Visita editada${closed ? ' após a finalização' : ''}: ${changes.join(', ')}`,
            },
        });
        if (data.status && visit.routeId)
            await this.routes.syncStatus(visit.routeId);
        void this.audit.log({
            userId: user.id,
            entity: 'visit',
            entityId: id,
            action: 'visit.update',
            metadata: {
                changes,
                before: {
                    status: visit.status,
                    notes: visit.notes,
                    startedAt: visit.startedAt,
                    finishedAt: visit.finishedAt,
                },
                after: input,
            },
        });
        return this.detail(id, user);
    }
    async addActivity(id, input, user) {
        await this.findAccessible(id, user);
        await this.db.visitActivity.create({
            data: { visitId: id, userId: user.id, type: input.type, description: input.description },
        });
        void this.audit.log({
            userId: user.id,
            entity: 'visit',
            entityId: id,
            action: input.type === 'NOTE' ? 'visit.note' : 'visit.activity',
        });
        return this.detail(id, user);
    }
    async reschedule(id, input, user) {
        const visit = await this.findAccessible(id, user);
        if (['COMPLETED', 'RESCHEDULED', 'CANCELLED'].includes(visit.status))
            throw new common_1.ConflictException('Esta visita não pode ser reagendada.');
        if (input.date === (0, serialize_1.isoDate)(visit.scheduledDate))
            throw new common_1.BadRequestException('Escolha uma data diferente da atual.');
        if (input.date < (0, types_1.todayIso)(this.config.timeZone))
            throw new common_1.BadRequestException('Reagende para hoje ou uma data futura.');
        const created = await this.routes.addStoreToDate(visit.employeeId, input.date, visit.storeId, {
            rescheduledFromId: visit.id,
            notes: visit.notes,
        });
        const reason = input.reason ?? `Reagendada para ${(0, types_1.formatDateBR)(input.date)}`;
        await this.db.$transaction([
            this.db.visit.update({
                where: { id },
                data: { status: 'RESCHEDULED', statusReason: reason },
            }),
            this.db.visitActivity.create({
                data: { visitId: id, userId: user.id, type: 'STATUS_CHANGE', description: reason },
            }),
            this.db.visitActivity.create({
                data: {
                    visitId: created.id,
                    userId: user.id,
                    type: 'SYSTEM',
                    description: `Reagendada de ${(0, types_1.formatDateBR)((0, serialize_1.isoDate)(visit.scheduledDate))}`,
                },
            }),
        ]);
        if (visit.routeId)
            await this.routes.syncStatus(visit.routeId);
        void this.audit.log({
            userId: user.id,
            entity: 'visit',
            entityId: id,
            action: 'visit.reschedule',
            metadata: { to: input.date, newVisitId: created.id },
        });
        return this.detail(created.id, user);
    }
};
exports.VisitsService = VisitsService;
exports.VisitsService = VisitsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_module_1.DB)),
    __param(1, (0, common_1.Inject)(env_1.APP_CONFIG)),
    __metadata("design:paramtypes", [Object, Object, authorizations_service_1.AuthorizationsService,
        settings_service_1.SettingsService,
        routes_service_1.RoutesService,
        storage_service_1.StorageService,
        audit_service_1.AuditService])
], VisitsService);
//# sourceMappingURL=visits.service.js.map