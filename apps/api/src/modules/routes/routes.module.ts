import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Module,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { z } from 'zod';
import {
  addDaysIso,
  isoDateSchema,
  routeAddStopSchema,
  routeCreateSchema,
  routeGenerateSchema,
  routeOptimizeSchema,
  routeQuerySchema,
  routeReorderSchema,
  routeUpdateSchema,
  startOfWeekIso,
  templateCreateSchema,
  templateDaySchema,
  templateUpdateSchema,
  type RouteAddStopInput,
  type RouteCreateInput,
  type RouteGenerateInput,
  type RouteOptimizeInput,
  type RouteQuery,
  type RouteReorderInput,
  type RouteUpdateInput,
  type TemplateCreateInput,
  type TemplateDayInput,
  type TemplateUpdateInput,
} from '@routeflow/types';
import { CurrentUser } from '../../common/decorators';
import { resolveEmployeeId, type AuthUser } from '../../common/auth-user';
import { ZodPipe } from '../../common/zod.pipe';
import { AgendaService } from './agenda.service';
import { PlannerService } from './planner.service';
import { RoutesService } from './routes.service';
import { TemplatesService } from './templates.service';

const agendaQuery = z.object({
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  employeeId: z.string().uuid().optional(),
});

@Controller('routes')
export class RoutesController {
  constructor(private readonly routes: RoutesService) {}

  @Get()
  list(@Query(new ZodPipe(routeQuerySchema)) query: RouteQuery, @CurrentUser() user: AuthUser) {
    return this.routes.list(query, user);
  }

  @Post()
  create(
    @Body(new ZodPipe(routeCreateSchema)) body: RouteCreateInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.routes.create(body, user);
  }

  @Post('generate')
  generate(
    @Body(new ZodPipe(routeGenerateSchema)) body: RouteGenerateInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.routes.generate(body.from, body.to, body.overwrite, user);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.routes.detail(id, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(routeUpdateSchema)) body: RouteUpdateInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.routes.update(id, body, user);
  }

  @Post(':id/stops')
  addStop(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(routeAddStopSchema)) body: RouteAddStopInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.routes.addStop(id, body.storeId, body.position, user);
  }

  @Delete(':id/stops/:stopId')
  removeStop(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('stopId', ParseUUIDPipe) stopId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.routes.removeStop(id, stopId, user);
  }

  @Put(':id/stops/order')
  reorder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(routeReorderSchema)) body: RouteReorderInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.routes.reorder(id, body.stopIds, user);
  }

  @Post(':id/optimize')
  @HttpCode(200)
  optimize(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(routeOptimizeSchema)) body: RouteOptimizeInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.routes.optimize(id, body.apply, user);
  }

  @Post(':id/recalculate')
  @HttpCode(200)
  recalculate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.routes.recalculate(id, user);
  }
}

@Controller('route-templates')
export class TemplatesController {
  constructor(private readonly templates: TemplatesService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('employeeId') employeeId?: string) {
    return this.templates.list(resolveEmployeeId(user, employeeId));
  }

  @Post()
  create(
    @Body(new ZodPipe(templateCreateSchema)) body: TemplateCreateInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.templates.create(body, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(templateUpdateSchema)) body: TemplateUpdateInput,
    @CurrentUser() user: AuthUser,
  ) {
    return this.templates.update(id, body, user);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    await this.templates.remove(id, user);
  }

  @Put(':id/days/:weekday')
  setDay(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('weekday', ParseIntPipe) weekday: number,
    @Body(new ZodPipe(templateDaySchema.omit({ weekday: true })))
    body: Omit<TemplateDayInput, 'weekday'>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.templates.setDay(id, { ...body, weekday }, user);
  }
}

@Controller('agenda')
export class AgendaController {
  constructor(
    private readonly agenda: AgendaService,
    private readonly planner: PlannerService,
  ) {}

  @Get()
  get(
    @Query(new ZodPipe(agendaQuery)) query: z.infer<typeof agendaQuery>,
    @CurrentUser() user: AuthUser,
  ) {
    const today = this.planner.today();
    const from = query.from ?? startOfWeekIso(today);
    const to = query.to ?? addDaysIso(from, 6);
    return this.agenda.get(resolveEmployeeId(user, query.employeeId), from, to);
  }
}

@Module({
  providers: [PlannerService, RoutesService, TemplatesService, AgendaService],
  controllers: [RoutesController, TemplatesController, AgendaController],
  exports: [PlannerService, RoutesService],
})
export class RoutesModule {}
