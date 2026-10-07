import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  isoToUtcDate,
  templateCreateSchema,
  templateUpdateSchema,
  type RouteTemplateDto,
  type TemplateCreateInput,
  type TemplateDayInput,
  type TemplateUpdateInput,
} from '@routeflow/types';
import { DB } from '../../database/database.module';
import type { Db, Prisma } from '../../database/prisma.types';
import { canSeeAll, type AuthUser } from '../../common/auth-user';
import { toStoreRef } from '../../common/mappers';
import { isoDateOrNull } from '../../common/serialize';
import { AuditService } from '../audit/audit.service';
import { PlannerService } from './planner.service';

const include = {
  stops: {
    include: { store: true },
    orderBy: [{ weekIndex: 'asc' }, { weekday: 'asc' }, { order: 'asc' }],
  },
} satisfies Prisma.RouteTemplateInclude;
type Row = Prisma.RouteTemplateGetPayload<{ include: typeof include }>;

function toDto(row: Row): RouteTemplateDto {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    cycleWeeks: row.cycleWeeks,
    anchorDate: isoDateOrNull(row.anchorDate),
    validFrom: isoDateOrNull(row.validFrom),
    validUntil: isoDateOrNull(row.validUntil),
    active: row.active,
    notes: row.notes,
    stops: row.stops.map((s) => ({
      id: s.id,
      order: s.order,
      weekday: s.weekday,
      weekIndex: s.weekIndex,
      store: toStoreRef(s.store),
    })),
  };
}

/** Roteiro padrão / semanal / mensal: quais lojas visitar em cada dia. */
@Injectable()
export class TemplatesService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly planner: PlannerService,
    private readonly audit: AuditService,
  ) {}

  async list(employeeId: string): Promise<RouteTemplateDto[]> {
    const rows = await this.db.routeTemplate.findMany({
      where: { employeeId },
      include,
      orderBy: [{ active: 'desc' }, { createdAt: 'asc' }],
    });
    return rows.map(toDto);
  }

  private async load(id: string, user: AuthUser): Promise<Row> {
    const row = await this.db.routeTemplate.findUnique({ where: { id }, include });
    if (!row) throw new NotFoundException('Roteiro não encontrado.');
    if (row.employeeId !== user.id && !canSeeAll(user)) throw new ForbiddenException();
    return row;
  }

  private dates(input: {
    anchorDate?: string | null;
    validFrom?: string | null;
    validUntil?: string | null;
  }) {
    const conv = (v: string | null | undefined) =>
      v === undefined ? undefined : v ? isoToUtcDate(v) : null;
    return {
      anchorDate: conv(input.anchorDate),
      validFrom: conv(input.validFrom),
      validUntil: conv(input.validUntil),
    };
  }

  async create(input: TemplateCreateInput, user: AuthUser): Promise<RouteTemplateDto> {
    const data = templateCreateSchema.parse(input);
    const row = await this.db.routeTemplate.create({
      data: {
        employeeId: user.id,
        name: data.name,
        kind: data.kind,
        cycleWeeks: data.kind === 'WEEKLY' ? data.cycleWeeks : 1,
        active: data.active,
        notes: data.notes ?? null,
        ...this.dates(data),
      },
      include,
    });
    this.planner.resetCache();
    void this.audit.log({
      userId: user.id,
      entity: 'route_template',
      entityId: row.id,
      action: 'template.create',
      metadata: data,
    });
    return toDto(row);
  }

  async update(id: string, input: TemplateUpdateInput, user: AuthUser): Promise<RouteTemplateDto> {
    await this.load(id, user);
    const data = templateUpdateSchema.parse(input);
    const row = await this.db.routeTemplate.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.kind !== undefined ? { kind: data.kind } : {}),
        ...(data.cycleWeeks !== undefined ? { cycleWeeks: data.cycleWeeks } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        ...this.dates(data),
      },
      include,
    });
    this.planner.resetCache();
    void this.audit.log({
      userId: user.id,
      entity: 'route_template',
      entityId: id,
      action: 'template.update',
      metadata: data,
    });
    return toDto(row);
  }

  async remove(id: string, user: AuthUser): Promise<void> {
    await this.load(id, user);
    await this.db.routeTemplate.delete({ where: { id } });
    this.planner.resetCache();
    void this.audit.log({
      userId: user.id,
      entity: 'route_template',
      entityId: id,
      action: 'template.delete',
    });
  }

  /** Define as lojas (em ordem) de um dia do roteiro. */
  async setDay(id: string, input: TemplateDayInput, user: AuthUser): Promise<RouteTemplateDto> {
    const template = await this.load(id, user);
    if (template.kind === 'STANDARD' && input.weekIndex !== 0)
      throw new BadRequestException('O roteiro padrão não usa índice de semana.');
    if (
      template.kind === 'WEEKLY' &&
      (input.weekIndex < 1 || input.weekIndex > template.cycleWeeks)
    ) {
      throw new BadRequestException(`Semana do ciclo deve estar entre 1 e ${template.cycleWeeks}.`);
    }
    if (template.kind === 'MONTHLY' && (input.weekIndex < 1 || input.weekIndex > 5))
      throw new BadRequestException('Semana do mês deve estar entre 1 e 5.');
    const unique = [...new Set(input.storeIds)];
    const found = await this.db.store.count({ where: { id: { in: unique } } });
    if (found !== unique.length) throw new BadRequestException('Uma ou mais lojas não existem.');
    await this.db.$transaction([
      this.db.routeTemplateStop.deleteMany({
        where: { templateId: id, weekday: input.weekday, weekIndex: input.weekIndex },
      }),
      this.db.routeTemplateStop.createMany({
        data: unique.map((storeId, index) => ({
          templateId: id,
          storeId,
          weekday: input.weekday,
          weekIndex: input.weekIndex,
          order: index + 1,
        })),
      }),
    ]);
    this.planner.resetCache();
    void this.audit.log({
      userId: user.id,
      entity: 'route_template',
      entityId: id,
      action: 'template.set_day',
      metadata: input,
    });
    return toDto(await this.load(id, user));
  }
}
