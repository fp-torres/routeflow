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
exports.AuditModule = exports.AuditController = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("@routeflow/types");
const decorators_1 = require("../../common/decorators");
const zod_pipe_1 = require("../../common/zod.pipe");
const audit_service_1 = require("./audit.service");
let AuditController = class AuditController {
    constructor(audit) {
        this.audit = audit;
    }
    list(query) {
        return this.audit.list(query);
    }
};
exports.AuditController = AuditController;
__decorate([
    (0, common_1.Get)(),
    (0, decorators_1.Roles)('ADMIN', 'MANAGER'),
    __param(0, (0, common_1.Query)(new zod_pipe_1.ZodPipe(types_1.auditQuerySchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuditController.prototype, "list", null);
exports.AuditController = AuditController = __decorate([
    (0, common_1.Controller)('audit'),
    __metadata("design:paramtypes", [audit_service_1.AuditService])
], AuditController);
let AuditModule = class AuditModule {
};
exports.AuditModule = AuditModule;
exports.AuditModule = AuditModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({ providers: [audit_service_1.AuditService], controllers: [AuditController], exports: [audit_service_1.AuditService] })
], AuditModule);
//# sourceMappingURL=audit.module.js.map