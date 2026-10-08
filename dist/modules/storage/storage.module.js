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
exports.StorageModule = exports.FilesController = void 0;
const common_1 = require("@nestjs/common");
const decorators_1 = require("../../common/decorators");
const storage_service_1 = require("./storage.service");
let FilesController = class FilesController {
    constructor(storage) {
        this.storage = storage;
    }
    /** Entrega um arquivo mediante URL assinada (fotos, cartas de autorização). */
    async get(encoded, query, res) {
        const verified = this.storage.verify(encoded, query);
        if (!verified)
            throw new common_1.NotFoundException('Link expirado ou inválido. Atualize a página.');
        const stat = await this.storage.stat(verified.key);
        if (!stat)
            throw new common_1.NotFoundException('Arquivo não encontrado.');
        const name = verified.fileName || verified.key.split('/').pop() || 'arquivo';
        res.setHeader('Content-Type', this.storage.mimeType(verified.key));
        res.setHeader('Content-Length', String(stat.size));
        res.setHeader('Cache-Control', `private, max-age=${Math.max(0, Math.floor(verified.expires - Date.now() / 1000))}`);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Disposition', `${verified.download ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(name)}`);
        this.storage
            .stream(verified.key)
            .on('error', () => res.destroy())
            .pipe(res);
    }
};
exports.FilesController = FilesController;
__decorate([
    (0, decorators_1.Public)(),
    (0, common_1.Get)(':encoded'),
    __param(0, (0, common_1.Param)('encoded')),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], FilesController.prototype, "get", null);
exports.FilesController = FilesController = __decorate([
    (0, common_1.Controller)('files'),
    __metadata("design:paramtypes", [storage_service_1.StorageService])
], FilesController);
let StorageModule = class StorageModule {
};
exports.StorageModule = StorageModule;
exports.StorageModule = StorageModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({ providers: [storage_service_1.StorageService], controllers: [FilesController], exports: [storage_service_1.StorageService] })
], StorageModule);
//# sourceMappingURL=storage.module.js.map