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
exports.RolesGuard = exports.JwtAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const jwt_1 = require("@nestjs/jwt");
const database_module_1 = require("../database/database.module");
const decorators_1 = require("./decorators");
let JwtAuthGuard = class JwtAuthGuard {
    constructor(reflector, jwt, db) {
        this.reflector = reflector;
        this.jwt = jwt;
        this.db = db;
    }
    async canActivate(context) {
        const isPublic = this.reflector.getAllAndOverride(decorators_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic)
            return true;
        const request = context.switchToHttp().getRequest();
        const header = request.headers.authorization;
        if (!header?.startsWith('Bearer '))
            throw new common_1.UnauthorizedException('Sessão expirada. Entre novamente.');
        let payload;
        try {
            payload = await this.jwt.verifyAsync(header.slice(7));
        }
        catch {
            throw new common_1.UnauthorizedException('Sessão expirada. Entre novamente.');
        }
        const user = await this.db.user.findUnique({
            where: { id: payload.sub },
            select: { id: true, name: true, email: true, role: true, active: true },
        });
        if (!user || !user.active)
            throw new common_1.UnauthorizedException('Usuário inativo ou inexistente.');
        request.user = { id: user.id, name: user.name, email: user.email, role: user.role };
        return true;
    }
};
exports.JwtAuthGuard = JwtAuthGuard;
exports.JwtAuthGuard = JwtAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)(database_module_1.DB)),
    __metadata("design:paramtypes", [core_1.Reflector,
        jwt_1.JwtService, Object])
], JwtAuthGuard);
let RolesGuard = class RolesGuard {
    constructor(reflector) {
        this.reflector = reflector;
    }
    canActivate(context) {
        const roles = this.reflector.getAllAndOverride(decorators_1.ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!roles || roles.length === 0)
            return true;
        const request = context.switchToHttp().getRequest();
        if (!request.user)
            throw new common_1.UnauthorizedException();
        if (request.user.role === 'ADMIN' || roles.includes(request.user.role))
            return true;
        throw new common_1.ForbiddenException('Você não tem permissão para esta ação.');
    }
};
exports.RolesGuard = RolesGuard;
exports.RolesGuard = RolesGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], RolesGuard);
//# sourceMappingURL=guards.js.map