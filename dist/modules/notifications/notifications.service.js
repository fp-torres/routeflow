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
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const types_1 = require("@routeflow/types");
const env_1 = require("../../config/env");
const database_module_1 = require("../../database/database.module");
const serialize_1 = require("../../common/serialize");
const settings_service_1 = require("../settings/settings.service");
/**
 * Central de notificações internas. Canais futuros (e-mail, push, WhatsApp)
 * podem ser plugados em `deliver()` sem alterar quem gera as notificações.
 */
let NotificationsService = class NotificationsService {
    constructor(db, config, settings) {
        this.db = db;
        this.config = config;
        this.settings = settings;
        this.logger = new common_1.Logger('Notifications');
    }
    onApplicationBootstrap() {
        if (this.config.env === 'test')
            return;
        setTimeout(() => void this.runDailyChecks().catch((e) => this.logger.warn(String(e))), 20_000).unref();
    }
    async createMany(items) {
        if (items.length === 0)
            return 0;
        const result = await this.db.notification.createMany({
            data: items.map((i) => ({
                userId: i.userId,
                type: i.type,
                title: i.title,
                message: i.message,
                link: i.link ?? null,
                dedupeKey: i.dedupeKey ?? null,
            })),
            skipDuplicates: true,
        });
        return result.count;
    }
    async list(userId, unreadOnly) {
        const rows = await this.db.notification.findMany({
            where: { userId, ...(unreadOnly ? { read: false } : {}) },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
        return rows.map((n) => ({
            id: n.id,
            type: n.type,
            title: n.title,
            message: n.message,
            link: n.link,
            read: n.read,
            createdAt: (0, serialize_1.isoInstant)(n.createdAt),
        }));
    }
    unreadCount(userId) {
        return this.db.notification.count({ where: { userId, read: false } });
    }
    async markRead(userId, id) {
        const result = await this.db.notification.updateMany({
            where: { id, userId },
            data: { read: true },
        });
        if (result.count === 0)
            throw new common_1.NotFoundException('Notificação não encontrada.');
    }
    async markAllRead(userId) {
        return (await this.db.notification.updateMany({
            where: { userId, read: false },
            data: { read: true },
        })).count;
    }
    /** Executado diariamente às 7h (horário de Brasília) e alguns segundos após o boot. */
    async runDailyChecks() {
        const today = (0, types_1.todayIso)(this.config.timeZone);
        const thresholds = await this.settings.thresholds();
        const users = await this.db.user.findMany({ where: { active: true }, select: { id: true } });
        const items = [];
        const letters = await this.db.authorizationLetter.findMany({
            where: {
                deletedAt: null,
                status: 'ACTIVE',
                expirationDate: { lte: (0, types_1.isoToUtcDate)((0, types_1.addDaysIso)(today, thresholds.warningDays)) },
            },
            include: { stores: { include: { store: { select: { id: true, code: true, name: true } } } } },
        });
        for (const letter of letters) {
            const expirationDate = (0, serialize_1.isoDateOrNull)(letter.expirationDate);
            const { validity, daysLeft } = (0, types_1.computeLetterValidity)({ status: letter.status, expirationDate }, today, thresholds);
            if (validity !== 'EXPIRED' && validity !== 'CRITICAL' && validity !== 'EXPIRING')
                continue;
            if (validity === 'EXPIRED' && daysLeft != null && daysLeft < -30)
                continue;
            const covered = letter.stores.map((s) => s.store);
            const single = covered.length === 1 ? covered[0] : null;
            const scope = single ? single.code : `${letter.network ?? 'carta'} (${covered.length} lojas)`;
            const names = covered
                .slice(0, 4)
                .map((s) => s.code)
                .join(', ') + (covered.length > 4 ? ` e mais ${covered.length - 4}` : '');
            const type = validity === 'EXPIRED' ? 'AUTHORIZATION_EXPIRED' : 'AUTHORIZATION_EXPIRING';
            for (const user of users) {
                items.push({
                    userId: user.id,
                    type,
                    title: `${validity === 'EXPIRED' ? 'Autorização vencida' : 'Autorização vencendo'} — ${scope}`,
                    message: `"${letter.title}" (${names}). ${(0, types_1.describeDaysLeft)(daysLeft)}.`,
                    link: single ? `/lojas/${single.id}/autorizacoes` : '/autorizacoes',
                    dedupeKey: `auth:${validity}:${letter.id}:${expirationDate}:${user.id}`,
                });
            }
        }
        const visitsToday = await this.db.visit.groupBy({
            by: ['employeeId'],
            where: { scheduledDate: (0, types_1.isoToUtcDate)(today), status: { in: ['PENDING', 'IN_PROGRESS'] } },
            _count: { _all: true },
        });
        for (const row of visitsToday) {
            items.push({
                userId: row.employeeId,
                type: 'VISIT_UPCOMING',
                title: `Você tem ${row._count._all} visita${row._count._all === 1 ? '' : 's'} hoje`,
                message: 'Abra a rota do dia para ver a ordem e os trajetos.',
                link: '/dashboard',
                dedupeKey: `visits-today:${row.employeeId}:${today}`,
            });
        }
        const yesterday = (0, types_1.addDaysIso)(today, -1);
        const leftovers = await this.db.visit.groupBy({
            by: ['employeeId'],
            where: { scheduledDate: (0, types_1.isoToUtcDate)(yesterday), status: { in: ['PENDING', 'IN_PROGRESS'] } },
            _count: { _all: true },
        });
        for (const row of leftovers) {
            items.push({
                userId: row.employeeId,
                type: 'VISIT_PENDING',
                title: `${row._count._all} visita${row._count._all === 1 ? '' : 's'} de ontem sem finalização`,
                message: 'Finalize, marque como não realizada ou reagende para manter o histórico correto.',
                link: `/visitas?date=${yesterday}`,
                dedupeKey: `visits-pending:${row.employeeId}:${yesterday}`,
            });
        }
        await this.db.notification.deleteMany({
            where: { read: true, createdAt: { lt: new Date(Date.now() - 90 * 86_400_000) } },
        });
        const created = await this.createMany(items);
        if (created)
            this.logger.log(`${created} notificação(ões) criada(s).`);
        return created;
    }
};
exports.NotificationsService = NotificationsService;
__decorate([
    (0, schedule_1.Cron)('0 7 * * *', { name: 'routeflow-daily-checks', timeZone: 'America/Sao_Paulo' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NotificationsService.prototype, "runDailyChecks", null);
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_module_1.DB)),
    __param(1, (0, common_1.Inject)(env_1.APP_CONFIG)),
    __metadata("design:paramtypes", [Object, Object, settings_service_1.SettingsService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map