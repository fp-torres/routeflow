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
exports.AuthModule = exports.AuthController = exports.SESSION_HINT_COOKIE = exports.REFRESH_COOKIE = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const throttler_1 = require("@nestjs/throttler");
const types_1 = require("@routeflow/types");
const env_1 = require("../../config/env");
const database_module_1 = require("../../database/database.module");
const decorators_1 = require("../../common/decorators");
const auth_user_1 = require("../../common/auth-user");
const zod_pipe_1 = require("../../common/zod.pipe");
const auth_service_1 = require("./auth.service");
exports.REFRESH_COOKIE = 'rf_rt';
/** Cookie NÃO sensível (sem token) que só indica ao frontend que existe sessão a renovar. */
exports.SESSION_HINT_COOKIE = 'rf_session';
let AuthController = class AuthController {
    constructor(auth, config, db) {
        this.auth = auth;
        this.config = config;
        this.db = db;
    }
    /**
     * "Lembrar acesso" marcado: cookies com validade (sobrevivem ao fechar o navegador/reiniciar).
     * Desmarcado: cookies de sessão (o navegador apaga ao fechar). O refresh token fica só em
     * cookie HttpOnly; o banco guarda apenas o hash.
     */
    setCookie(res, session) {
        const lifetime = session.persistent ? { expires: session.refreshExpiresAt } : {};
        const secure = this.config.isProduction || this.config.trustProxy;
        res.cookie(exports.REFRESH_COOKIE, session.refreshToken, {
            httpOnly: true,
            secure,
            sameSite: 'strict',
            path: '/api/auth',
            ...lifetime,
        });
        res.cookie(exports.SESSION_HINT_COOKIE, '1', {
            httpOnly: false,
            secure,
            sameSite: 'strict',
            path: '/',
            ...lifetime,
        });
    }
    clearCookies(res) {
        res.clearCookie(exports.REFRESH_COOKIE, { path: '/api/auth' });
        res.clearCookie(exports.SESSION_HINT_COOKIE, { path: '/' });
    }
    body(session) {
        return { accessToken: session.accessToken, expiresIn: session.expiresIn, user: session.user };
    }
    async login(body, req, res) {
        const session = await this.auth.login(body.email, body.password, (0, auth_user_1.requestMeta)(req), body.remember);
        this.setCookie(res, session);
        return this.body(session);
    }
    async refresh(req, res) {
        try {
            const session = await this.auth.refresh(req.cookies?.[exports.REFRESH_COOKIE], (0, auth_user_1.requestMeta)(req));
            this.setCookie(res, session);
            return this.body(session);
        }
        catch (error) {
            this.clearCookies(res);
            throw error;
        }
    }
    async logout(req, res) {
        await this.auth.logout(req.cookies?.[exports.REFRESH_COOKIE], (0, auth_user_1.requestMeta)(req));
        this.clearCookies(res);
    }
    async me(user) {
        return (0, auth_service_1.toUserDto)(await this.db.user.findUniqueOrThrow({ where: { id: user.id } }), this.auth.signAvatar);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, decorators_1.Public)(),
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60_000 } }),
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)(new zod_pipe_1.ZodPipe(types_1.loginSchema))),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, decorators_1.Public)(),
    (0, throttler_1.Throttle)({ default: { limit: 120, ttl: 60_000 } }),
    (0, common_1.Post)('refresh'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, decorators_1.Public)(),
    (0, common_1.Post)('logout'),
    (0, common_1.HttpCode)(204),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Get)('me'),
    __param(0, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "me", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __param(1, (0, common_1.Inject)(env_1.APP_CONFIG)),
    __param(2, (0, common_1.Inject)(database_module_1.DB)),
    __metadata("design:paramtypes", [auth_service_1.AuthService, Object, Object])
], AuthController);
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            jwt_1.JwtModule.registerAsync({
                global: true,
                inject: [env_1.APP_CONFIG],
                useFactory: (config) => ({
                    secret: config.auth.jwtSecret,
                    signOptions: { expiresIn: config.auth.accessTtlSeconds, issuer: 'routeflow' },
                    verifyOptions: { issuer: 'routeflow' },
                }),
            }),
        ],
        providers: [auth_service_1.AuthService],
        controllers: [AuthController],
        exports: [auth_service_1.AuthService],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map