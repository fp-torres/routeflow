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
exports.VisitsModule = exports.VisitsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const types_1 = require("@routeflow/types");
const env_1 = require("../../config/env");
const decorators_1 = require("../../common/decorators");
const zod_pipe_1 = require("../../common/zod.pipe");
const routes_module_1 = require("../routes/routes.module");
const photos_service_1 = require("./photos.service");
const visits_service_1 = require("./visits.service");
let VisitsController = class VisitsController {
    constructor(visits, photos) {
        this.visits = visits;
        this.photos = photos;
    }
    list(query, user) {
        return this.visits.list(query, user);
    }
    create(body, user) {
        return this.visits.create(body, user);
    }
    get(id, user) {
        return this.visits.detail(id, user);
    }
    update(id, body, user) {
        return this.visits.update(id, body, user);
    }
    start(id, body, user) {
        return this.visits.start(id, body, user);
    }
    finish(id, body, user) {
        return this.visits.finish(id, body, user);
    }
    addActivity(id, body, user) {
        return this.visits.addActivity(id, body, user);
    }
    reschedule(id, body, user) {
        return this.visits.reschedule(id, body, user);
    }
    uploadPhotos(id, files, body, user) {
        return this.photos.upload(id, files, body, user);
    }
    async removePhoto(id, photoId, user) {
        await this.photos.remove(id, photoId, user);
    }
};
exports.VisitsController = VisitsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)(new zod_pipe_1.ZodPipe(types_1.visitQuerySchema))),
    __param(1, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], VisitsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)(new zod_pipe_1.ZodPipe(types_1.visitCreateSchema))),
    __param(1, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], VisitsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], VisitsController.prototype, "get", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)(new zod_pipe_1.ZodPipe(types_1.visitUpdateSchema))),
    __param(2, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], VisitsController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/start'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)(new zod_pipe_1.ZodPipe(types_1.visitStartSchema))),
    __param(2, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], VisitsController.prototype, "start", null);
__decorate([
    (0, common_1.Post)(':id/finish'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)(new zod_pipe_1.ZodPipe(types_1.visitFinishSchema))),
    __param(2, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], VisitsController.prototype, "finish", null);
__decorate([
    (0, common_1.Post)(':id/activities'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)(new zod_pipe_1.ZodPipe(types_1.visitActivitySchema))),
    __param(2, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], VisitsController.prototype, "addActivity", null);
__decorate([
    (0, common_1.Post)(':id/reschedule'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)(new zod_pipe_1.ZodPipe(types_1.visitRescheduleSchema))),
    __param(2, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], VisitsController.prototype, "reschedule", null);
__decorate([
    (0, common_1.Post)(':id/photos'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FilesInterceptor)('files', 10, {
        storage: (0, multer_1.memoryStorage)(),
        limits: { fileSize: (0, env_1.loadConfig)().files.maxPhotoBytes, files: 10 },
    })),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.UploadedFiles)()),
    __param(2, (0, common_1.Body)(new zod_pipe_1.ZodPipe(types_1.photoUploadMetaSchema))),
    __param(3, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array, Object, Object]),
    __metadata("design:returntype", void 0)
], VisitsController.prototype, "uploadPhotos", null);
__decorate([
    (0, common_1.Delete)(':id/photos/:photoId'),
    (0, common_1.HttpCode)(204),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('photoId', common_1.ParseUUIDPipe)),
    __param(2, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], VisitsController.prototype, "removePhoto", null);
exports.VisitsController = VisitsController = __decorate([
    (0, common_1.Controller)('visits'),
    __metadata("design:paramtypes", [visits_service_1.VisitsService,
        photos_service_1.PhotosService])
], VisitsController);
let VisitsModule = class VisitsModule {
};
exports.VisitsModule = VisitsModule;
exports.VisitsModule = VisitsModule = __decorate([
    (0, common_1.Module)({
        imports: [routes_module_1.RoutesModule],
        providers: [visits_service_1.VisitsService, photos_service_1.PhotosService],
        controllers: [VisitsController],
        exports: [visits_service_1.VisitsService],
    })
], VisitsModule);
//# sourceMappingURL=visits.module.js.map