import { randomUUID } from 'node:crypto';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  computeLetterValidity,
  isoToUtcDate,
  summarizeStoreAuthorization,
  todayIso,
  type AuthorizationLetterDto,
  type LetterHistoryDto,
  type LetterMetaInput,
  type LetterQuery,
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

const letterInclude = {
  store: { select: { id: true, code: true, name: true, network: true, neighborhood: true } },
  uploadedBy: { select: { id: true, name: true } },
} satisfies Prisma.AuthorizationLetterInclude;

type LetterRow = Prisma.AuthorizationLetterGetPayload<{ include: typeof letterInclude }>;

/** Cartas de autorização: upload/visualização de PDF, vencimentos e histórico. */
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
    return {
      id: letter.id,
      storeId: letter.storeId,
      store: letter.store,
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

  /** Situação de autorização por loja (melhor carta vigente). */
  async summaries(storeIds: string[]): Promise<Map<string, StoreAuthorizationInfo>> {
    const result = new Map<string, StoreAuthorizationInfo>();
    if (storeIds.length === 0) return result;
    const [letters, thresholds] = await Promise.all([
      this.db.authorizationLetter.findMany({
        where: { storeId: { in: [...new Set(storeIds)] }, deletedAt: null },
        select: { storeId: true, status: true, validFrom: true, expirationDate: true },
      }),
      this.settings.thresholds(),
    ]);
    const today = this.today();
    const byStore = new Map<string, typeof letters>();
    for (const letter of letters)
      byStore.set(letter.storeId, [...(byStore.get(letter.storeId) ?? []), letter]);
    for (const [storeId, list] of byStore) {
      const summary = summarizeStoreAuthorization(
        list.map((l) => ({
          status: l.status,
          validFrom: isoDateOrNull(l.validFrom),
          expirationDate: isoDateOrNull(l.expirationDate),
        })),
        today,
        thresholds,
      );
      if (summary) result.set(storeId, summary);
    }
    return result;
  }

  async list(query: LetterQuery): Promise<AuthorizationLetterDto[]> {
    const provider = this.config.database.provider;
    const where: Prisma.AuthorizationLetterWhereInput = {
      deletedAt: null,
      ...(query.storeId ? { storeId: query.storeId } : {}),
      ...(query.network ? { store: { network: query.network } } : {}),
      ...(query.search
        ? {
            OR: [
              { title: containsInsensitive(provider, query.search) },
              { store: { name: containsInsensitive(provider, query.search) } },
              { store: { code: containsInsensitive(provider, query.search) } },
            ],
          }
        : {}),
    };
    const [rows, thresholds] = await Promise.all([
      this.db.authorizationLetter.findMany({
        where,
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

  private dateFields(meta: Partial<LetterMetaInput>) {
    const conv = (v: string | null | undefined) =>
      v === undefined ? undefined : v === null ? null : isoToUtcDate(v);
    return {
      issueDate: conv(meta.issueDate),
      validFrom: conv(meta.validFrom),
      expirationDate: conv(meta.expirationDate),
    };
  }

  async create(
    storeId: string,
    meta: LetterMetaInput,
    file: UploadedFile | undefined,
    user: AuthUser,
  ): Promise<AuthorizationLetterDto> {
    assertPdf(file);
    const store = await this.db.store.findUnique({ where: { id: storeId } });
    if (!store) throw new NotFoundException('Loja não encontrada.');
    const key = `authorizations/${storeId}/${randomUUID()}.pdf`;
    await this.storage.put(key, file.buffer);
    const fileName = safeFileName(file.originalname, `autorizacao-${store.code}.pdf`);
    const letter = await this.db.authorizationLetter.create({
      data: {
        storeId,
        title: meta.title,
        notes: meta.notes ?? null,
        ...this.dateFields(meta),
        fileUrl: key,
        fileName,
        mimeType: 'application/pdf',
        fileSize: file.size,
        uploadedById: user.id,
        history: {
          create: {
            action: 'CREATED',
            fileUrl: key,
            fileName,
            userId: user.id,
            details: JSON.stringify(meta),
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
      metadata: { storeId, title: meta.title },
    });
    return this.toDto(letter, await this.settings.thresholds());
  }

  async update(
    id: string,
    meta: LetterUpdateInput,
    user: AuthUser,
  ): Promise<AuthorizationLetterDto> {
    await this.findRow(id);
    const letter = await this.db.authorizationLetter.update({
      where: { id },
      data: {
        ...(meta.title !== undefined ? { title: meta.title } : {}),
        ...(meta.notes !== undefined ? { notes: meta.notes } : {}),
        ...this.dateFields(meta),
        history: { create: { action: 'UPDATED', userId: user.id, details: JSON.stringify(meta) } },
      },
      include: letterInclude,
    });
    void this.audit.log({
      userId: user.id,
      entity: 'authorization',
      entityId: id,
      action: 'authorization.update',
      metadata: meta,
    });
    return this.toDto(letter, await this.settings.thresholds());
  }

  /** Substitui o PDF mantendo o arquivo anterior acessível pelo histórico. */
  async replaceFile(
    id: string,
    file: UploadedFile | undefined,
    user: AuthUser,
  ): Promise<AuthorizationLetterDto> {
    assertPdf(file);
    const current = await this.findRow(id);
    const key = `authorizations/${current.storeId}/${randomUUID()}.pdf`;
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
