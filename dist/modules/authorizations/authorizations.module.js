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
exports.AuthorizationsModule = exports.AuthorizationsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const types_1 = require("@routeflow/types");
const env_1 = require("../../config/env");
const decorators_1 = require("../../common/decorators");
const zod_pipe_1 = require("../../common/zod.pipe");
const authorizations_service_1 = require("./authorizations.service");
const pdfUpload = () => (0, platform_express_1.FileInterceptor)('file', {
    storage: (0, multer_1.memoryStorage)(),
    limits: { fileSize: (0, env_1.loadConfig)().files.maxPdfBytes, files: 1 },
});
let AuthorizationsController = class AuthorizationsController {
    constructor(letters) {
        this.letters = letters;
    }
    list(query) {
        return this.letters.list(query);
    }
    listByStore(storeId) {
        return this.letters.list({ storeId });
    }
    /** Carta cobrindo várias lojas (ex.: carta trimestral da rede). */
    createMany(body, file, user) {
        return this.letters.create(body, file, user);
    }
    create(storeId, body, file, user) {
        return this.letters.create(body, file, user, storeId);
    }
    get(id) {
        return this.letters.get(id);
    }
    update(id, body, user) {
        return this.letters.update(id, body, user);
    }
    replace(id, file, user) {
        return this.letters.replaceFile(id, file, user);
    }
    /** Exclusão lógica (qualquer perfil): o histórico e o arquivo ficam para auditoria. */
    async remove(id, user) {
        await this.letters.remove(id, user);
    }
    /** Tira uma loja da carta; se for a última, a carta é excluída (logicamente). */
    removeStore(id, storeId, user) {
        return this.letters.removeStore(id, storeId, user);
    }
    history(id) {
        return this.letters.history(id);
    }
};
exports.AuthorizationsController = AuthorizationsController;
__decorate([
    (0, common_1.Get)('authorizations'),
    __param(0, (0, common_1.Query)(new zod_pipe_1.ZodPipe(types_1.letterQuerySchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthorizationsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('stores/:storeId/authorizations'),
    __param(0, (0, common_1.Param)('storeId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AuthorizationsController.prototype, "listByStore", null);
__decorate([
    (0, common_1.Post)('authorizations'),
    (0, common_1.UseInterceptors)(pdfUpload()),
    __param(0, (0, common_1.Body)(new zod_pipe_1.ZodPipe(types_1.letterMetaSchema))),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", void 0)
], AuthorizationsController.prototype, "createMany", null);
__decorate([
    (0, common_1.Post)('stores/:storeId/authorizations'),
    (0, common_1.UseInterceptors)(pdfUpload()),
    __param(0, (0, common_1.Param)('storeId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)(new zod_pipe_1.ZodPipe(types_1.letterMetaSchema))),
    __param(2, (0, common_1.UploadedFile)()),
    __param(3, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object]),
    __metadata("design:returntype", void 0)
], AuthorizationsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('authorizations/:id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AuthorizationsController.prototype, "get", null);
__decorate([
    (0, common_1.Patch)('authorizations/:id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)(new zod_pipe_1.ZodPipe(types_1.letterUpdateSchema))),
    __param(2, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AuthorizationsController.prototype, "update", null);
__decorate([
    (0, common_1.Post)('authorizations/:id/file'),
    (0, common_1.UseInterceptors)(pdfUpload()),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AuthorizationsController.prototype, "replace", null);
__decorate([
    (0, common_1.Delete)('authorizations/:id'),
    (0, common_1.HttpCode)(204),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AuthorizationsController.prototype, "remove", null);
__decorate([
    (0, common_1.Delete)('authorizations/:id/stores/:storeId'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('storeId', common_1.ParseUUIDPipe)),
    __param(2, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], AuthorizationsController.prototype, "removeStore", null);
__decorate([
    (0, common_1.Get)('authorizations/:id/history'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AuthorizationsController.prototype, "history", null);
exports.AuthorizationsController = AuthorizationsController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [authorizations_service_1.AuthorizationsService])
], AuthorizationsController);
let AuthorizationsModule = class AuthorizationsModule {
};
exports.AuthorizationsModule = AuthorizationsModule;
exports.AuthorizationsModule = AuthorizationsModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [authorizations_service_1.AuthorizationsService],
        controllers: [AuthorizationsController],
        exports: [authorizations_service_1.AuthorizationsService],
    })
], AuthorizationsModule);
//# sourceMappingURL=authorizations.module.js.map