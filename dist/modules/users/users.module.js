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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersModule = exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const sharp_1 = __importDefault(require("sharp"));
const types_1 = require("@routeflow/types");
const env_1 = require("../../config/env");
const database_module_1 = require("../../database/database.module");
const decorators_1 = require("../../common/decorators");
const auth_user_1 = require("../../common/auth-user");
const zod_pipe_1 = require("../../common/zod.pipe");
const audit_service_1 = require("../audit/audit.service");
const auth_module_1 = require("../auth/auth.module");
const auth_service_1 = require("../auth/auth.service");
const password_1 = require("../auth/password");
const storage_service_1 = require("../storage/storage.service");
const uploads_1 = require("../../common/uploads");
const AVATAR_SIZE = 384;
/**
 * Perfil do próprio usuário (todos) e gestão de usuários (somente ADMIN).
 * Papéis: ADMIN (tudo, inclusive usuários e configurações), MANAGER (acompanha toda a
 * operação, relatórios e links públicos) e EMPLOYEE (opera o próprio dia: agenda, rotas,
 * visitas, fotos, despesas, lojas e cartas).
 */
let UsersController = class UsersController {
    constructor(db, config, auth, audit, storage) {
        this.db = db;
        this.config = config;
        this.auth = auth;
        this.audit = audit;
        this.storage = storage;
    }
    async list() {
        const users = await this.db.user.findMany({ orderBy: [{ active: 'desc' }, { name: 'asc' }] });
        return users.map((u) => (0, auth_service_1.toUserDto)(u, this.auth.signAvatar));
    }
    async me(user) {
        return (0, auth_service_1.toUserDto)(await this.db.user.findUniqueOrThrow({ where: { id: user.id } }), this.auth.signAvatar);
    }
    async updateMe(user, body) {
        const updated = await this.db.user.update({
            where: { id: user.id },
            data: { name: body.name },
        });
        void this.audit.log({
            userId: user.id,
            entity: 'user',
            entityId: user.id,
            action: 'user.update_profile',
        });
        return (0, auth_service_1.toUserDto)(updated, this.auth.signAvatar);
    }
    async changePassword(user, body, req) {
        const current = req.cookies?.[auth_module_1.REFRESH_COOKIE];
        await this.auth.changePassword(user.id, body.currentPassword, body.newPassword, current ? (0, password_1.sha256)(current) : undefined);
        void this.audit.log({
            userId: user.id,
            entity: 'user',
            entityId: user.id,
            action: 'user.change_password',
            ...(0, auth_user_1.requestMeta)(req),
        });
    }
    /**
     * Foto de perfil: valida o tipo real do arquivo, corrige a orientação, recorta em quadrado
     * priorizando a área de interesse (rosto), reduz para 384×384, converte para WebP e remove
     * metadados (inclusive GPS). A foto anterior é apagada.
     */
    async uploadAvatar(file, user) {
        if (!file)
            throw new common_1.BadRequestException('Selecione uma imagem.');
        if (!(0, uploads_1.detectImageKind)(file.buffer)) {
            throw new common_1.UnsupportedMediaTypeException('Envie uma imagem JPG, PNG, WebP ou AVIF.');
        }
        let optimized;
        try {
            optimized = await (0, sharp_1.default)(file.buffer, { failOn: 'none', limitInputPixels: 100_000_000 })
                .rotate()
                .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover', position: sharp_1.default.strategy.attention })
                .webp({ quality: 82 })
                .toBuffer();
        }
        catch {
            throw new common_1.UnsupportedMediaTypeException('Não foi possível ler esta imagem. Tente outra foto (JPG ou PNG).');
        }
        const key = `avatars/${user.id}/${(0, node_crypto_1.randomUUID)()}.webp`;
        await this.storage.put(key, optimized);
        const previous = await this.db.user.findUniqueOrThrow({
            where: { id: user.id },
            select: { avatarKey: true },
        });
        const updated = await this.db.user.update({
            where: { id: user.id },
            data: { avatarKey: key, avatarUpdatedAt: new Date() },
        });
        if (previous.avatarKey)
            await this.storage.delete(previous.avatarKey).catch(() => undefined);
        void this.audit.log({
            userId: user.id,
            entity: 'user',
            entityId: user.id,
            action: 'user.avatar_update',
            metadata: { originalSize: file.size, optimizedSize: optimized.length },
        });
        return (0, auth_service_1.toUserDto)(updated, this.auth.signAvatar);
    }
    async removeAvatar(user) {
        const previous = await this.db.user.findUniqueOrThrow({
            where: { id: user.id },
            select: { avatarKey: true },
        });
        const updated = await this.db.user.update({
            where: { id: user.id },
            data: { avatarKey: null, avatarUpdatedAt: new Date() },
        });
        if (previous.avatarKey)
            await this.storage.delete(previous.avatarKey).catch(() => undefined);
        void this.audit.log({
            userId: user.id,
            entity: 'user',
            entityId: user.id,
            action: 'user.avatar_remove',
        });
        return (0, auth_service_1.toUserDto)(updated, this.auth.signAvatar);
    }
    async create(body, actor) {
        const exists = await this.db.user.findUnique({ where: { email: body.email } });
        if (exists)
            throw new common_1.ConflictException('Já existe um usuário com este e-mail.');
        const created = await this.db.user.create({
            data: {
                name: body.name,
                email: body.email,
                role: body.role,
                passwordHash: await (0, password_1.hashPassword)(body.password),
            },
        });
        void this.audit.log({
            userId: actor.id,
            entity: 'user',
            entityId: created.id,
            action: 'user.create',
            metadata: { email: created.email, role: created.role },
        });
        return (0, auth_service_1.toUserDto)(created, this.auth.signAvatar);
    }
    async revokeSessions(userId) {
        await this.db.refreshToken.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() },
        });
    }
    async update(id, body, actor) {
        const target = await this.db.user.findUnique({ where: { id } });
        if (!target)
            throw new common_1.NotFoundException('Usuário não encontrado.');
        if (body.email && body.email !== target.email) {
            const taken = await this.db.user.findUnique({
                where: { email: body.email },
                select: { id: true },
            });
            if (taken)
                throw new common_1.ConflictException('Já existe um usuário com este e-mail.');
        }
        const losesAdmin = (body.role !== undefined && body.role !== 'ADMIN') || body.active === false;
        if (id === actor.id && losesAdmin) {
            throw new common_1.BadRequestException('Você não pode remover o seu próprio acesso de administrador.');
        }
        if (target.role === 'ADMIN' && target.active && losesAdmin) {
            const others = await this.db.user.count({
                where: { role: 'ADMIN', active: true, id: { not: id } },
            });
            if (others === 0)
                throw new common_1.BadRequestException('É preciso manter ao menos um administrador ativo.');
        }
        const updated = await this.db.user.update({
            where: { id },
            data: {
                ...(body.name !== undefined ? { name: body.name } : {}),
                ...(body.email !== undefined ? { email: body.email } : {}),
                ...(body.role !== undefined ? { role: body.role } : {}),
                ...(body.active !== undefined ? { active: body.active } : {}),
            },
        });
        if (body.active === false || (body.role !== undefined && body.role !== target.role))
            await this.revokeSessions(id);
        void this.audit.log({
            userId: actor.id,
            entity: 'user',
            entityId: id,
            action: 'user.update',
            metadata: body,
        });
        return (0, auth_service_1.toUserDto)(updated, this.auth.signAvatar);
    }
    async resetPassword(id, body, actor) {
        const target = await this.db.user.findUnique({ where: { id }, select: { id: true } });
        if (!target)
            throw new common_1.NotFoundException('Usuário não encontrado.');
        await this.db.user.update({
            where: { id },
            data: { passwordHash: await (0, password_1.hashPassword)(body.password) },
        });
        await this.revokeSessions(id);
        void this.audit.log({
            userId: actor.id,
            entity: 'user',
            entityId: id,
            action: 'user.reset_password',
        });
    }
    /**
     * Transfere a programação de um usuário para outro (ex.: a planilha foi importada no
     * administrador e quem visita as lojas é a Maria): rotas e visitas (a partir de hoje,
     * ou todas), roteiros e o endereço de casa. Datas em que o destino já tem rota são mantidas.
     */
    async transferOperation(id, body, actor) {
        if (id === body.fromUserId)
            throw new common_1.BadRequestException('Escolha usuários diferentes.');
        const [from, to] = await Promise.all([
            this.db.user.findUnique({ where: { id: body.fromUserId }, select: { id: true } }),
            this.db.user.findUnique({ where: { id }, select: { id: true, active: true } }),
        ]);
        if (!from || !to)
            throw new common_1.NotFoundException('Usuário não encontrado.');
        if (!to.active)
            throw new common_1.BadRequestException('O usuário de destino está desativado.');
        const minDate = body.includePast ? undefined : (0, types_1.isoToUtcDate)((0, types_1.todayIso)(this.config.timeZone));
        const result = await this.db.$transaction(async (tx) => {
            const routes = await tx.route.findMany({
                where: { employeeId: from.id, ...(minDate ? { date: { gte: minDate } } : {}) },
                select: { id: true, date: true },
            });
            const taken = new Set((await tx.route.findMany({
                where: { employeeId: to.id, date: { in: routes.map((r) => r.date) } },
                select: { date: true },
            })).map((r) => r.date.getTime()));
            const movable = routes.filter((r) => !taken.has(r.date.getTime())).map((r) => r.id);
            if (movable.length) {
                await tx.route.updateMany({ where: { id: { in: movable } }, data: { employeeId: to.id } });
            }
            const visits = await tx.visit.updateMany({
                where: {
                    employeeId: from.id,
                    OR: [
                        { routeId: { in: movable } },
                        { routeId: null, ...(minDate ? { scheduledDate: { gte: minDate } } : {}) },
                    ],
                },
                data: { employeeId: to.id },
            });
            const targetTemplates = await tx.routeTemplate.count({ where: { employeeId: to.id } });
            const templates = targetTemplates === 0
                ? await tx.routeTemplate.updateMany({
                    where: { employeeId: from.id },
                    data: { employeeId: to.id },
                })
                : { count: 0 };
            const [home, targetHome] = await Promise.all([
                tx.homeAddress.findFirst({
                    where: { employeeId: from.id, active: true },
                    orderBy: { createdAt: 'desc' },
                }),
                tx.homeAddress.findFirst({ where: { employeeId: to.id, active: true } }),
            ]);
            let homeAddressCopied = false;
            if (home && !targetHome) {
                await tx.homeAddress.create({
                    data: {
                        employeeId: to.id,
                        label: home.label,
                        address: home.address,
                        latitude: home.latitude,
                        longitude: home.longitude,
                        active: true,
                    },
                });
                homeAddressCopied = true;
            }
            return {
                routes: movable.length,
                skippedRoutes: routes.length - movable.length,
                visits: visits.count,
                templates: templates.count,
                templatesKept: targetTemplates > 0,
                homeAddressCopied,
            };
        });
        void this.audit.log({
            userId: actor.id,
            entity: 'user',
            entityId: id,
            action: 'user.transfer_operation',
            metadata: { fromUserId: body.fromUserId, includePast: body.includePast, ...result },
        });
        return result;
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Get)(),
    (0, decorators_1.Roles)('MANAGER'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('me'),
    __param(0, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "me", null);
__decorate([
    (0, common_1.Patch)('me'),
    __param(0, (0, decorators_1.CurrentUser)()),
    __param(1, (0, common_1.Body)(new zod_pipe_1.ZodPipe(types_1.profileUpdateSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateMe", null);
__decorate([
    (0, common_1.Post)('me/password'),
    (0, common_1.HttpCode)(204),
    __param(0, (0, decorators_1.CurrentUser)()),
    __param(1, (0, common_1.Body)(new zod_pipe_1.ZodPipe(types_1.changePasswordSchema))),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "changePassword", null);
__decorate([
    (0, common_1.Post)('me/avatar'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.memoryStorage)(),
        limits: { fileSize: 15 * 1024 * 1024, files: 1 },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "uploadAvatar", null);
__decorate([
    (0, common_1.Delete)('me/avatar'),
    __param(0, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "removeAvatar", null);
__decorate([
    (0, common_1.Post)(),
    (0, decorators_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Body)(new zod_pipe_1.ZodPipe(types_1.userCreateSchema))),
    __param(1, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, decorators_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)(new zod_pipe_1.ZodPipe(types_1.userUpdateSchema))),
    __param(2, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/password'),
    (0, decorators_1.Roles)('ADMIN'),
    (0, common_1.HttpCode)(204),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)(new zod_pipe_1.ZodPipe(types_1.userPasswordResetSchema))),
    __param(2, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "resetPassword", null);
__decorate([
    (0, common_1.Post)(':id/transfer-operation'),
    (0, decorators_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)(new zod_pipe_1.ZodPipe(types_1.transferOperationSchema))),
    __param(2, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "transferOperation", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)('users'),
    __param(0, (0, common_1.Inject)(database_module_1.DB)),
    __param(1, (0, common_1.Inject)(env_1.APP_CONFIG)),
    __metadata("design:paramtypes", [Object, Object, auth_service_1.AuthService,
        audit_service_1.AuditService,
        storage_service_1.StorageService])
], UsersController);
let UsersModule = class UsersModule {
};
exports.UsersModule = UsersModule;
exports.UsersModule = UsersModule = __decorate([
    (0, common_1.Module)({ imports: [auth_module_1.AuthModule], controllers: [UsersController] })
], UsersModule);
//# sourceMappingURL=users.module.js.map