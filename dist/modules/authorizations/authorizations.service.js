"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthorizationsService = void 0;
const node_crypto_1 = require("node:crypto");
const common_1 = require("@nestjs/common");
const types_1 = require("@routeflow/types");
const env_1 = require("../../config/env");
const database_module_1 = require("../../database/database.module");
const serialize_1 = require("../../common/serialize");
const uploads_1 = require("../../common/uploads");
const text_search_1 = require("../../common/text-search");
const audit_service_1 = require("../audit/audit.service");
const settings_service_1 = require("../settings/settings.service");
const storage_service_1 = require("../storage/storage.service");
const storeSelect = {
    id: true,
    code: true,
    name: true,
    network: true,
    neighborhood: true,
};
const letterInclude = {
    stores: { include: { store: { select: storeSelect } } },
    uploadedBy: { select: { id: true, name: true } },
};
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const byCode = (a, b) => a.code.localeCompare(b.code, 'pt-BR', { numeric: true });
function parseDates(raw) {
    const value = (0, serialize_1.safeJsonParse)(raw, []);
    return Array.isArray(value)
        ? value.filter((d) => typeof d === 'string' && ISO_DATE.test(d)).sort()
        : [];
}
const datesJson = (dates) => dates && dates.length ? JSON.stringify([...new Set(dates)].sort()) : null;
/**
 * Cartas de autorização: uma carta (PDF) pode cobrir várias lojas, com as datas da ação
 * por loja. Lojas de redes que não exigem carta aparecem como "Não exigida".
 */
let AuthorizationsService = class AuthorizationsService {
    constructor(db, config, storage, settings, audit) {
        this.db = db;
        this.config = config;
        this.storage = storage;
        this.settings = settings;
        this.audit = audit;
    }
    today() {
        return (0, types_1.todayIso)(this.config.timeZone);
    }
    async requiredNetworks() {
        return (await this.settings.get()).authorizationRequiredNetworks ?? [];
    }
    toDto(letter, thresholds, today = this.today()) {
        const issueDate = (0, serialize_1.isoDateOrNull)(letter.issueDate);
        const validFrom = (0, serialize_1.isoDateOrNull)(letter.validFrom);
        const expirationDate = (0, serialize_1.isoDateOrNull)(letter.expirationDate);
        const { validity, daysLeft } = (0, types_1.computeLetterValidity)({ status: letter.status, validFrom, expirationDate, deletedAt: letter.deletedAt }, today, thresholds);
        const stores = letter.stores
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
            createdAt: (0, serialize_1.isoInstant)(letter.createdAt),
            updatedAt: (0, serialize_1.isoInstant)(letter.updatedAt),
        };
    }
    /** Situação de autorização de cada loja: exigência (rede/loja) + melhor carta vigente. */
    async summaries(storeIds) {
        const result = new Map();
        const ids = [...new Set(storeIds)];
        if (ids.length === 0)
            return result;
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
        const byStore = new Map();
        for (const c of coverages)
            byStore.set(c.storeId, [...(byStore.get(c.storeId) ?? []), c.letter]);
        for (const store of stores) {
            const letters = byStore.get(store.id) ?? [];
            const summary = letters.length
                ? (0, types_1.summarizeStoreAuthorization)(letters.map((l) => ({
                    status: l.status,
                    validFrom: (0, serialize_1.isoDateOrNull)(l.validFrom),
                    expirationDate: (0, serialize_1.isoDateOrNull)(l.expirationDate),
                })), today, thresholds)
                : null;
            if (!(0, types_1.isAuthorizationRequired)(store, networks)) {
                result.set(store.id, {
                    required: false,
                    validity: 'NOT_REQUIRED',
                    daysLeft: null,
                    hasValid: true,
                    letterCount: letters.length,
                });
            }
            else if (summary) {
                result.set(store.id, {
                    required: true,
                    validity: summary.validity,
                    daysLeft: summary.daysLeft,
                    hasValid: summary.hasValid,
                    letterCount: summary.letterCount,
                });
            }
            else {
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
    async list(query) {
        const provider = this.config.database.provider;
        const and = [{ deletedAt: null }];
        if (query.storeId)
            and.push({ stores: { some: { storeId: query.storeId } } });
        if (query.network) {
            and.push({
                OR: [
                    { network: query.network },
                    { stores: { some: { store: { network: query.network } } } },
                ],
            });
        }
        if (query.search) {
            const term = (0, text_search_1.containsInsensitive)(provider, query.search);
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
            .filter((dto) => query.expiringWithinDays == null ||
            (dto.daysLeft != null && dto.daysLeft <= query.expiringWithinDays));
    }
    async findRow(id) {
        const row = await this.db.authorizationLetter.findFirst({
            where: { id, deletedAt: null },
            include: letterInclude,
        });
        if (!row)
            throw new common_1.NotFoundException('Carta de autorização não encontrada.');
        return row;
    }
    async get(id) {
        return this.toDto(await this.findRow(id), await this.settings.thresholds());
    }
    dateFields(meta) {
        const conv = (v) => v === undefined ? undefined : v === null ? null : (0, types_1.isoToUtcDate)(v);
        return {
            issueDate: conv(meta.issueDate),
            validFrom: conv(meta.validFrom),
            expirationDate: conv(meta.expirationDate),
        };
    }
    parseStoreDates(input) {
        if (!input)
            return {};
        const value = typeof input === 'string' ? (0, serialize_1.safeJsonParse)(input, {}) : input;
        const parsed = types_1.letterStoreDatesSchema.safeParse(value);
        return parsed.success ? parsed.data : {};
    }
    async assertStores(ids, db = this.db) {
        const stores = await db.store.findMany({
            where: { id: { in: ids } },
            select: { id: true, network: true },
        });
        if (stores.length !== ids.length) {
            throw new common_1.NotFoundException('Alguma das lojas selecionadas não foi encontrada.');
        }
        return stores;
    }
    /** Envia uma carta (PDF) cobrindo uma ou mais lojas. */
    async create(meta, file, user, storeId) {
        (0, uploads_1.assertPdf)(file);
        const storeIds = [...new Set([...(meta.storeIds ?? []), ...(storeId ? [storeId] : [])])];
        if (storeIds.length === 0)
            throw new common_1.BadRequestException('Selecione ao menos uma loja coberta pela carta.');
        const stores = await this.assertStores(storeIds);
        const dates = this.parseStoreDates(meta.storeDates);
        const networks = [...new Set(stores.map((s) => s.network))];
        const network = meta.network ?? (networks.length === 1 ? networks[0] : null);
        const key = `authorizations/${(0, node_crypto_1.randomUUID)()}.pdf`;
        await this.storage.put(key, file.buffer);
        const fileName = (0, uploads_1.safeFileName)(file.originalname, 'carta-de-autorizacao.pdf');
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
    async update(id, meta, user) {
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
    async replaceFile(id, file, user) {
        (0, uploads_1.assertPdf)(file);
        const current = await this.findRow(id);
        const key = `authorizations/${(0, node_crypto_1.randomUUID)()}.pdf`;
        await this.storage.put(key, file.buffer);
        const fileName = (0, uploads_1.safeFileName)(file.originalname, current.fileName);
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
    async remove(id, user) {
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
    async removeStore(id, storeId, user) {
        const current = await this.findRow(id);
        const coverage = current.stores.find((s) => s.storeId === storeId);
        if (!coverage)
            throw new common_1.NotFoundException('Esta loja não está na carta.');
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
    async history(id) {
        const exists = await this.db.authorizationLetter.findUnique({
            where: { id },
            select: { id: true },
        });
        if (!exists)
            throw new common_1.NotFoundException('Carta de autorização não encontrada.');
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
            details: (0, serialize_1.safeJsonParse)(row.details, null),
            user: row.user,
            createdAt: (0, serialize_1.isoInstant)(row.createdAt),
        }));
    }
};
exports.AuthorizationsService = AuthorizationsService;
exports.AuthorizationsService = AuthorizationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_module_1.DB)),
    __param(1, (0, common_1.Inject)(env_1.APP_CONFIG)),
    __metadata("design:paramtypes", [Object, Object, storage_service_1.StorageService,
        settings_service_1.SettingsService,
        audit_service_1.AuditService])
], AuthorizationsService);
//# sourceMappingURL=authorizations.service.js.map