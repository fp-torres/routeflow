import { randomUUID } from 'node:crypto';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  computeLetterValidity,
  isAuthorizationRequired,
  isoToUtcDate,
  letterStoreDatesSchema,
  summarizeStoreAuthorization,
  todayIso,
  type AuthorizationLetterDto,
  type IsoDate,
  type LetterHistoryDto,
  type LetterMetaInput,
  type LetterQuery,
  type LetterStoreDates,
  type LetterStoreDto,
  type LetterUpdateInput,
  type StoreAuthorizationInfo,
  type ValidityThresholds,
} from '@routeflow/types';
import { APP_CONFIG, type AppConfig } from '../../config/env';
import { DB } from '../../database/database.module';
import type { Db, Prisma } from '../../database/prisma.types';
import type { AuthUser } from '../../common/auth-user';
import { isoDateOrNull, isoInstant, safeJsonParse } from '../../common/serialize';
import { assertPdf, safeFileName, type UploadedFile } from '../../common/uploads';
import { containsInsensitive } from '../../common/text-search';
import { AuditService } from '../audit/audit.service';
import { SettingsService } from '../settings/settings.service';
import { StorageService } from '../storage/storage.service';

const storeSelect = {
  id: true,
  code: true,
  name: true,
  network: true,
  neighborhood: true,
} as const;

const letterInclude = {
  stores: { include: { store: { select: storeSelect } } },
  uploadedBy: { select: { id: true, name: true } },
} satisfies Prisma.AuthorizationLetterInclude;

type LetterRow = Prisma.AuthorizationLetterGetPayload<{ include: typeof letterInclude }>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const byCode = (a: { code: string }, b: { code: string }) =>
  a.code.localeCompare(b.code, 'pt-BR', { numeric: true });

function parseDates(raw: string | null): IsoDate[] {
  const value = safeJsonParse<unknown>(raw, []);
  return Array.isArray(value)
    ? value.filter((d): d is string => typeof d === 'string' && ISO_DATE.test(d)).sort()
    : [];
}

const datesJson = (dates: readonly IsoDate[] | undefined) =>
  dates && dates.length ? JSON.stringify([...new Set(dates)].sort()) : null;

/**
 * Cartas de autorização: uma carta (PDF) pode cobrir várias lojas, com as datas da ação
 * por loja. Lojas de redes que não exigem carta aparecem como "Não exigida".
 */
@Injectable()
export class AuthorizationsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly storage: StorageService,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  today(): string {
    return todayIso(this.config.timeZone);
  }

  async requiredNetworks(): Promise<string[]> {
    return (await this.settings.get()).authorizationRequiredNetworks ?? [];
  }

  toDto(
    letter: LetterRow,
    thresholds: ValidityThresholds,
    today = this.today(),
  ): AuthorizationLetterDto {
    const issueDate = isoDateOrNull(letter.issueDate);
    const validFrom = isoDateOrNull(letter.validFrom);
    const expirationDate = isoDateOrNull(letter.expirationDate);
    const { validity, daysLeft } = computeLetterValidity(
      { status: letter.status, validFrom, expirationDate, deletedAt: letter.deletedAt },
      today,
      thresholds,
    );
    const stores: LetterStoreDto[] = letter.stores
      .map((ls) => ({ ...ls.store, dates: parseDates(ls.dates) }))
      .sort(byCode);
    return {
      id: letter.id,
      network: letter.network,
      stores,
      title: letter.title,
      fileName: letter.fileName,
      mimeType: letter.mimeType,
      fileSize: letter.fileSize,
      issueDate,
      validFrom,
      expirationDate,
      status: letter.status,
      notes: letter.notes,
      validity,
      daysLeft,
      url: this.storage.signedUrl(letter.fileUrl, { fileName: letter.fileName }),
      downloadUrl: this.storage.signedUrl(letter.fileUrl, {
        download: true,
        fileName: letter.fileName,
      }),
      uploadedBy: letter.uploadedBy,
      createdAt: isoInstant(letter.createdAt),
      updatedAt: isoInstant(letter.updatedAt),
    };
  }

  /** Situação de autorização de cada loja: exigência (rede/loja) + melhor carta vigente. */
  async summaries(storeIds: string[]): Promise<Map<string, StoreAuthorizationInfo>> {
    const result = new Map<string, StoreAuthorizationInfo>();
    const ids = [...new Set(storeIds)];
    if (ids.length === 0) return result;
    const [stores, coverages, thresholds, networks] = await Promise.all([
      this.db.store.findMany({
        where: { id: { in: ids } },
        select: { id: true, network: true, authorizationRequired: true },
      }),
      this.db.authorizationLetterStore.findMany({
        where: { storeId: { in: ids }, letter: { deletedAt: null } },
        select: {
          storeId: true,
          letter: { select: { status: true, validFrom: true, expirationDate: true } },
        },
      }),
      this.settings.thresholds(),
      this.requiredNetworks(),
    ]);
    const today = this.today();
    const byStore = new Map<string, (typeof coverages)[number]['letter'][]>();
    for (const c of coverages)
      byStore.set(c.storeId, [...(byStore.get(c.storeId) ?? []), c.letter]);
    for (const store of stores) {
      const letters = byStore.get(store.id) ?? [];
      const summary = letters.length
        ? summarizeStoreAuthorization(
            letters.map((l) => ({
              status: l.status,
              validFrom: isoDateOrNull(l.validFrom),
              expirationDate: isoDateOrNull(l.expirationDate),
            })),
            today,
            thresholds,
          )
        : null;
      if (!isAuthorizationRequired(store, networks)) {
        result.set(store.id, {
          required: false,
          validity: 'NOT_REQUIRED',
          daysLeft: null,
          hasValid: true,
          letterCount: letters.length,
        });
      } else if (summary) {
        result.set(store.id, {
          required: true,
          validity: summary.validity,
          daysLeft: summary.daysLeft,
          hasValid: summary.hasValid,
          letterCount: summary.letterCount,
        });
      } else {
        result.set(store.id, {
          required: true,
          validity: null,
          daysLeft: null,
          hasValid: false,
          letterCount: 0,
        });
      }
    }
    return result;
  }

  async list(query: LetterQuery): Promise<AuthorizationLetterDto[]> {
    const provider = this.config.database.provider;
    const and: Prisma.AuthorizationLetterWhereInput[] = [{ deletedAt: null }];
    if (query.storeId) and.push({ stores: { some: { storeId: query.storeId } } });
    if (query.network) {
      and.push({
        OR: [
          { network: query.network },
          { stores: { some: { store: { network: query.network } } } },
        ],
      });
    }
    if (query.search) {
      const term = containsInsensitive(provider, query.search);
      and.push({
        OR: [
          { title: term },
          { network: term },
          { stores: { some: { store: { OR: [{ name: term }, { code: term }] } } } },
        ],
      });
    }
    const [rows, thresholds] = await Promise.all([
      this.db.authorizationLetter.findMany({
        where: { AND: and },
        include: letterInclude,
        orderBy: [{ expirationDate: 'asc' }, { createdAt: 'desc' }],
      }),
      this.settings.thresholds(),
    ]);
    const today = this.today();
    return rows
      .map((row) => this.toDto(row, thresholds, today))
      .filter((dto) => !query.validity || query.validity.includes(dto.validity))
      .filter(
        (dto) =>
          query.expiringWithinDays == null ||
          (dto.daysLeft != null && dto.daysLeft <= query.expiringWithinDays),
      );
  }

  private async findRow(id: string): Promise<LetterRow> {
    const row = await this.db.authorizationLetter.findFirst({
      where: { id, deletedAt: null },
      include: letterInclude,
    });
    if (!row) throw new NotFoundException('Carta de autorização não encontrada.');
    return row;
  }

  async get(id: string): Promise<AuthorizationLetterDto> {
    return this.toDto(await this.findRow(id), await this.settings.thresholds());
  }

  private dateFields(
    meta: Partial<Pick<LetterMetaInput, 'issueDate' | 'validFrom' | 'expirationDate'>>,
  ) {
    const conv = (v: string | null | undefined) =>
      v === undefined ? undefined : v === null ? null : isoToUtcDate(v);
    return {
      issueDate: conv(meta.issueDate),
      validFrom: conv(meta.validFrom),
      expirationDate: conv(meta.expirationDate),
    };
  }

  private parseStoreDates(input: string | LetterStoreDates | undefined): LetterStoreDates {
    if (!input) return {};
    const value = typeof input === 'string' ? safeJsonParse<unknown>(input, {}) : input;
    const parsed = letterStoreDatesSchema.safeParse(value);
    return parsed.success ? parsed.data : {};
  }

  private async assertStores(ids: string[], db: Pick<Db, 'store'> = this.db) {
    const stores = await db.store.findMany({
      where: { id: { in: ids } },
      select: { id: true, network: true },
    });
    if (stores.length !== ids.length) {
      throw new NotFoundException('Alguma das lojas selecionadas não foi encontrada.');
    }
    return stores;
  }

  /** Envia uma carta (PDF) cobrindo uma ou mais lojas. */
  async create(
    meta: LetterMetaInput,
    file: UploadedFile | undefined,
    user: AuthUser,
    storeId?: string,
  ): Promise<AuthorizationLetterDto> {
    assertPdf(file);
    const storeIds = [...new Set([...(meta.storeIds ?? []), ...(storeId ? [storeId] : [])])];
    if (storeIds.length === 0)
      throw new BadRequestException('Selecione ao menos uma loja coberta pela carta.');
    const stores = await this.assertStores(storeIds);
    const dates = this.parseStoreDates(meta.storeDates);
    const networks = [...new Set(stores.map((s) => s.network))];
    const network = meta.network ?? (networks.length === 1 ? networks[0]! : null);
    const key = `authorizations/${randomUUID()}.pdf`;
    await this.storage.put(key, file.buffer);
    const fileName = safeFileName(file.originalname, 'carta-de-autorizacao.pdf');
    const letter = await this.db.authorizationLetter.create({
      data: {
        title: meta.title,
        notes: meta.notes ?? null,
        network,
        ...this.dateFields(meta),
        fileUrl: key,
        fileName,
        mimeType: 'application/pdf',
        fileSize: file.size,
        uploadedById: user.id,
        stores: { create: storeIds.map((id) => ({ storeId: id, dates: datesJson(dates[id]) })) },
        history: {
          create: {
            action: 'CREATED',
            fileUrl: key,
            fileName,
            userId: user.id,
            details: JSON.stringify({
              title: meta.title,
              storeCount: storeIds.length,
              validFrom: meta.validFrom ?? null,
              expirationDate: meta.expirationDate ?? null,
            }),
          },
        },
      },
      include: letterInclude,
    });
    void this.audit.log({
      userId: user.id,
      entity: 'authorization',
      entityId: letter.id,
      action: 'authorization.create',
      metadata: { title: meta.title, storeCount: storeIds.length, network },
    });
    return this.toDto(letter, await this.settings.thresholds());
  }

  async update(
    id: string,
    meta: LetterUpdateInput,
    user: AuthUser,
  ): Promise<AuthorizationLetterDto> {
    const current = await this.findRow(id);
    await this.db.$transaction(async (tx) => {
      if (meta.storeIds) {
        const ids = [...new Set(meta.storeIds)];
        await this.assertStores(ids, tx);
        await tx.authorizationLetterStore.deleteMany({
          where: { letterId: id, storeId: { notIn: ids } },
        });
        const existing = new Set(current.stores.map((s) => s.storeId));
        const toCreate = ids.filter((storeId) => !existing.has(storeId));
        if (toCreate.length) {
          await tx.authorizationLetterStore.createMany({
            data: toCreate.map((storeId) => ({
              letterId: id,
              storeId,
              dates: datesJson(meta.storeDates?.[storeId]),
            })),
          });
        }
      }
      for (const [storeId, list] of Object.entries(meta.storeDates ?? {})) {
        await tx.authorizationLetterStore.updateMany({
          where: { letterId: id, storeId },
          data: { dates: datesJson(list) },
        });
      }
      await tx.authorizationLetter.update({
        where: { id },
        data: {
          ...(meta.title !== undefined ? { title: meta.title } : {}),
          ...(meta.notes !== undefined ? { notes: meta.notes } : {}),
          ...(meta.network !== undefined ? { network: meta.network } : {}),
          ...this.dateFields(meta),
          history: {
            create: {
              action: 'UPDATED',
              userId: user.id,
              details: JSON.stringify({
                ...meta,
                storeIds: meta.storeIds ? `${meta.storeIds.length} loja(s)` : undefined,
                storeDates: undefined,
              }),
            },
          },
        },
      });
    });
    void this.audit.log({
      userId: user.id,
      entity: 'authorization',
      entityId: id,
      action: 'authorization.update',
      metadata: { ...meta, storeDates: undefined },
    });
    return this.get(id);
  }

  /** Substitui o PDF mantendo o arquivo anterior acessível pelo histórico. */
  async replaceFile(
    id: string,
    file: UploadedFile | undefined,
    user: AuthUser,
  ): Promise<AuthorizationLetterDto> {
    assertPdf(file);
    const current = await this.findRow(id);
    const key = `authorizations/${randomUUID()}.pdf`;
    await this.storage.put(key, file.buffer);
    const fileName = safeFileName(file.originalname, current.fileName);
    const letter = await this.db.authorizationLetter.update({
      where: { id },
      data: {
        fileUrl: key,
        fileName,
        fileSize: file.size,
        uploadedById: user.id,
        history: {
          create: {
            action: 'FILE_REPLACED',
            fileUrl: current.fileUrl,
            fileName: current.fileName,
            userId: user.id,
            details: JSON.stringify({ newFileName: fileName }),
          },
        },
      },
      include: letterInclude,
    });
    void this.audit.log({
      userId: user.id,
      entity: 'authorization',
      entityId: id,
      action: 'authorization.replace_file',
    });
    return this.toDto(letter, await this.settings.thresholds());
  }

  /** Exclusão lógica: a carta sai das listagens, mas o histórico e o arquivo permanecem para auditoria. */
  async remove(id: string, user: AuthUser): Promise<void> {
    const current = await this.findRow(id);
    await this.db.authorizationLetter.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: 'REVOKED',
        history: {
          create: {
            action: 'DELETED',
            fileUrl: current.fileUrl,
            fileName: current.fileName,
            userId: user.id,
          },
        },
      },
    });
    void this.audit.log({
      userId: user.id,
      entity: 'authorization',
      entityId: id,
      action: 'authorization.delete',
    });
  }

  async removeStore(
    id: string,
    storeId: string,
    user: AuthUser,
  ): Promise<{ deleted: boolean; letter: AuthorizationLetterDto | null }> {
    const current = await this.findRow(id);
    const coverage = current.stores.find((s) => s.storeId === storeId);
    if (!coverage) throw new NotFoundException('Esta loja não está na carta.');
    if (current.stores.length === 1) {
      await this.remove(id, user);
      return { deleted: true, letter: null };
    }
    await this.db.authorizationLetterStore.delete({ where: { id: coverage.id } });
    await this.db.authorizationLetterHistory.create({
      data: {
        letterId: id,
        action: 'UPDATED',
        userId: user.id,
        details: JSON.stringify({ lojaRemovida: coverage.store.code }),
      },
    });
    void this.audit.log({
      userId: user.id,
      entity: 'authorization',
      entityId: id,
      action: 'authorization.remove_store',
      metadata: { storeId, code: coverage.store.code },
    });
    return { deleted: false, letter: await this.get(id) };
  }

  async history(id: string): Promise<LetterHistoryDto[]> {
    const exists = await this.db.authorizationLetter.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Carta de autorização não encontrada.');
    const rows = await this.db.authorizationLetterHistory.findMany({
      where: { letterId: id },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => ({
      id: row.id,
      action: row.action,
      fileName: row.fileName,
      url: row.fileUrl
        ? this.storage.signedUrl(row.fileUrl, { fileName: row.fileName ?? undefined })
        : null,
      details: safeJsonParse<Record<string, unknown> | null>(row.details, null),
      user: row.user,
      createdAt: isoInstant(row.createdAt),
    }));
  }
}
