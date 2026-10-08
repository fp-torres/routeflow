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
exports.HealthModule = exports.HealthController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const env_1 = require("../../config/env");
const database_module_1 = require("../../database/database.module");
const decorators_1 = require("../../common/decorators");
let HealthController = class HealthController {
    constructor(db, config) {
        this.db = db;
        this.config = config;
    }
    /** GET /health -> { "status": "ok" } (monitoramento simples / Hostinger) */
    health() {
        return { status: 'ok' };
    }
    /** GET /api/health/details -> inclui verificação do banco */
    async details() {
        let database = 'up';
        try {
            await this.db.$queryRawUnsafe('SELECT 1');
        }
        catch {
            database = 'down';
        }
        return {
            status: database === 'up' ? 'ok' : 'degraded',
            database,
            provider: this.config.database.provider,
            version: process.env.npm_package_version ?? '1.0.0',
            uptimeSeconds: Math.round(process.uptime()),
            time: new Date().toISOString(),
        };
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, decorators_1.Public)(),
    (0, common_1.Get)('health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HealthController.prototype, "health", null);
__decorate([
    (0, decorators_1.Public)(),
    (0, common_1.Get)('health/details'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "details", null);
exports.HealthController = HealthController = __decorate([
    (0, common_1.Controller)(),
    (0, throttler_1.SkipThrottle)(),
    __param(0, (0, common_1.Inject)(database_module_1.DB)),
    __param(1, (0, common_1.Inject)(env_1.APP_CONFIG)),
    __metadata("design:paramtypes", [Object, Object])
], HealthController);
let HealthModule = class HealthModule {
};
exports.HealthModule = HealthModule;
exports.HealthModule = HealthModule = __decorate([
    (0, common_1.Module)({ controllers: [HealthController] })
], HealthModule);
//# sourceMappingURL=health.module.js.map