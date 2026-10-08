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
exports.StoresService = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("@routeflow/types");
const types_2 = require("@routeflow/types");
const env_1 = require("../../config/env");
const database_module_1 = require("../../database/database.module");
const mappers_1 = require("../../common/mappers");
const serialize_1 = require("../../common/serialize");
const text_search_1 = require("../../common/text-search");
const visit_mappers_1 = require("../../common/visit-mappers");
const audit_service_1 = require("../audit/audit.service");
const authorizations_service_1 = require("../authorizations/authorizations.service");
const geocoding_service_1 = require("../geocoding/geocoding.service");
const settings_service_1 = require("../settings/settings.service");
const storage_service_1 = require("../storage/storage.service");
const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });
let StoresService = class StoresService {
    constructor(db, config, letters, settings, geocoding, storage, audit) {
        this.db = db;
        this.config = config;
        this.letters = letters;
        this.settings = settings;
        this.geocoding = geocoding;
        this.storage = storage;
        this.audit = audit;
    }
    async list(query) {
        const provider = this.config.database.provider;
        const and = [];
        if (query.active !== undefined)
            and.push({ active: query.active });
        if (query.network)
            and.push({ network: query.network });
        if (query.region)
            and.push({ region: query.region });
        if (query.neighborhood)
            and.push({ neighborhood: query.neighborhood });
        if (query.withoutCoordinates)
            and.push({ OR: [{ latitude: null }, { longitude: null }] });
        if (query.search) {
            const c = (0, text_search_1.containsInsensitive)(provider, query.search);
            and.push({ OR: [{ name: c }, { code: c }, { address: c }, { neighborhood: c }] });
        }
        const where = and.length ? { AND: and } : {};
        // Lojas são poucas centenas: ordenação natural (V9 antes de V100) em memória
        const rows = await this.db.store.findMany({ where, take: 5000 });
        rows.sort((a, b) => collator.compare(a.network, b.network) || collator.compare(a.code, b.code));
        const total = rows.length;
        const page = rows.slice((query.page - 1) * query.pageSize, query.page * query.pageSize);
        const auth = await this.letters.summaries(page.map((s) => s.id));
        return (0, serialize_1.paginate)(page.map((s) => (0, mappers_1.toStoreDto)(s, auth.get(s.id) ?? mappers_1.NO_AUTHORIZATION)), total, query.page, query.pageSize);
    }
    async catalog() {
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
        const uniq = (values) => [...new Set(values.filter((v) => !!v))].sort(collator.compare);
        return {
            networks: uniq([...settings.networks, ...networks.map((n) => n.network)]),
            regions: uniq([...settings.regions, ...regions.map((r) => r.region)]),
            neighborhoods: uniq(neighborhoods.map((n) => n.neighborhood)),
        };
    }
    async get(id) {
        const store = await this.db.store.findUnique({ where: { id } });
        if (!store)
            throw new common_1.NotFoundException('Loja não encontrada.');
        const [visits, totalVisits, completedVisits, lastCompleted, photos, letters, auth] = await Promise.all([
            this.db.visit.findMany({
                where: { storeId: id },
                include: visit_mappers_1.visitSummaryInclude,
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
        const authorization = auth.get(id) ?? mappers_1.NO_AUTHORIZATION;
        return {
            ...(0, mappers_1.toStoreDto)(store, authorization),
            stats: {
                totalVisits,
                completedVisits,
                lastVisitDate: (0, serialize_1.isoDateOrNull)(lastCompleted?.scheduledDate),
            },
            recentVisits: visits.map((v) => (0, visit_mappers_1.toVisitSummary)(v, authorization)),
            recentPhotos: photos.map((p) => ({
                ...(0, visit_mappers_1.toPhotoDto)(p, this.storage),
                visitId: p.visit.id,
                scheduledDate: (0, serialize_1.isoDateOrNull)(p.visit.scheduledDate),
            })),
            letters,
        };
    }
    /** Código único: informado pelo usuário (erro se repetido) ou provisório (com sufixo se necessário). */
    async uniqueCode(code, provided, ignoreId) {
        const exists = async (c) => !!(await this.db.store.findFirst({
            where: { code: c, ...(ignoreId ? { NOT: { id: ignoreId } } : {}) },
            select: { id: true },
        }));
        if (!(await exists(code)))
            return code;
        if (provided)
            throw new common_1.ConflictException(`Já existe uma loja com o código ${code}.`);
        for (let i = 2; i < 100; i += 1) {
            const candidate = `${code.slice(0, 36)}-${i}`;
            if (!(await exists(candidate)))
                return candidate;
        }
        throw new common_1.ConflictException('Não foi possível gerar um código único para a loja.');
    }
    async create(input, user) {
        const data = types_2.storeCreateSchema.parse(input);
        const code = await this.uniqueCode(data.code ? (0, types_1.normalizeStoreCode)(data.code) : (0, types_1.generateStoreCode)(data.network, data.name), !!data.code);
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
        return (0, mappers_1.toStoreDto)(store, created.get(store.id) ?? mappers_1.NO_AUTHORIZATION);
    }
    async update(id, input, user) {
        const data = types_2.storeUpdateSchema.parse(input);
        const current = await this.db.store.findUnique({ where: { id } });
        if (!current)
            throw new common_1.NotFoundException('Loja não encontrada.');
        const code = data.code
            ? await this.uniqueCode((0, types_1.normalizeStoreCode)(data.code), true, id)
            : undefined;
        const addressChanged = (data.address && data.address !== current.address) ||
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
        if (coordsProvided || addressChanged)
            await this.geocoding.invalidateRoutesForStore(id);
        void this.audit.log({
            userId: user.id,
            entity: 'store',
            entityId: id,
            action: 'store.update',
            metadata: data,
        });
        const auth = await this.letters.summaries([id]);
        return (0, mappers_1.toStoreDto)(store, auth.get(id) ?? mappers_1.NO_AUTHORIZATION);
    }
    async deactivate(id, user) {
        const exists = await this.db.store.findUnique({ where: { id }, select: { id: true } });
        if (!exists)
            throw new common_1.NotFoundException('Loja não encontrada.');
        await this.db.store.update({ where: { id }, data: { active: false } });
        void this.audit.log({
            userId: user.id,
            entity: 'store',
            entityId: id,
            action: 'store.deactivate',
        });
    }
    async findExisting(row) {
        if (row.code) {
            const byCode = await this.db.store.findUnique({
                where: { code: (0, types_1.normalizeStoreCode)(row.code) },
                select: { id: true },
            });
            if (byCode)
                return byCode.id;
        }
        const sameNetwork = await this.db.store.findMany({
            where: { network: row.network },
            select: { id: true, name: true },
        });
        return sameNetwork.find((s) => (0, types_1.comparableKey)(s.name) === (0, types_1.comparableKey)(row.name))?.id ?? null;
    }
    /** Cadastro rápido (aba "Cadastro Rápido" da planilha): pré-visualização. */
    async quickAddPreview(text, region) {
        const rows = (0, types_1.parseQuickAddText)(text, { rules: await this.settings.networkRules(), region });
        return Promise.all(rows.map(async (row) => ({
            ...row,
            existingStoreId: row.name ? await this.findExisting(row) : null,
        })));
    }
    async quickAddCommit(input, user) {
        const created = [];
        const skipped = [];
        for (const row of input.rows) {
            if (await this.findExisting(row)) {
                skipped.push({ name: row.code ?? row.name, reason: 'Loja já cadastrada' });
                continue;
            }
            created.push(await this.create({
                code: row.code ?? undefined,
                name: row.name,
                network: row.network,
                address: row.address,
                neighborhood: row.neighborhood ?? null,
                region: row.region ?? null,
                city: 'Rio de Janeiro',
                state: 'RJ',
                active: true,
            }, user));
        }
        void this.audit.log({
            userId: user.id,
            entity: 'store',
            action: 'store.quick_add',
            metadata: { created: created.length, skipped: skipped.length },
        });
        return { created, skipped };
    }
};
exports.StoresService = StoresService;
exports.StoresService = StoresService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_module_1.DB)),
    __param(1, (0, common_1.Inject)(env_1.APP_CONFIG)),
    __metadata("design:paramtypes", [Object, Object, authorizations_service_1.AuthorizationsService,
        settings_service_1.SettingsService,
        geocoding_service_1.GeocodingService,
        storage_service_1.StorageService,
        audit_service_1.AuditService])
], StoresService);
//# sourceMappingURL=stores.service.js.map