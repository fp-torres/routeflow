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
exports.StoresModule = exports.StoresController = void 0;
const common_1 = require("@nestjs/common");
const zod_1 = require("zod");
const types_1 = require("@routeflow/types");
const decorators_1 = require("../../common/decorators");
const zod_pipe_1 = require("../../common/zod.pipe");
const geocoding_module_1 = require("../geocoding/geocoding.module");
const geocoding_service_1 = require("../geocoding/geocoding.service");
const stores_service_1 = require("./stores.service");
const quickAddPreviewSchema = zod_1.z.object({
    text: zod_1.z.string().max(50_000),
    region: zod_1.z.string().trim().max(80).nullable().optional(),
});
let StoresController = class StoresController {
    constructor(stores, geocoding) {
        this.stores = stores;
        this.geocoding = geocoding;
    }
    list(query) {
        return this.stores.list(query);
    }
    catalog() {
        return this.stores.catalog();
    }
    preview(body) {
        return this.stores.quickAddPreview(body.text, body.region ?? null);
    }
    quickAdd(body, user) {
        return this.stores.quickAddCommit(body, user);
    }
    /** Inicia a geocodificação (em segundo plano) das lojas sem coordenadas. */
    geocodeAll() {
        return { ...this.geocoding.startBackgroundGeocoding(), provider: this.geocoding.describe() };
    }
    get(id) {
        return this.stores.get(id);
    }
    create(body, user) {
        return this.stores.create(body, user);
    }
    update(id, body, user) {
        return this.stores.update(id, body, user);
    }
    async deactivate(id, user) {
        await this.stores.deactivate(id, user);
    }
    async geocodeOne(id) {
        const updated = await this.geocoding.geocodeStore(id);
        return { updated, store: await this.stores.get(id) };
    }
};
exports.StoresController = StoresController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)(new zod_pipe_1.ZodPipe(types_1.storeQuerySchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], StoresController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('catalog'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], StoresController.prototype, "catalog", null);
__decorate([
    (0, common_1.Post)('quick-add/preview'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)(new zod_pipe_1.ZodPipe(quickAddPreviewSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], StoresController.prototype, "preview", null);
__decorate([
    (0, common_1.Post)('quick-add'),
    __param(0, (0, common_1.Body)(new zod_pipe_1.ZodPipe(types_1.quickAddCommitSchema))),
    __param(1, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], StoresController.prototype, "quickAdd", null);
__decorate([
    (0, common_1.Post)('geocode'),
    (0, decorators_1.Roles)('ADMIN'),
    (0, common_1.HttpCode)(202),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], StoresController.prototype, "geocodeAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], StoresController.prototype, "get", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)(new zod_pipe_1.ZodPipe(types_1.storeCreateSchema))),
    __param(1, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], StoresController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)(new zod_pipe_1.ZodPipe(types_1.storeUpdateSchema))),
    __param(2, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], StoresController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, decorators_1.Roles)('MANAGER'),
    (0, common_1.HttpCode)(204),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], StoresController.prototype, "deactivate", null);
__decorate([
    (0, common_1.Post)(':id/geocode'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StoresController.prototype, "geocodeOne", null);
exports.StoresController = StoresController = __decorate([
    (0, common_1.Controller)('stores'),
    __metadata("design:paramtypes", [stores_service_1.StoresService,
        geocoding_service_1.GeocodingService])
], StoresController);
let StoresModule = class StoresModule {
};
exports.StoresModule = StoresModule;
exports.StoresModule = StoresModule = __decorate([
    (0, common_1.Module)({
        imports: [geocoding_module_1.GeocodingModule],
        providers: [stores_service_1.StoresService],
        controllers: [StoresController],
        exports: [stores_service_1.StoresService],
    })
], StoresModule);
//# sourceMappingURL=stores.module.js.map