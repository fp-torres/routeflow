import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import {
  addDaysIso,
  endOfMonthIso,
  isoDateSchema,
  isoToUtcDate,
  paginationQuerySchema,
  sharedAccessCreateSchema,
  SHARED_SCOPES,
  startOfMonthIso,
  todayIso,
  type PublicPanelDto,
  type SharedAccessCreateInput,
  type SharedAccessCreatedDto,
  type SharedAccessDto,
  type SharedScope,
} from '@routeflow/types';
import { APP_CONFIG, type AppConfig } from '../../config/env';
import { DB } from '../../database/database.module';
import type { Db } from '../../database/prisma.types';
import { CurrentUser, Public, Roles } from '../../common/decorators';
import type { AuthUser } from '../../common/auth-user';
import { isoDate, isoInstant, moneyOrNull } from '../../common/serialize';
import { ZodPipe } from '../../common/zod.pipe';
import { AuditService } from '../audit/audit.service';
import { AuthorizationsService } from '../authorizations/authorizations.service';
import { randomToken, sha256 } from '../auth/password';
import { DashboardModule } from '../dashboard/dashboard.module';
import { DashboardService } from '../dashboard/dashboard.service';
import { ExpensesService } from '../expenses/expenses.service';
import { SettingsService } from '../settings/settings.service';
import { VisitsModule } from '../visits/visits.module';
import { VisitsService } from '../visits/visits.service';

type Row = Awaited<ReturnType<Db['sharedAccess']['findFirstOrThrow']>>;

/** Visualizador somente leitura usado internamente pelas rotas públicas. */
const PUBLIC_VIEWER: AuthUser = {
  id: '00000000-0000-0000-0000-000000000000',
  name: 'Painel público',
  email: '',
  role: 'MANAGER',
};

function toDto(row: Row): SharedAccessDto {
  return {
    id: row.id,
    label: row.label,
    tokenPreview: row.tokenPreview,
    scope: row.scope
      .split(',')
      .filter((s): s is SharedScope => (SHARED_SCOPES as readonly string[]).includes(s)),
    expiresAt: row.expiresAt ? isoInstant(row.expiresAt) : null,
    active: row.active && !row.revokedAt,
    revokedAt: row.revokedAt ? isoInstant(row.revokedAt) : null,
    lastAccessAt: row.lastAccessAt ? isoInstant(row.lastAccessAt) : null,
    accessCount: row.accessCount,
    createdAt: isoInstant(row.createdAt),
  };
}

@Injectable()
export class SharedAccessService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async list(): Promise<SharedAccessDto[]> {
    return (await this.db.sharedAccess.findMany({ orderBy: { createdAt: 'desc' } })).map(toDto);
  }

  /** O token (256 bits) é exibido UMA vez; o banco guarda apenas o hash SHA-256. */
  async create(input: SharedAccessCreateInput, user: AuthUser): Promise<SharedAccessCreatedDto> {
    const token = randomToken(32);
    const row = await this.db.sharedAccess.create({
      data: {
        label: input.label,
        tokenHash: sha256(token),
        tokenPreview: token.slice(0, 6),
        scope: [...new Set(input.scope)].join(','),
        expiresAt: input.expiresAt ? isoToUtcDate(addDaysIso(input.expiresAt, 1)) : null,
        createdById: user.id,
      },
    });
    return { ...toDto(row), token, url: `${this.config.appUrl}/public/dashboard/${token}` };
  }

  async revoke(id: string): Promise<SharedAccessDto> {
    const exists = await this.db.sharedAccess.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Link não encontrado.');
    return toDto(
      await this.db.sharedAccess.update({
        where: { id },
        data: { active: false, revokedAt: new Date() },
      }),
    );
  }

  /** Valida o token; links revogados, expirados ou inexistentes respondem 404. */
  async resolve(token: string, scope?: SharedScope): Promise<SharedAccessDto> {
    if (!/^[A-Za-z0-9_-]{20,100}$/.test(token))
      throw new NotFoundException('Link inválido ou expirado.');
    const row = await this.db.sharedAccess.findUnique({ where: { tokenHash: sha256(token) } });
    if (!row || !row.active || row.revokedAt || (row.expiresAt && row.expiresAt < new Date())) {
      throw new NotFoundException('Link inválido ou expirado.');
    }
    const dto = toDto(row);
    if (scope && !dto.scope.includes(scope))
      throw new NotFoundException('Este link não permite visualizar esta informação.');
    if (!row.lastAccessAt || Date.now() - row.lastAccessAt.getTime() > 60_000) {
      await this.db.sharedAccess.update({
        where: { id: row.id },
        data: { lastAccessAt: new Date(), accessCount: { increment: 1 } },
      });
    }
    return dto;
  }
}

@Controller('shared-access')
@Roles('MANAGER')
export class SharedAccessController {
  constructor(
    private readonly shared: SharedAccessService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  list() {
    return this.shared.list();
  }

  @Post()
  async create(
    @Body(new ZodPipe(sharedAccessCreateSchema)) body: SharedAccessCreateInput,
    @CurrentUser() user: AuthUser,
  ) {
    const created = await this.shared.create(body, user);
    void this.audit.log({
      userId: user.id,
      entity: 'shared_access',
      entityId: created.id,
      action: 'shared_access.create',
      metadata: { label: body.label, scope: body.scope },
    });
    return created;
  }

  @Post(':id/revoke')
  @HttpCode(200)
  async revoke(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    const result = await this.shared.revoke(id);
    void this.audit.log({
      userId: user.id,
      entity: 'shared_access',
      entityId: id,
      action: 'shared_access.revoke',
    });
    return result;
  }
}

const periodQuery = z.object({ from: isoDateSchema.optional(), to: isoDateSchema.optional() });
const pagedPeriodQuery = paginationQuerySchema.extend({
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
});

/** Painel do empregador/gestor: SOMENTE LEITURA, via token seguro e revogável. */
@Controller('public')
@Public()
@Throttle({ default: { limit: 90, ttl: 60_000 } })
export class PublicController {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly shared: SharedAccessService,
    private readonly dashboard: DashboardService,
    private readonly visits: VisitsService,
    private readonly letters: AuthorizationsService,
    private readonly expenses: ExpensesService,
    private readonly settings: SettingsService,
  ) {}

  private period(query: { from?: string; to?: string }) {
    const today = todayIso(this.config.timeZone);
    return { from: query.from ?? startOfMonthIso(today), to: query.to ?? endOfMonthIso(today) };
  }

  @Get(':token')
  async panel(
    @Param('token') token: string,
    @Query(new ZodPipe(periodQuery)) query: z.infer<typeof periodQuery>,
  ): Promise<PublicPanelDto> {
    const access = await this.shared.resolve(token);
    const { from, to } = this.period(query);
    const [metrics, settings, recent] = await Promise.all([
      this.dashboard.metrics(from, to),
      this.settings.get(),
      access.scope.includes('visits')
        ? this.visits.list(
            {
              from,
              to,
              page: 1,
              pageSize: 30,
              status: ['COMPLETED', 'NOT_COMPLETED', 'IN_PROGRESS'],
            },
            PUBLIC_VIEWER,
          )
        : null,
    ]);
    const recentVisits = (recent?.items ?? [])
      .sort((a, b) =>
        (b.finishedAt ?? b.startedAt ?? '').localeCompare(a.finishedAt ?? a.startedAt ?? ''),
      )
      .slice(0, 12);
    return {
      label: access.label,
      scope: access.scope,
      expiresAt: access.expiresAt,
      generatedAt: new Date().toISOString(),
      companyName: settings.companyName,
      metrics: access.scope.includes('expenses')
        ? metrics
        : { ...metrics, expenses: { total: 0, perVisit: null, byType: [] } },
      recentVisits,
    };
  }

  @Get(':token/visits')
  async visitsList(
    @Param('token') token: string,
    @Query(new ZodPipe(pagedPeriodQuery)) query: z.infer<typeof pagedPeriodQuery>,
  ) {
    await this.shared.resolve(token, 'visits');
    const { from, to } = this.period(query);
    return this.visits.list(
      { from, to, page: query.page, pageSize: query.pageSize },
      PUBLIC_VIEWER,
    );
  }

  @Get(':token/visits/:id')
  async visitDetail(@Param('token') token: string, @Param('id', ParseUUIDPipe) id: string) {
    const access = await this.shared.resolve(token, 'visits');
    const visit = await this.visits.detail(id, PUBLIC_VIEWER);
    return {
      ...visit,
      photos: access.scope.includes('photos') ? visit.photos : [],
      letters: access.scope.includes('authorizations') ? visit.letters : [],
      expenses: access.scope.includes('expenses') ? visit.expenses : [],
      activityPresets: [],
    };
  }

  @Get(':token/authorizations')
  async authorizations(@Param('token') token: string) {
    await this.shared.resolve(token, 'authorizations');
    return this.letters.list({});
  }

  @Get(':token/expenses')
  async expenseList(
    @Param('token') token: string,
    @Query(new ZodPipe(pagedPeriodQuery)) query: z.infer<typeof pagedPeriodQuery>,
  ) {
    await this.shared.resolve(token, 'expenses');
    const { from, to } = this.period(query);
    return this.expenses.list({ from, to, page: query.page, pageSize: query.pageSize }, null);
  }

  @Get(':token/routes')
  async routes(
    @Param('token') token: string,
    @Query(new ZodPipe(periodQuery)) query: z.infer<typeof periodQuery>,
  ) {
    await this.shared.resolve(token, 'routes');
    const { from, to } = this.period(query);
    const rows = await this.db.route.findMany({
      where: { date: { gte: isoToUtcDate(from), lte: isoToUtcDate(to) } },
      include: {
        employee: { select: { id: true, name: true } },
        stops: {
          orderBy: { order: 'asc' },
          include: {
            store: { select: { code: true, name: true, neighborhood: true } },
            visit: { select: { status: true } },
          },
        },
      },
      orderBy: { date: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      date: isoDate(r.date),
      status: r.status,
      region: r.region,
      employee: r.employee,
      estimatedDistance: r.estimatedDistance,
      estimatedDuration: r.estimatedDuration,
      estimatedTransportCost: moneyOrNull(r.estimatedTransportCost),
      actualTransportCost: moneyOrNull(r.actualTransportCost),
      stops: r.stops.map((s) => ({
        order: s.order,
        code: s.store.code,
        name: s.store.name,
        neighborhood: s.store.neighborhood,
        status: s.visit?.status ?? null,
      })),
    }));
  }
}

@Module({
  imports: [DashboardModule, VisitsModule],
  providers: [SharedAccessService],
  controllers: [SharedAccessController, PublicController],
})
export class SharedAccessModule {}
