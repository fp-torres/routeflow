import { Module, type DynamicModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { JwtAuthGuard, RolesGuard } from './common/guards';
import { ConfigModule } from './config/config.module';
import type { AppConfig } from './config/env';
import { DatabaseModule } from './database/database.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuthorizationsModule } from './modules/authorizations/authorizations.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { GeocodingModule } from './modules/geocoding/geocoding.module';
import { HealthModule } from './modules/health/health.module';
import { ImporterModule } from './modules/importer/importer.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReportsModule } from './modules/reports/reports.module';
import { RoutesModule } from './modules/routes/routes.module';
import { SettingsModule } from './modules/settings/settings.module';
import { SharedAccessModule } from './modules/shared/shared-access.module';
import { StorageModule } from './modules/storage/storage.module';
import { StoresModule } from './modules/stores/stores.module';
import { TransportModule } from './modules/transport/transport.module';
import { UsersModule } from './modules/users/users.module';
import { VisitsModule } from './modules/visits/visits.module';

/** Monólito modular: um único processo Node serve a API REST e o build do React. */
@Module({})
export class AppModule {
  static forRoot(config: AppConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot(config),
        DatabaseModule,
        ThrottlerModule.forRoot([
          {
            name: 'default',
            ttl: 60_000,
            limit: config.env === 'test' ? 100_000 : config.rateLimitPerMinute,
          },
        ]),
        ScheduleModule.forRoot(),
        AuditModule,
        StorageModule,
        SettingsModule,
        NotificationsModule,
        AuthModule,
        UsersModule,
        HealthModule,
        GeocodingModule,
        TransportModule,
        AuthorizationsModule,
        StoresModule,
        RoutesModule,
        VisitsModule,
        ExpensesModule,
        DashboardModule,
        ReportsModule,
        SharedAccessModule,
        ImporterModule,
      ],
      providers: [
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    };
  }
}
