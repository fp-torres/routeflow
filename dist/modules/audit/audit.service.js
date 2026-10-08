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
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("@routeflow/types");
const database_module_1 = require("../../database/database.module");
const serialize_1 = require("../../common/serialize");
/** Trilha de auditoria. Gravações nunca interrompem a operação principal. */
let AuditService = class AuditService {
    constructor(db) {
        this.db = db;
        this.logger = new common_1.Logger('Audit');
        this.pending = new Set();
    }
    log(entry) {
        const write = this.db.auditLog
            .create({
            data: {
                userId: entry.userId ?? null,
                entity: entry.entity,
                entityId: entry.entityId ?? null,
                action: entry.action,
                metadata: entry.metadata === undefined ? null : JSON.stringify(entry.metadata).slice(0, 60_000),
                ipAddress: entry.ipAddress ?? null,
                userAgent: entry.userAgent ?? null,
            },
        })
            .then(() => undefined)
            .catch((error) => this.logger.warn(`Falha ao registrar auditoria (${entry.action}): ${String(error)}`));
        this.pending.add(write);
        void write.finally(() => this.pending.delete(write));
        return write;
    }
    async onApplicationShutdown() {
        await Promise.allSettled([...this.pending]);
    }
    async list(query) {
        const where = {
            ...(query.entity ? { entity: query.entity } : {}),
            ...(query.action ? { action: query.action } : {}),
            ...(query.from || query.to
                ? {
                    createdAt: {
                        ...(query.from ? { gte: (0, types_1.isoToUtcDate)(query.from) } : {}),
                        ...(query.to ? { lt: (0, types_1.isoToUtcDate)((0, types_1.addDaysIso)(query.to, 1)) } : {}),
                    },
                }
                : {}),
        };
        const [total, rows] = await Promise.all([
            this.db.auditLog.count({ where }),
            this.db.auditLog.findMany({
                where,
                include: { user: { select: { id: true, name: true } } },
                orderBy: { createdAt: 'desc' },
                skip: (query.page - 1) * query.pageSize,
                take: query.pageSize,
            }),
        ]);
        return (0, serialize_1.paginate)(rows.map((row) => ({
            id: row.id,
            entity: row.entity,
            entityId: row.entityId,
            action: row.action,
            metadata: (0, serialize_1.safeJsonParse)(row.metadata, null),
            user: row.user,
            ipAddress: row.ipAddress,
            createdAt: (0, serialize_1.isoInstant)(row.createdAt),
        })), total, query.page, query.pageSize);
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_module_1.DB)),
    __metadata("design:paramtypes", [Object])
], AuditService);
//# sourceMappingURL=audit.service.js.map