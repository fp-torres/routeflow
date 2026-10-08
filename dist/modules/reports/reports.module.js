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
exports.ReportsModule = exports.ReportsController = void 0;
const common_1 = require("@nestjs/common");
const zod_1 = require("zod");
const types_1 = require("@routeflow/types");
const decorators_1 = require("../../common/decorators");
const zod_pipe_1 = require("../../common/zod.pipe");
const audit_service_1 = require("../audit/audit.service");
const dashboard_module_1 = require("../dashboard/dashboard.module");
const pdf_renderer_1 = require("./pdf-renderer");
const reports_service_1 = require("./reports.service");
const xlsx_renderer_1 = require("./xlsx-renderer");
const typePipe = new zod_pipe_1.ZodPipe(zod_1.z.enum(types_1.REPORT_TYPES, { error: 'Tipo de relatório inválido.' }));
let ReportsController = class ReportsController {
    constructor(reports, audit) {
        this.reports = reports;
        this.audit = audit;
    }
    preview(type, query, user) {
        return this.reports.preview(type, query, user);
    }
    async pdf(type, query, user, res) {
        const data = await this.reports.build(type, query, user);
        const buffer = await (0, pdf_renderer_1.renderPdf)(data);
        void this.audit.log({
            userId: user.id,
            entity: 'report',
            action: 'report.generate',
            metadata: { type, format: 'pdf', from: data.from, to: data.to },
        });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="routeflow-${type}-${data.from}_${data.to}.pdf"`);
        res.send(buffer);
    }
    async xlsx(type, query, user, res) {
        const data = await this.reports.build(type, query, user);
        const buffer = await (0, xlsx_renderer_1.renderXlsx)(data);
        void this.audit.log({
            userId: user.id,
            entity: 'report',
            action: 'report.generate',
            metadata: { type, format: 'xlsx', from: data.from, to: data.to },
        });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="routeflow-${type}-${data.from}_${data.to}.xlsx"`);
        res.send(buffer);
    }
};
exports.ReportsController = ReportsController;
__decorate([
    (0, common_1.Get)(':type/preview'),
    __param(0, (0, common_1.Param)('type', typePipe)),
    __param(1, (0, common_1.Query)(new zod_pipe_1.ZodPipe(types_1.reportQuerySchema))),
    __param(2, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "preview", null);
__decorate([
    (0, common_1.Get)(':type/pdf'),
    __param(0, (0, common_1.Param)('type', typePipe)),
    __param(1, (0, common_1.Query)(new zod_pipe_1.ZodPipe(types_1.reportQuerySchema))),
    __param(2, (0, decorators_1.CurrentUser)()),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "pdf", null);
__decorate([
    (0, common_1.Get)(':type/xlsx'),
    __param(0, (0, common_1.Param)('type', typePipe)),
    __param(1, (0, common_1.Query)(new zod_pipe_1.ZodPipe(types_1.reportQuerySchema))),
    __param(2, (0, decorators_1.CurrentUser)()),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "xlsx", null);
exports.ReportsController = ReportsController = __decorate([
    (0, common_1.Controller)('reports'),
    __metadata("design:paramtypes", [reports_service_1.ReportsService,
        audit_service_1.AuditService])
], ReportsController);
let ReportsModule = class ReportsModule {
};
exports.ReportsModule = ReportsModule;
exports.ReportsModule = ReportsModule = __decorate([
    (0, common_1.Module)({
        imports: [dashboard_module_1.DashboardModule],
        providers: [reports_service_1.ReportsService],
        controllers: [ReportsController],
    })
], ReportsModule);
//# sourceMappingURL=reports.module.js.map