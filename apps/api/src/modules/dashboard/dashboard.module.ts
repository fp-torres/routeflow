import { Controller, Get, Inject, Module, Query, ParseUUIDPipe } from '@nestjs/common';
import { z } from 'zod';
import { endOfMonthIso, isoDateSchema, startOfMonthIso, todayIso } from '@routeflow/types';
import { APP_CONFIG, type AppConfig } from '../../config/env';
import { CurrentUser } from '../../common/decorators';
import { employeeFilter, type AuthUser } from '../../common/auth-user';
import { ZodPipe } from '../../common/zod.pipe';
import { RoutesModule } from '../routes/routes.module';
import { DashboardService } from './dashboard.service';

const metricsQuery = z.object({
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  employeeId: z.string().uuid().optional(),
});

@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboard: DashboardService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @Get()
  employee(
    @CurrentUser() user: AuthUser,
    @Query('employeeId', new ParseUUIDPipe({ optional: true })) employeeId?: string,
  ) {
    return this.dashboard.employee(user, employeeId);
  }

  @Get('manager')
  manager(
    @Query(new ZodPipe(metricsQuery)) query: z.infer<typeof metricsQuery>,
    @CurrentUser() user: AuthUser,
  ) {
    const today = todayIso(this.config.timeZone);
    return this.dashboard.metrics(
      query.from ?? startOfMonthIso(today),
      query.to ?? endOfMonthIso(today),
      employeeFilter(user, query.employeeId),
    );
  }
}

@Module({
  imports: [RoutesModule],
  providers: [DashboardService],
  controllers: [DashboardController],
  exports: [DashboardService],
})
export class DashboardModule {}
