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
exports.SharedAccessModule = exports.PublicController = exports.SharedAccessController = exports.SharedAccessService = void 0;
exports.encryptToken = encryptToken;
exports.decryptToken = decryptToken;
const node_crypto_1 = require("node:crypto");
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const zod_1 = require("zod");
const types_1 = require("@routeflow/types");
const env_1 = require("../../config/env");
const database_module_1 = require("../../database/database.module");
const decorators_1 = require("../../common/decorators");
const serialize_1 = require("../../common/serialize");
const zod_pipe_1 = require("../../common/zod.pipe");
const audit_service_1 = require("../audit/audit.service");
const authorizations_service_1 = require("../authorizations/authorizations.service");
const password_1 = require("../auth/password");
const dashboard_module_1 = require("../dashboard/dashboard.module");
const dashboard_service_1 = require("../dashboard/dashboard.service");
const expenses_service_1 = require("../expenses/expenses.service");
const settings_service_1 = require("../settings/settings.service");
const visits_module_1 = require("../visits/visits.module");
const visits_service_1 = require("../visits/visits.service");
/** Cifra o token (AES-256-GCM) para permitir copiar o link novamente; a validação usa só o hash. */
function linkKey(secret) {
    return (0, node_crypto_1.createHash)('sha256').update(`${secret}:shared-links`).digest();
}
function encryptToken(token, secret) {
    const iv = (0, node_crypto_1.randomBytes)(12);
    const cipher = (0, node_crypto_1.createCipheriv)('aes-256-gcm', linkKey(secret), iv);
    const data = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
    return [iv, cipher.getAuthTag(), data].map((b) => b.toString('base64url')).join('.');
}
function decryptToken(value, secret) {
    if (!value)
        return null;
    try {
        const [iv, tag, data] = value.split('.').map((p) => Buffer.from(p, 'base64url'));
        const decipher = (0, node_crypto_1.createDecipheriv)('aes-256-gcm', linkKey(secret), iv);
        decipher.setAuthTag(tag);
        return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
    }
    catch {
        return null;
    }
}
/** Visualizador somente leitura usado internamente pelas rotas públicas. */
const PUBLIC_VIEWER = {
    id: '00000000-0000-0000-0000-000000000000',
    name: 'Painel público',
    email: '',
    role: 'MANAGER',
};
function toDto(row, url = null) {
    return {
        id: row.id,
        label: row.label,
        tokenPreview: row.tokenPreview,
        url,
        scope: row.scope
            .split(',')
            .filter((s) => types_1.SHARED_SCOPES.includes(s)),
        // Links públicos não expiram (campo mantido só por compatibilidade)
        expiresAt: null,
        active: row.active && !row.revokedAt,
        revokedAt: row.revokedAt ? (0, serialize_1.isoInstant)(row.revokedAt) : null,
        lastAccessAt: row.lastAccessAt ? (0, serialize_1.isoInstant)(row.lastAccessAt) : null,
        accessCount: row.accessCount,
        createdAt: (0, serialize_1.isoInstant)(row.createdAt),
    };
}
let SharedAccessService = class SharedAccessService {
    constructor(db, config) {
        this.db = db;
        this.config = config;
    }
    publicUrl(row) {
        if (row.revokedAt)
            return null;
        const token = decryptToken(row.tokenEncrypted, this.config.auth.jwtSecret);
        return token ? `${this.config.appUrl}/public/dashboard/${token}` : null;
    }
    async list() {
        const rows = await this.db.sharedAccess.findMany({ orderBy: { createdAt: 'desc' } });
        return rows.map((row) => toDto(row, this.publicUrl(row)));
    }
    /** Token de 256 bits; o banco guarda o hash (validação) e uma cópia cifrada (para copiar o link de novo). */
    async create(input, user) {
        const token = (0, password_1.randomToken)(32);
        const row = await this.db.sharedAccess.create({
            data: {
                label: input.label,
                tokenHash: (0, password_1.sha256)(token),
                tokenPreview: token.slice(0, 6),
                scope: [...new Set(input.scope)].join(','),
                tokenEncrypted: encryptToken(token, this.config.auth.jwtSecret),
                createdById: user.id,
            },
        });
        const url = `${this.config.appUrl}/public/dashboard/${token}`;
        return { ...toDto(row, url), token, url };
    }
    /** Desativa/reativa (reversível), renomeia ou ajusta o que o link exibe. Revogados não voltam. */
    async update(id, input) {
        const current = await this.db.sharedAccess.findUnique({ where: { id } });
        if (!current)
            throw new common_1.NotFoundException('Link não encontrado.');
        if (current.revokedAt && input.active) {
            throw new common_1.BadRequestException('Este link foi revogado e não pode ser reativado. Crie um novo link.');
        }
        const row = await this.db.sharedAccess.update({
            where: { id },
            data: {
                ...(input.label !== undefined ? { label: input.label } : {}),
                ...(input.active !== undefined ? { active: input.active } : {}),
                ...(input.scope ? { scope: [...new Set(input.scope)].join(',') } : {}),
                expiresAt: null,
            },
        });
        return toDto(row, this.publicUrl(row));
    }
    async revoke(id) {
        const exists = await this.db.sharedAccess.findUnique({ where: { id } });
        if (!exists)
            throw new common_1.NotFoundException('Link não encontrado.');
        return toDto(await this.db.sharedAccess.update({
            where: { id },
            data: { active: false, revokedAt: new Date() },
        }));
    }
    /** Valida o token; links revogados, expirados ou inexistentes respondem 404. */
    async resolve(token, scope) {
        if (!/^[A-Za-z0-9_-]{20,100}$/.test(token))
            throw new common_1.NotFoundException('Link inválido ou expirado.');
        const row = await this.db.sharedAccess.findUnique({ where: { tokenHash: (0, password_1.sha256)(token) } });
        if (!row || !row.active || row.revokedAt) {
            throw new common_1.NotFoundException('Link inválido ou expirado.');
        }
        const dto = toDto(row);
        if (scope && !dto.scope.includes(scope))
            throw new common_1.NotFoundException('Este link não permite visualizar esta informação.');
        if (!row.lastAccessAt || Date.now() - row.lastAccessAt.getTime() > 60_000) {
            await this.db.sharedAccess.update({
                where: { id: row.id },
                data: { lastAccessAt: new Date(), accessCount: { increment: 1 } },
            });
        }
        return dto;
    }
};
exports.SharedAccessService = SharedAccessService;
exports.SharedAccessService = SharedAccessService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_module_1.DB)),
    __param(1, (0, common_1.Inject)(env_1.APP_CONFIG)),
    __metadata("design:paramtypes", [Object, Object])
], SharedAccessService);
let SharedAccessController = class SharedAccessController {
    constructor(shared, audit) {
        this.shared = shared;
        this.audit = audit;
    }
    list() {
        return this.shared.list();
    }
    async create(body, user) {
        const created = await this.shared.create(body, user);
        void this.audit.log({
            userId: user.id,
            entity: 'shared_access',
            entityId: created.id,
            action: 'shared_access.create',
            metadata: { label: body.label, scope: body.scope },
        });
        return created;
    }
    async update(id, body, user) {
        const result = await this.shared.update(id, body);
        void this.audit.log({
            userId: user.id,
            entity: 'shared_access',
            entityId: id,
            action: body.active === false
                ? 'shared_access.deactivate'
                : body.active
                    ? 'shared_access.activate'
                    : 'shared_access.update',
            metadata: body,
        });
        return result;
    }
    async revoke(id, user) {
        const result = await this.shared.revoke(id);
        void this.audit.log({
            userId: user.id,
            entity: 'shared_access',
            entityId: id,
            action: 'shared_access.revoke',
        });
        return result;
    }
};
exports.SharedAccessController = SharedAccessController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SharedAccessController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)(new zod_pipe_1.ZodPipe(types_1.sharedAccessCreateSchema))),
    __param(1, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SharedAccessController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)(new zod_pipe_1.ZodPipe(types_1.sharedAccessUpdateSchema))),
    __param(2, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], SharedAccessController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/revoke'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SharedAccessController.prototype, "revoke", null);
exports.SharedAccessController = SharedAccessController = __decorate([
    (0, common_1.Controller)('shared-access'),
    (0, decorators_1.Roles)('MANAGER'),
    __metadata("design:paramtypes", [SharedAccessService,
        audit_service_1.AuditService])
], SharedAccessController);
const periodQuery = zod_1.z.object({ from: types_1.isoDateSchema.optional(), to: types_1.isoDateSchema.optional() });
const pagedPeriodQuery = types_1.paginationQuerySchema.extend({
    from: types_1.isoDateSchema.optional(),
    to: types_1.isoDateSchema.optional(),
});
/** Painel do empregador/gestor: SOMENTE LEITURA, via token seguro e revogável. */
let PublicController = class PublicController {
    constructor(db, config, shared, dashboard, visits, letters, expenses, settings) {
        this.db = db;
        this.config = config;
        this.shared = shared;
        this.dashboard = dashboard;
        this.visits = visits;
        this.letters = letters;
        this.expenses = expenses;
        this.settings = settings;
    }
    period(query) {
        const today = (0, types_1.todayIso)(this.config.timeZone);
        return { from: query.from ?? (0, types_1.startOfMonthIso)(today), to: query.to ?? (0, types_1.endOfMonthIso)(today) };
    }
    async panel(token, query) {
        const access = await this.shared.resolve(token);
        const { from, to } = this.period(query);
        const [metrics, settings, recent] = await Promise.all([
            this.dashboard.metrics(from, to),
            this.settings.get(),
            access.scope.includes('visits')
                ? this.visits.list({
                    from,
                    to,
                    page: 1,
                    pageSize: 30,
                    status: ['COMPLETED', 'NOT_COMPLETED', 'IN_PROGRESS'],
                }, PUBLIC_VIEWER)
                : null,
        ]);
        const recentVisits = (recent?.items ?? [])
            .sort((a, b) => (b.finishedAt ?? b.startedAt ?? '').localeCompare(a.finishedAt ?? a.startedAt ?? ''))
            .slice(0, 12);
        return {
            label: access.label,
            scope: access.scope,
            expiresAt: access.expiresAt,
            generatedAt: new Date().toISOString(),
            companyName: settings.companyName,
            metrics: access.scope.includes('expenses')
                ? metrics
                : { ...metrics, expenses: { total: 0, perVisit: null, byType: [] } },
            recentVisits,
        };
    }
    async visitsList(token, query) {
        await this.shared.resolve(token, 'visits');
        const { from, to } = this.period(query);
        return this.visits.list({ from, to, page: query.page, pageSize: query.pageSize }, PUBLIC_VIEWER);
    }
    async visitDetail(token, id) {
        const access = await this.shared.resolve(token, 'visits');
        const visit = await this.visits.detail(id, PUBLIC_VIEWER);
        return {
            ...visit,
            photos: access.scope.includes('photos') ? visit.photos : [],
            letters: access.scope.includes('authorizations') ? visit.letters : [],
            expenses: access.scope.includes('expenses') ? visit.expenses : [],
            activityPresets: [],
        };
    }
    async authorizations(token) {
        await this.shared.resolve(token, 'authorizations');
        return this.letters.list({});
    }
    async expenseList(token, query) {
        await this.shared.resolve(token, 'expenses');
        const { from, to } = this.period(query);
        return this.expenses.list({ from, to, page: query.page, pageSize: query.pageSize }, null);
    }
    async routes(token, query) {
        await this.shared.resolve(token, 'routes');
        const { from, to } = this.period(query);
        const rows = await this.db.route.findMany({
            where: { date: { gte: (0, types_1.isoToUtcDate)(from), lte: (0, types_1.isoToUtcDate)(to) } },
            include: {
                employee: { select: { id: true, name: true } },
                stops: {
                    orderBy: { order: 'asc' },
                    include: {
                        store: { select: { code: true, name: true, neighborhood: true } },
                        visit: { select: { status: true } },
                    },
                },
            },
            orderBy: { date: 'asc' },
        });
        return rows.map((r) => ({
            id: r.id,
            date: (0, serialize_1.isoDate)(r.date),
            status: r.status,
            region: r.region,
            employee: r.employee,
            estimatedDistance: r.estimatedDistance,
            estimatedDuration: r.estimatedDuration,
            estimatedTransportCost: (0, serialize_1.moneyOrNull)(r.estimatedTransportCost),
            actualTransportCost: (0, serialize_1.moneyOrNull)(r.actualTransportCost),
            stops: r.stops.map((s) => ({
                order: s.order,
                code: s.store.code,
                name: s.store.name,
                neighborhood: s.store.neighborhood,
                status: s.visit?.status ?? null,
            })),
        }));
    }
};
exports.PublicController = PublicController;
__decorate([
    (0, common_1.Get)(':token'),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Query)(new zod_pipe_1.ZodPipe(periodQuery))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PublicController.prototype, "panel", null);
__decorate([
    (0, common_1.Get)(':token/visits'),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Query)(new zod_pipe_1.ZodPipe(pagedPeriodQuery))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PublicController.prototype, "visitsList", null);
__decorate([
    (0, common_1.Get)(':token/visits/:id'),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PublicController.prototype, "visitDetail", null);
__decorate([
    (0, common_1.Get)(':token/authorizations'),
    __param(0, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PublicController.prototype, "authorizations", null);
__decorate([
    (0, common_1.Get)(':token/expenses'),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Query)(new zod_pipe_1.ZodPipe(pagedPeriodQuery))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PublicController.prototype, "expenseList", null);
__decorate([
    (0, common_1.Get)(':token/routes'),
    __param(0, (0, common_1.Param)('token')),
    __param(1, (0, common_1.Query)(new zod_pipe_1.ZodPipe(periodQuery))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PublicController.prototype, "routes", null);
exports.PublicController = PublicController = __decorate([
    (0, common_1.Controller)('public'),
    (0, decorators_1.Public)(),
    (0, throttler_1.Throttle)({ default: { limit: 90, ttl: 60_000 } }),
    __param(0, (0, common_1.Inject)(database_module_1.DB)),
    __param(1, (0, common_1.Inject)(env_1.APP_CONFIG)),
    __metadata("design:paramtypes", [Object, Object, SharedAccessService,
        dashboard_service_1.DashboardService,
        visits_service_1.VisitsService,
        authorizations_service_1.AuthorizationsService,
        expenses_service_1.ExpensesService,
        settings_service_1.SettingsService])
], PublicController);
let SharedAccessModule = class SharedAccessModule {
};
exports.SharedAccessModule = SharedAccessModule;
exports.SharedAccessModule = SharedAccessModule = __decorate([
    (0, common_1.Module)({
        imports: [dashboard_module_1.DashboardModule, visits_module_1.VisitsModule],
        providers: [SharedAccessService],
        controllers: [SharedAccessController, PublicController],
    })
], SharedAccessModule);
//# sourceMappingURL=shared-access.module.js.map