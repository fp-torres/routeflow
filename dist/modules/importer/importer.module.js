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
exports.ImporterModule = exports.ImporterController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const zod_1 = require("zod");
const types_1 = require("@routeflow/types");
const env_1 = require("../../config/env");
const database_module_1 = require("../../database/database.module");
const decorators_1 = require("../../common/decorators");
const serialize_1 = require("../../common/serialize");
const uploads_1 = require("../../common/uploads");
const zod_pipe_1 = require("../../common/zod.pipe");
const audit_service_1 = require("../audit/audit.service");
const planner_service_1 = require("../routes/planner.service");
const routes_module_1 = require("../routes/routes.module");
const settings_service_1 = require("../settings/settings.service");
const spreadsheet_importer_1 = require("./spreadsheet-importer");
const importBody = zod_1.z.object({
    dryRun: types_1.booleanQuery,
    updateExisting: types_1.booleanQuery,
    employeeId: zod_1.z.string().uuid().optional(),
});
let ImporterController = class ImporterController {
    constructor(db, settings, planner, audit) {
        this.db = db;
        this.settings = settings;
        this.planner = planner;
        this.audit = audit;
    }
    /** Importa (ou simula, com dryRun) a planilha XLSX — idempotente. */
    async importSpreadsheet(file, body, user) {
        if (!file || !(0, uploads_1.isXlsx)(file.buffer))
            throw new common_1.BadRequestException('Envie um arquivo .xlsx válido.');
        const result = await new spreadsheet_importer_1.SpreadsheetImporter(this.db).run(file.buffer, {
            employeeId: body.employeeId ?? user.id,
            fileName: (0, uploads_1.safeFileName)(file.originalname, 'planilha.xlsx'),
            dryRun: body.dryRun,
            updateExisting: body.updateExisting,
            userId: user.id,
            rules: await this.settings.networkRules(),
        });
        this.planner.resetCache();
        void this.audit.log({
            userId: user.id,
            entity: 'import',
            entityId: result.importRunId,
            action: 'import.spreadsheet',
            metadata: { dryRun: result.dryRun, status: result.status, summary: result.summary },
        });
        return result;
    }
    async runs() {
        const rows = await this.db.importRun.findMany({
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: { user: { select: { id: true, name: true } } },
        });
        return rows.map((r) => ({
            id: r.id,
            fileName: r.fileName,
            dryRun: r.dryRun,
            status: r.status,
            summary: (0, serialize_1.safeJsonParse)(r.summary, {}),
            issues: (0, serialize_1.safeJsonParse)(r.issues, []),
            user: r.user,
            createdAt: (0, serialize_1.isoInstant)(r.createdAt),
        }));
    }
};
exports.ImporterController = ImporterController;
__decorate([
    (0, common_1.Post)('spreadsheet'),
    (0, decorators_1.Roles)('ADMIN'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.memoryStorage)(),
        limits: { fileSize: (0, env_1.loadConfig)().files.maxSpreadsheetBytes, files: 1 },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)(new zod_pipe_1.ZodPipe(importBody))),
    __param(2, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], ImporterController.prototype, "importSpreadsheet", null);
__decorate([
    (0, common_1.Get)('runs'),
    (0, decorators_1.Roles)('MANAGER'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ImporterController.prototype, "runs", null);
exports.ImporterController = ImporterController = __decorate([
    (0, common_1.Controller)('import'),
    __param(0, (0, common_1.Inject)(database_module_1.DB)),
    __metadata("design:paramtypes", [Object, settings_service_1.SettingsService,
        planner_service_1.PlannerService,
        audit_service_1.AuditService])
], ImporterController);
let ImporterModule = class ImporterModule {
};
exports.ImporterModule = ImporterModule;
exports.ImporterModule = ImporterModule = __decorate([
    (0, common_1.Module)({ imports: [routes_module_1.RoutesModule], controllers: [ImporterController] })
], ImporterModule);
//# sourceMappingURL=importer.module.js.map