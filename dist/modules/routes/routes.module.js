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
exports.RoutesModule = exports.AgendaController = exports.TemplatesController = exports.RoutesController = void 0;
const common_1 = require("@nestjs/common");
const zod_1 = require("zod");
const types_1 = require("@routeflow/types");
const decorators_1 = require("../../common/decorators");
const auth_user_1 = require("../../common/auth-user");
const zod_pipe_1 = require("../../common/zod.pipe");
const agenda_service_1 = require("./agenda.service");
const planner_service_1 = require("./planner.service");
const routes_service_1 = require("./routes.service");
const templates_service_1 = require("./templates.service");
const agendaQuery = zod_1.z.object({
    from: types_1.isoDateSchema.optional(),
    to: types_1.isoDateSchema.optional(),
    employeeId: zod_1.z.string().uuid().optional(),
});
let RoutesController = class RoutesController {
    constructor(routes) {
        this.routes = routes;
    }
    list(query, user) {
        return this.routes.list(query, user);
    }
    create(body, user) {
        return this.routes.create(body, user);
    }
    generate(body, user) {
        return this.routes.generate(body.from, body.to, body.overwrite, user, body.employeeId);
    }
    get(id, user) {
        return this.routes.detail(id, user);
    }
    update(id, body, user) {
        return this.routes.update(id, body, user);
    }
    addStop(id, body, user) {
        return this.routes.addStop(id, body.storeId, body.position, user);
    }
    removeStop(id, stopId, user) {
        return this.routes.removeStop(id, stopId, user);
    }
    reorder(id, body, user) {
        return this.routes.reorder(id, body.stopIds, user);
    }
    optimize(id, body, user) {
        return this.routes.optimize(id, body.apply, user);
    }
    recalculate(id, user) {
        return this.routes.recalculate(id, user);
    }
};
exports.RoutesController = RoutesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)(new zod_pipe_1.ZodPipe(types_1.routeQuerySchema))),
    __param(1, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], RoutesController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)(new zod_pipe_1.ZodPipe(types_1.routeCreateSchema))),
    __param(1, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], RoutesController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('generate'),
    __param(0, (0, common_1.Body)(new zod_pipe_1.ZodPipe(types_1.routeGenerateSchema))),
    __param(1, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], RoutesController.prototype, "generate", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RoutesController.prototype, "get", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)(new zod_pipe_1.ZodPipe(types_1.routeUpdateSchema))),
    __param(2, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], RoutesController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/stops'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)(new zod_pipe_1.ZodPipe(types_1.routeAddStopSchema))),
    __param(2, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], RoutesController.prototype, "addStop", null);
__decorate([
    (0, common_1.Delete)(':id/stops/:stopId'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('stopId', common_1.ParseUUIDPipe)),
    __param(2, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], RoutesController.prototype, "removeStop", null);
__decorate([
    (0, common_1.Put)(':id/stops/order'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)(new zod_pipe_1.ZodPipe(types_1.routeReorderSchema))),
    __param(2, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], RoutesController.prototype, "reorder", null);
__decorate([
    (0, common_1.Post)(':id/optimize'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)(new zod_pipe_1.ZodPipe(types_1.routeOptimizeSchema))),
    __param(2, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], RoutesController.prototype, "optimize", null);
__decorate([
    (0, common_1.Post)(':id/recalculate'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RoutesController.prototype, "recalculate", null);
exports.RoutesController = RoutesController = __decorate([
    (0, common_1.Controller)('routes'),
    __metadata("design:paramtypes", [routes_service_1.RoutesService])
], RoutesController);
let TemplatesController = class TemplatesController {
    constructor(templates) {
        this.templates = templates;
    }
    list(user, employeeId) {
        return this.templates.list((0, auth_user_1.resolveEmployeeId)(user, employeeId));
    }
    create(body, user) {
        return this.templates.create(body, user);
    }
    update(id, body, user) {
        return this.templates.update(id, body, user);
    }
    async remove(id, user) {
        await this.templates.remove(id, user);
    }
    setDay(id, weekday, body, user) {
        return this.templates.setDay(id, { ...body, weekday }, user);
    }
};
exports.TemplatesController = TemplatesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, decorators_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('employeeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], TemplatesController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)(new zod_pipe_1.ZodPipe(types_1.templateCreateSchema))),
    __param(1, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], TemplatesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)(new zod_pipe_1.ZodPipe(types_1.templateUpdateSchema))),
    __param(2, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], TemplatesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(204),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TemplatesController.prototype, "remove", null);
__decorate([
    (0, common_1.Put)(':id/days/:weekday'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('weekday', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)(new zod_pipe_1.ZodPipe(types_1.templateDaySchema.omit({ weekday: true })))),
    __param(3, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Object, Object]),
    __metadata("design:returntype", void 0)
], TemplatesController.prototype, "setDay", null);
exports.TemplatesController = TemplatesController = __decorate([
    (0, common_1.Controller)('route-templates'),
    __metadata("design:paramtypes", [templates_service_1.TemplatesService])
], TemplatesController);
let AgendaController = class AgendaController {
    constructor(agenda, planner) {
        this.agenda = agenda;
        this.planner = planner;
    }
    get(query, user) {
        const today = this.planner.today();
        const from = query.from ?? (0, types_1.startOfWeekIso)(today);
        const to = query.to ?? (0, types_1.addDaysIso)(from, 6);
        return this.agenda.get((0, auth_user_1.resolveEmployeeId)(user, query.employeeId), from, to);
    }
};
exports.AgendaController = AgendaController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)(new zod_pipe_1.ZodPipe(agendaQuery))),
    __param(1, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AgendaController.prototype, "get", null);
exports.AgendaController = AgendaController = __decorate([
    (0, common_1.Controller)('agenda'),
    __metadata("design:paramtypes", [agenda_service_1.AgendaService,
        planner_service_1.PlannerService])
], AgendaController);
let RoutesModule = class RoutesModule {
};
exports.RoutesModule = RoutesModule;
exports.RoutesModule = RoutesModule = __decorate([
    (0, common_1.Module)({
        providers: [planner_service_1.PlannerService, routes_service_1.RoutesService, templates_service_1.TemplatesService, agenda_service_1.AgendaService],
        controllers: [RoutesController, TemplatesController, AgendaController],
        exports: [planner_service_1.PlannerService, routes_service_1.RoutesService],
    })
], RoutesModule);
//# sourceMappingURL=routes.module.js.map