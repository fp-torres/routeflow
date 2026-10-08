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
exports.DashboardModule = exports.DashboardController = void 0;
const common_1 = require("@nestjs/common");
const zod_1 = require("zod");
const types_1 = require("@routeflow/types");
const env_1 = require("../../config/env");
const decorators_1 = require("../../common/decorators");
const auth_user_1 = require("../../common/auth-user");
const zod_pipe_1 = require("../../common/zod.pipe");
const routes_module_1 = require("../routes/routes.module");
const dashboard_service_1 = require("./dashboard.service");
const metricsQuery = zod_1.z.object({
    from: types_1.isoDateSchema.optional(),
    to: types_1.isoDateSchema.optional(),
    employeeId: zod_1.z.string().uuid().optional(),
});
let DashboardController = class DashboardController {
    constructor(dashboard, config) {
        this.dashboard = dashboard;
        this.config = config;
    }
    employee(user, employeeId) {
        return this.dashboard.employee(user, employeeId);
    }
    manager(query, user) {
        const today = (0, types_1.todayIso)(this.config.timeZone);
        return this.dashboard.metrics(query.from ?? (0, types_1.startOfMonthIso)(today), query.to ?? (0, types_1.endOfMonthIso)(today), (0, auth_user_1.employeeFilter)(user, query.employeeId));
    }
};
exports.DashboardController = DashboardController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, decorators_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('employeeId', new common_1.ParseUUIDPipe({ optional: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "employee", null);
__decorate([
    (0, common_1.Get)('manager'),
    __param(0, (0, common_1.Query)(new zod_pipe_1.ZodPipe(metricsQuery))),
    __param(1, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], DashboardController.prototype, "manager", null);
exports.DashboardController = DashboardController = __decorate([
    (0, common_1.Controller)('dashboard'),
    __param(1, (0, common_1.Inject)(env_1.APP_CONFIG)),
    __metadata("design:paramtypes", [dashboard_service_1.DashboardService, Object])
], DashboardController);
let DashboardModule = class DashboardModule {
};
exports.DashboardModule = DashboardModule;
exports.DashboardModule = DashboardModule = __decorate([
    (0, common_1.Module)({
        imports: [routes_module_1.RoutesModule],
        providers: [dashboard_service_1.DashboardService],
        controllers: [DashboardController],
        exports: [dashboard_service_1.DashboardService],
    })
], DashboardModule);
//# sourceMappingURL=dashboard.module.js.map