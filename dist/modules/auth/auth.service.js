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
exports.AuthService = void 0;
exports.toUserDto = toUserDto;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const env_1 = require("../../config/env");
const database_module_1 = require("../../database/database.module");
const serialize_1 = require("../../common/serialize");
const audit_service_1 = require("../audit/audit.service");
const storage_service_1 = require("../storage/storage.service");
const password_1 = require("./password");
/** Sessão temporária ("Lembrar acesso" desmarcado): o cookie some ao fechar o navegador e, no servidor, expira após 12 h sem uso. */
const TEMPORARY_SESSION_MS = 12 * 3600 * 1000;
/** Abas abertas juntas (ex.: navegador restaurando a sessão) renovam ao mesmo tempo: tolerância para não derrubar o acesso. */
const CONCURRENT_REFRESH_GRACE_MS = 20_000;
function toUserDto(user, signAvatar) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
        lastLoginAt: user.lastLoginAt ? (0, serialize_1.isoInstant)(user.lastLoginAt) : null,
        createdAt: (0, serialize_1.isoInstant)(user.createdAt),
        avatarUrl: user.avatarKey && signAvatar ? signAvatar(user.avatarKey) : null,
    };
}
/**
 * Autenticação: senha com bcrypt, access token JWT curto e refresh token
 * opaco (somente o hash SHA-256 é salvo), rotacionado a cada uso e com
 * detecção de reutilização (revoga todas as sessões do usuário).
 */
let AuthService = class AuthService {
    constructor(db, config, jwt, audit, storage) {
        this.db = db;
        this.config = config;
        this.jwt = jwt;
        this.audit = audit;
        this.storage = storage;
        // Hash fixo usado para equalizar o tempo de resposta quando o e-mail não existe
        this.dummyHash = (0, password_1.hashPassword)((0, password_1.randomToken)(16));
        /** URL assinada da foto de perfil (a chave muda a cada nova foto, então o cache nunca fica velho). */
        this.signAvatar = (key) => this.storage.signedUrl(key, { fileName: 'avatar.webp' });
    }
    async login(email, password, meta, remember = false) {
        const user = await this.db.user.findUnique({ where: { email: email.toLowerCase() } });
        const valid = user
            ? await (0, password_1.verifyPassword)(password, user.passwordHash)
            : await (0, password_1.verifyPassword)(password, await this.dummyHash);
        if (!user || !valid || !user.active) {
            void this.audit.log({
                userId: user?.id ?? null,
                entity: 'auth',
                action: 'auth.login_failed',
                metadata: { email },
                ...meta,
            });
            throw new common_1.UnauthorizedException('E-mail ou senha incorretos.');
        }
        const updated = await this.db.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });
        void this.audit.log({
            userId: user.id,
            entity: 'auth',
            entityId: user.id,
            action: 'auth.login',
            metadata: { remember },
            ...meta,
        });
        return this.issueSession(updated, meta, { persistent: remember });
    }
    async issueSession(user, meta, { persistent, replacing }) {
        const refreshToken = (0, password_1.randomToken)();
        const refreshExpiresAt = new Date(Date.now() +
            (persistent ? this.config.auth.refreshTtlDays * 86_400_000 : TEMPORARY_SESSION_MS));
        const created = await this.db.refreshToken.create({
            data: {
                userId: user.id,
                tokenHash: (0, password_1.sha256)(refreshToken),
                expiresAt: refreshExpiresAt,
                persistent,
                userAgent: meta.userAgent,
                ipAddress: meta.ipAddress,
            },
        });
        if (replacing) {
            await this.db.refreshToken.update({
                where: { id: replacing },
                data: { revokedAt: new Date(), replacedById: created.id },
            });
        }
        const accessToken = await this.jwt.signAsync({
            sub: user.id,
            role: user.role,
            name: user.name,
        });
        return {
            accessToken,
            expiresIn: this.config.auth.accessTtlSeconds,
            user: toUserDto(user, this.signAvatar),
            refreshToken,
            refreshExpiresAt,
            persistent,
        };
    }
    async refresh(rawToken, meta) {
        if (!rawToken)
            throw new common_1.UnauthorizedException('Sessão expirada. Entre novamente.');
        const stored = await this.db.refreshToken.findUnique({
            where: { tokenHash: (0, password_1.sha256)(rawToken) },
            include: { user: true },
        });
        if (!stored)
            throw new common_1.UnauthorizedException('Sessão expirada. Entre novamente.');
        if (stored.revokedAt && stored.replacedById) {
            const concurrent = Date.now() - stored.revokedAt.getTime() < CONCURRENT_REFRESH_GRACE_MS;
            if (concurrent && stored.user.active && stored.expiresAt > new Date()) {
                // outra aba acabou de renovar com o mesmo token: nova sessão, sem derrubar as demais
                return this.issueSession(stored.user, meta, { persistent: stored.persistent });
            }
            // Reuso de token já rotacionado: possível vazamento -> encerra todas as sessões
            await this.db.refreshToken.updateMany({
                where: { userId: stored.userId, revokedAt: null },
                data: { revokedAt: new Date() },
            });
            void this.audit.log({
                userId: stored.userId,
                entity: 'auth',
                action: 'auth.refresh_reuse_detected',
                ...meta,
            });
            throw new common_1.UnauthorizedException('Sessão encerrada por segurança. Entre novamente.');
        }
        // Encerrada por "Sair", troca de senha ou administrador: apenas pede login
        if (stored.revokedAt)
            throw new common_1.UnauthorizedException('Sessão encerrada. Entre novamente.');
        if (stored.expiresAt < new Date() || !stored.user.active)
            throw new common_1.UnauthorizedException('Sessão expirada. Entre novamente.');
        return this.issueSession(stored.user, meta, {
            persistent: stored.persistent,
            replacing: stored.id,
        });
    }
    async logout(rawToken, meta) {
        if (!rawToken)
            return;
        const stored = await this.db.refreshToken.findUnique({
            where: { tokenHash: (0, password_1.sha256)(rawToken) },
        });
        if (!stored)
            return;
        await this.db.refreshToken.update({
            where: { id: stored.id },
            data: { revokedAt: stored.revokedAt ?? new Date() },
        });
        void this.audit.log({ userId: stored.userId, entity: 'auth', action: 'auth.logout', ...meta });
    }
    async changePassword(userId, currentPassword, newPassword, keepTokenHash) {
        const user = await this.db.user.findUniqueOrThrow({ where: { id: userId } });
        if (!(await (0, password_1.verifyPassword)(currentPassword, user.passwordHash))) {
            throw new common_1.UnauthorizedException('A senha atual está incorreta.');
        }
        await this.db.user.update({
            where: { id: userId },
            data: { passwordHash: await (0, password_1.hashPassword)(newPassword) },
        });
        await this.db.refreshToken.updateMany({
            where: {
                userId,
                revokedAt: null,
                ...(keepTokenHash ? { NOT: { tokenHash: keepTokenHash } } : {}),
            },
            data: { revokedAt: new Date() },
        });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_module_1.DB)),
    __param(1, (0, common_1.Inject)(env_1.APP_CONFIG)),
    __metadata("design:paramtypes", [Object, Object, jwt_1.JwtService,
        audit_service_1.AuditService,
        storage_service_1.StorageService])
], AuthService);
//# sourceMappingURL=auth.service.js.map