import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Patch,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import {
  endOfMonthIso,
  isoDateSchema,
  isoToUtcDate,
  paginationQuerySchema,
  sharedAccessCreateSchema,
  sharedAccessUpdateSchema,
  SHARED_SCOPES,
  startOfMonthIso,
  todayIso,
  type PublicPanelDto,
  type SharedAccessCreateInput,
  type SharedAccessUpdateInput,
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

/** Cifra o token (AES-256-GCM) para permitir copiar o link novamente; a validação usa só o hash. */
function linkKey(secret: string): Buffer {
  return createHash('sha256').update(`${secret}:shared-links`).digest();
}

export function encryptToken(token: string, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', linkKey(secret), iv);
  const data = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString('base64url')).join('.');
}

export function decryptToken(value: string | null, secret: string): string | null {
  if (!value) return null;
  try {
    const [iv, tag, data] = value.split('.').map((p) => Buffer.from(p, 'base64url'));
    const decipher = createDecipheriv('aes-256-gcm', linkKey(secret), iv!);
    decipher.setAuthTag(tag!);
    return Buffer.concat([decipher.update(data!), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

/** Visualizador somente leitura usado internamente pelas rotas públicas. */
const PUBLIC_VIEWER: AuthUser = {
  id: '00000000-0000-0000-0000-000000000000',
  name: 'Painel público',
  email: '',
  role: 'MANAGER',
};

function toDto(row: Row, url: string | null = null): SharedAccessDto {
  return {
    id: row.id,
    label: row.label,
    tokenPreview: row.tokenPreview,
    url,
    scope: row.scope
      .split(',')
      .filter((s): s is SharedScope => (SHARED_SCOPES as readonly string[]).includes(s)),
    // Links públicos não expiram (campo mantido só por compatibilidade)
    expiresAt: null,
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

  private publicUrl(row: Row): string | null {
    if (row.revokedAt) return null;
    const token = decryptToken(row.tokenEncrypted, this.config.auth.jwtSecret);
    return token ? `${this.config.appUrl}/public/dashboard/${token}` : null;
  }

  async list(): Promise<SharedAccessDto[]> {
    const rows = await this.db.sharedAccess.findMany({ orderBy: { createdAt: 'desc' } });
    return rows.map((row) => toDto(row, this.publicUrl(row)));
  }

  /** Token de 256 bits; o banco guarda o hash (validação) e uma cópia cifrada (para copiar o link de novo). */
  async create(input: SharedAccessCreateInput, user: AuthUser): Promise<SharedAccessCreatedDto> {
    const token = randomToken(32);
    const row = await this.db.sharedAccess.create({
      data: {
        label: input.label,
        tokenHash: sha256(token),
        tokenPreview: token.slice(0, 6),
        scope: [...new Set(input.scope)].join(','),
        tokenEncrypted: encryptToken(token, this.config.auth.jwtSecret),
        createdById: user.id,
      },
    });
    const url = `${this.config.appUrl}/public/dashboard/${token}`;
    return { ...toDto(row, url), token, url };
  }

  /** Desativa/reativa (reversível), renomeia ou ajusta o que o link exibe. Revogados não voltam. */
  async update(id: string, input: SharedAccessUpdateInput): Promise<SharedAccessDto> {
    const current = await this.db.sharedAccess.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Link não encontrado.');
    if (current.revokedAt && input.active) {
      throw new BadRequestException(
        'Este link foi revogado e não pode ser reativado. Crie um novo link.',
      );
    }
    const row = await this.db.sharedAccess.update({
      where: { id },
      data: {
        ...(input.label !== undefined ? { label: input.label } : {}),
        ...(input.active !== undefined ? { active: input.active } : {}),
        ...(input.scope ? { scope: [...new Set(input.scope)].join(',') } : {}),
        expiresAt: null,
      },
    });
    return toDto(row, this.publicUrl(row));
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
    if (!row || !row.active || row.revokedAt) {
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

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(sharedAccessUpdateSchema)) body: SharedAccessUpdateInput,
    @CurrentUser() user: AuthUser,
  ) {
    const result = await this.shared.update(id, body);
    void this.audit.log({
      userId: user.id,
      entity: 'shared_access',
      entityId: id,
      action:
        body.active === false
          ? 'shared_access.deactivate'
          : body.active
            ? 'shared_access.activate'
            : 'shared_access.update',
      metadata: body,
    });
    return result;
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
