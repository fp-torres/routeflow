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
exports.SettingsModule = exports.SettingsController = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("@routeflow/types");
const decorators_1 = require("../../common/decorators");
const auth_user_1 = require("../../common/auth-user");
const zod_pipe_1 = require("../../common/zod.pipe");
const audit_service_1 = require("../audit/audit.service");
const geocoding_module_1 = require("../geocoding/geocoding.module");
const home_address_service_1 = require("./home-address.service");
const settings_service_1 = require("./settings.service");
let SettingsController = class SettingsController {
    constructor(settings, homeAddress, audit) {
        this.settings = settings;
        this.homeAddress = homeAddress;
        this.audit = audit;
    }
    get() {
        return this.settings.get();
    }
    async update(body, user, req) {
        const result = await this.settings.update(body);
        void this.audit.log({
            userId: user.id,
            entity: 'settings',
            action: 'settings.update',
            metadata: body,
            ...(0, auth_user_1.requestMeta)(req),
        });
        return result;
    }
    getHome(user) {
        return this.homeAddress.getActive(user.id);
    }
    async setHome(body, user, req) {
        const result = await this.homeAddress.set(user.id, body);
        void this.audit.log({
            userId: user.id,
            entity: 'home_address',
            entityId: result.id,
            action: 'home_address.update',
            ...(0, auth_user_1.requestMeta)(req),
        });
        return result;
    }
};
exports.SettingsController = SettingsController;
__decorate([
    (0, common_1.Get)('settings'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], SettingsController.prototype, "get", null);
__decorate([
    (0, common_1.Patch)('settings'),
    (0, decorators_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Body)(new zod_pipe_1.ZodPipe(types_1.companySettingsUpdateSchema))),
    __param(1, (0, decorators_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "update", null);
__decorate([
    (0, common_1.Get)('me/home-address'),
    __param(0, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SettingsController.prototype, "getHome", null);
__decorate([
    (0, common_1.Put)('me/home-address'),
    __param(0, (0, common_1.Body)(new zod_pipe_1.ZodPipe(types_1.homeAddressSchema))),
    __param(1, (0, decorators_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], SettingsController.prototype, "setHome", null);
exports.SettingsController = SettingsController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [settings_service_1.SettingsService,
        home_address_service_1.HomeAddressService,
        audit_service_1.AuditService])
], SettingsController);
let SettingsModule = class SettingsModule {
};
exports.SettingsModule = SettingsModule;
exports.SettingsModule = SettingsModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [geocoding_module_1.GeocodingModule],
        providers: [settings_service_1.SettingsService, home_address_service_1.HomeAddressService],
        controllers: [SettingsController],
        exports: [settings_service_1.SettingsService, home_address_service_1.HomeAddressService],
    })
], SettingsModule);
//# sourceMappingURL=settings.module.js.map