"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AppModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const schedule_1 = require("@nestjs/schedule");
const throttler_1 = require("@nestjs/throttler");
const guards_1 = require("./common/guards");
const config_module_1 = require("./config/config.module");
const database_module_1 = require("./database/database.module");
const audit_module_1 = require("./modules/audit/audit.module");
const auth_module_1 = require("./modules/auth/auth.module");
const authorizations_module_1 = require("./modules/authorizations/authorizations.module");
const dashboard_module_1 = require("./modules/dashboard/dashboard.module");
const expenses_module_1 = require("./modules/expenses/expenses.module");
const geocoding_module_1 = require("./modules/geocoding/geocoding.module");
const health_module_1 = require("./modules/health/health.module");
const importer_module_1 = require("./modules/importer/importer.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const reports_module_1 = require("./modules/reports/reports.module");
const routes_module_1 = require("./modules/routes/routes.module");
const settings_module_1 = require("./modules/settings/settings.module");
const shared_access_module_1 = require("./modules/shared/shared-access.module");
const storage_module_1 = require("./modules/storage/storage.module");
const stores_module_1 = require("./modules/stores/stores.module");
const transport_module_1 = require("./modules/transport/transport.module");
const users_module_1 = require("./modules/users/users.module");
const visits_module_1 = require("./modules/visits/visits.module");
/** Monólito modular: um único processo Node serve a API REST e o build do React. */
let AppModule = AppModule_1 = class AppModule {
    static forRoot(config) {
        return {
            module: AppModule_1,
            imports: [
                config_module_1.ConfigModule.forRoot(config),
                database_module_1.DatabaseModule,
                throttler_1.ThrottlerModule.forRoot([
                    {
                        name: 'default',
                        ttl: 60_000,
                        limit: config.env === 'test' ? 100_000 : config.rateLimitPerMinute,
                    },
                ]),
                schedule_1.ScheduleModule.forRoot(),
                audit_module_1.AuditModule,
                storage_module_1.StorageModule,
                settings_module_1.SettingsModule,
                notifications_module_1.NotificationsModule,
                auth_module_1.AuthModule,
                users_module_1.UsersModule,
                health_module_1.HealthModule,
                geocoding_module_1.GeocodingModule,
                transport_module_1.TransportModule,
                authorizations_module_1.AuthorizationsModule,
                stores_module_1.StoresModule,
                routes_module_1.RoutesModule,
                visits_module_1.VisitsModule,
                expenses_module_1.ExpensesModule,
                dashboard_module_1.DashboardModule,
                reports_module_1.ReportsModule,
                shared_access_module_1.SharedAccessModule,
                importer_module_1.ImporterModule,
            ],
            providers: [
                { provide: core_1.APP_GUARD, useClass: throttler_1.ThrottlerGuard },
                { provide: core_1.APP_GUARD, useClass: guards_1.JwtAuthGuard },
                { provide: core_1.APP_GUARD, useClass: guards_1.RolesGuard },
            ],
        };
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = AppModule_1 = __decorate([
    (0, common_1.Module)({})
], AppModule);
//# sourceMappingURL=app.module.js.map