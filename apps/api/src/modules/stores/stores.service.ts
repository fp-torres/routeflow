import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  comparableKey,
  generateStoreCode,
  normalizeStoreCode,
  parseQuickAddText,
  type Paginated,
  type QuickAddCommitInput,
  type QuickAddRow,
  type StoreCreateInput,
  type StoreDetailDto,
  type StoreDto,
  type StoreQuery,
  type StoreUpdateInput,
} from '@routeflow/types';
import { storeCreateSchema, storeUpdateSchema } from '@routeflow/types';
import { APP_CONFIG, type AppConfig } from '../../config/env';
import { DB } from '../../database/database.module';
import type { Db, Prisma } from '../../database/prisma.types';
import type { AuthUser } from '../../common/auth-user';
import { NO_AUTHORIZATION, toStoreDto } from '../../common/mappers';
import { isoDateOrNull, paginate } from '../../common/serialize';
import { containsInsensitive } from '../../common/text-search';
import { toPhotoDto, toVisitSummary, visitSummaryInclude } from '../../common/visit-mappers';
import { AuditService } from '../audit/audit.service';
import { AuthorizationsService } from '../authorizations/authorizations.service';
import { GeocodingService } from '../geocoding/geocoding.service';
import { SettingsService } from '../settings/settings.service';
import { StorageService } from '../storage/storage.service';

const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

export interface QuickAddPreviewRow extends QuickAddRow {
  existingStoreId: string | null;
}

@Injectable()
export class StoresService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly letters: AuthorizationsService,
    private readonly settings: SettingsService,
    private readonly geocoding: GeocodingService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  async list(query: StoreQuery): Promise<Paginated<StoreDto>> {
    const provider = this.config.database.provider;
    const and: Prisma.StoreWhereInput[] = [];
    if (query.active !== undefined) and.push({ active: query.active });
    if (query.network) and.push({ network: query.network });
    if (query.region) and.push({ region: query.region });
    if (query.neighborhood) and.push({ neighborhood: query.neighborhood });
    if (query.withoutCoordinates) and.push({ OR: [{ latitude: null }, { longitude: null }] });
    if (query.search) {
      const c = containsInsensitive(provider, query.search);
      and.push({ OR: [{ name: c }, { code: c }, { address: c }, { neighborhood: c }] });
    }
    const where: Prisma.StoreWhereInput = and.length ? { AND: and } : {};
    // Lojas são poucas centenas: ordenação natural (V9 antes de V100) em memória
    const rows = await this.db.store.findMany({ where, take: 5000 });
    rows.sort((a, b) => collator.compare(a.network, b.network) || collator.compare(a.code, b.code));
    const total = rows.length;
    const page = rows.slice((query.page - 1) * query.pageSize, query.page * query.pageSize);
    const auth = await this.letters.summaries(page.map((s) => s.id));
    return paginate(
      page.map((s) => toStoreDto(s, auth.get(s.id) ?? NO_AUTHORIZATION)),
      total,
      query.page,
      query.pageSize,
    );
  }

  async catalog(): Promise<{ networks: string[]; regions: string[]; neighborhoods: string[] }> {
    const [networks, regions, neighborhoods, settings] = await Promise.all([
      this.db.store.findMany({ distinct: ['network'], select: { network: true } }),
      this.db.store.findMany({
        distinct: ['region'],
        select: { region: true },
        where: { region: { not: null } },
      }),
      this.db.store.findMany({
        distinct: ['neighborhood'],
        select: { neighborhood: true },
        where: { neighborhood: { not: null } },
      }),
      this.settings.get(),
    ]);
    const uniq = (values: Array<string | null>) =>
      [...new Set(values.filter((v): v is string => !!v))].sort(collator.compare);
    return {
      networks: uniq([...settings.networks, ...networks.map((n) => n.network)]),
      regions: uniq([...settings.regions, ...regions.map((r) => r.region)]),
      neighborhoods: uniq(neighborhoods.map((n) => n.neighborhood)),
    };
  }

  async get(id: string): Promise<StoreDetailDto> {
    const store = await this.db.store.findUnique({ where: { id } });
    if (!store) throw new NotFoundException('Loja não encontrada.');
    const [visits, totalVisits, completedVisits, lastCompleted, photos, letters, auth] =
      await Promise.all([
        this.db.visit.findMany({
          where: { storeId: id },
          include: visitSummaryInclude,
          orderBy: [{ scheduledDate: 'desc' }, { order: 'asc' }],
          take: 10,
        }),
        this.db.visit.count({ where: { storeId: id } }),
        this.db.visit.count({ where: { storeId: id, status: 'COMPLETED' } }),
        this.db.visit.findFirst({
          where: { storeId: id, status: 'COMPLETED' },
          orderBy: { scheduledDate: 'desc' },
          select: { scheduledDate: true },
        }),
        this.db.visitPhoto.findMany({
          where: { visit: { storeId: id } },
          include: { visit: { select: { id: true, scheduledDate: true } } },
          orderBy: { createdAt: 'desc' },
          take: 12,
        }),
        this.letters.list({ storeId: id }),
        this.letters.summaries([id]),
      ]);
    const authorization = auth.get(id) ?? NO_AUTHORIZATION;
    return {
      ...toStoreDto(store, authorization),
      stats: {
        totalVisits,
        completedVisits,
        lastVisitDate: isoDateOrNull(lastCompleted?.scheduledDate),
      },
      recentVisits: visits.map((v) => toVisitSummary(v, authorization)),
      recentPhotos: photos.map((p) => ({
        ...toPhotoDto(p, this.storage),
        visitId: p.visit.id,
        scheduledDate: isoDateOrNull(p.visit.scheduledDate)!,
      })),
      letters,
    };
  }

  /** Código único: informado pelo usuário (erro se repetido) ou provisório (com sufixo se necessário). */
  private async uniqueCode(code: string, provided: boolean, ignoreId?: string): Promise<string> {
    const exists = async (c: string) =>
      !!(await this.db.store.findFirst({
        where: { code: c, ...(ignoreId ? { NOT: { id: ignoreId } } : {}) },
        select: { id: true },
      }));
    if (!(await exists(code))) return code;
    if (provided) throw new ConflictException(`Já existe uma loja com o código ${code}.`);
    for (let i = 2; i < 100; i += 1) {
      const candidate = `${code.slice(0, 36)}-${i}`;
      if (!(await exists(candidate))) return candidate;
    }
    throw new ConflictException('Não foi possível gerar um código único para a loja.');
  }

  async create(input: StoreCreateInput, user: AuthUser): Promise<StoreDto> {
    const data = storeCreateSchema.parse(input);
    const code = await this.uniqueCode(
      data.code ? normalizeStoreCode(data.code) : generateStoreCode(data.network, data.name),
      !!data.code,
    );
    const store = await this.db.store.create({
      data: {
        code,
        name: data.name,
        network: data.network,
        address: data.address,
        neighborhood: data.neighborhood ?? null,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode ?? null,
        region: data.region ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        geocodeSource: data.latitude != null && data.longitude != null ? 'manual' : null,
        geocodeStatus: data.latitude != null && data.longitude != null ? 'MANUAL' : null,
        authorizationRequired: data.authorizationRequired ?? null,
        observations: data.observations ?? null,
        active: data.active,
      },
    });
    if (store.latitude == null && this.geocoding.isConfigured())
      void this.geocoding.geocodeStore(store.id);
    void this.audit.log({
      userId: user.id,
      entity: 'store',
      entityId: store.id,
      action: 'store.create',
      metadata: { code, name: store.name },
    });
    const created = await this.letters.summaries([store.id]);
    return toStoreDto(store, created.get(store.id) ?? NO_AUTHORIZATION);
  }

  async update(id: string, input: StoreUpdateInput, user: AuthUser): Promise<StoreDto> {
    const data = storeUpdateSchema.parse(input);
    const current = await this.db.store.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Loja não encontrada.');
    const code = data.code
      ? await this.uniqueCode(normalizeStoreCode(data.code), true, id)
      : undefined;
    const addressChanged =
      (data.address && data.address !== current.address) ||
      (data.neighborhood !== undefined && data.neighborhood !== current.neighborhood);
    const coordsProvided = data.latitude !== undefined || data.longitude !== undefined;
    const store = await this.db.store.update({
      where: { id },
      data: {
        ...(code ? { code } : {}),
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.network !== undefined ? { network: data.network } : {}),
        ...(data.address !== undefined ? { address: data.address } : {}),
        ...(data.neighborhood !== undefined ? { neighborhood: data.neighborhood } : {}),
        ...(data.city !== undefined ? { city: data.city } : {}),
        ...(data.state !== undefined ? { state: data.state } : {}),
        ...(data.zipCode !== undefined ? { zipCode: data.zipCode } : {}),
        ...(data.region !== undefined ? { region: data.region } : {}),
        ...(data.observations !== undefined ? { observations: data.observations } : {}),
        ...(data.active !== undefined ? { active: data.active } : {}),
        ...(data.authorizationRequired !== undefined
          ? { authorizationRequired: data.authorizationRequired }
          : {}),
        ...(coordsProvided
          ? {
              latitude: data.latitude ?? null,
              longitude: data.longitude ?? null,
              geocodeSource: data.latitude != null ? 'manual' : null,
              geocodeStatus: data.latitude != null ? 'MANUAL' : null,
              geocodeAttemptedAt: null,
              geocodedAt: null,
            }
          : addressChanged
            ? {
                latitude: null,
                longitude: null,
                geocodeSource: null,
                geocodeStatus: null,
                geocodeAttemptedAt: null,
                geocodedAt: null,
              }
            : {}),
      },
    });
    if (addressChanged && !coordsProvided && this.geocoding.isConfigured())
      void this.geocoding.geocodeStore(id);
    if (coordsProvided || addressChanged) await this.geocoding.invalidateRoutesForStore(id);
    void this.audit.log({
      userId: user.id,
      entity: 'store',
      entityId: id,
      action: 'store.update',
      metadata: data,
    });
    const auth = await this.letters.summaries([id]);
    return toStoreDto(store, auth.get(id) ?? NO_AUTHORIZATION);
  }

  async deactivate(id: string, user: AuthUser): Promise<void> {
    const exists = await this.db.store.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('Loja não encontrada.');
    await this.db.store.update({ where: { id }, data: { active: false } });
    void this.audit.log({
      userId: user.id,
      entity: 'store',
      entityId: id,
      action: 'store.deactivate',
    });
  }

  private async findExisting(row: {
    code?: string | null;
    name: string;
    network: string;
  }): Promise<string | null> {
    if (row.code) {
      const byCode = await this.db.store.findUnique({
        where: { code: normalizeStoreCode(row.code) },
        select: { id: true },
      });
      if (byCode) return byCode.id;
    }
    const sameNetwork = await this.db.store.findMany({
      where: { network: row.network },
      select: { id: true, name: true },
    });
    return sameNetwork.find((s) => comparableKey(s.name) === comparableKey(row.name))?.id ?? null;
  }

  /** Cadastro rápido (aba "Cadastro Rápido" da planilha): pré-visualização. */
  async quickAddPreview(text: string, region: string | null): Promise<QuickAddPreviewRow[]> {
    const rows = parseQuickAddText(text, { rules: await this.settings.networkRules(), region });
    return Promise.all(
      rows.map(async (row) => ({
        ...row,
        existingStoreId: row.name ? await this.findExisting(row) : null,
      })),
    );
  }

  async quickAddCommit(
    input: QuickAddCommitInput,
    user: AuthUser,
  ): Promise<{ created: StoreDto[]; skipped: Array<{ name: string; reason: string }> }> {
    const created: StoreDto[] = [];
    const skipped: Array<{ name: string; reason: string }> = [];
    for (const row of input.rows) {
      if (await this.findExisting(row)) {
        skipped.push({ name: row.code ?? row.name, reason: 'Loja já cadastrada' });
        continue;
      }
      created.push(
        await this.create(
          {
            code: row.code ?? undefined,
            name: row.name,
            network: row.network,
            address: row.address,
            neighborhood: row.neighborhood ?? null,
            region: row.region ?? null,
            city: 'Rio de Janeiro',
            state: 'RJ',
            active: true,
          },
          user,
        ),
      );
    }
    void this.audit.log({
      userId: user.id,
      entity: 'store',
      action: 'store.quick_add',
      metadata: { created: created.length, skipped: skipped.length },
    });
    return { created, skipped };
  }
}
