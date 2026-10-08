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
exports.SettingsService = exports.DEFAULT_SETTINGS = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("@routeflow/types");
const settings_defaults_1 = require("./settings.defaults");
Object.defineProperty(exports, "DEFAULT_SETTINGS", { enumerable: true, get: function () { return settings_defaults_1.DEFAULT_SETTINGS; } });
const database_module_1 = require("../../database/database.module");
const serialize_1 = require("../../common/serialize");
const PREFIX = 'settings.';
/** Configurações da operação (tabela company_settings, chave/valor JSON). */
let SettingsService = class SettingsService {
    constructor(db) {
        this.db = db;
        this.cache = null;
    }
    async get() {
        if (this.cache && Date.now() - this.cache.at < 30_000)
            return this.cache.value;
        const rows = await this.db.companySetting.findMany({ where: { key: { startsWith: PREFIX } } });
        const merged = { ...settings_defaults_1.DEFAULT_SETTINGS };
        const shape = types_1.companySettingsSchema.shape;
        for (const row of rows) {
            const field = row.key.slice(PREFIX.length);
            const schema = shape[field];
            if (!schema)
                continue;
            const parsed = schema.safeParse((0, serialize_1.safeJsonParse)(row.value, undefined));
            if (parsed.success)
                merged[field] = parsed.data;
        }
        const value = merged;
        this.cache = { value, at: Date.now() };
        return value;
    }
    async update(input) {
        for (const [field, value] of Object.entries(input)) {
            if (value === undefined)
                continue;
            const key = `${PREFIX}${field}`;
            await this.db.companySetting.upsert({
                where: { key },
                create: { key, value: JSON.stringify(value) },
                update: { value: JSON.stringify(value) },
            });
        }
        this.cache = null;
        return this.get();
    }
    /** Grava os valores padrão que ainda não existem (seed). */
    async ensureDefaults() {
        const existing = new Set((await this.db.companySetting.findMany({
            where: { key: { startsWith: PREFIX } },
            select: { key: true },
        })).map((r) => r.key));
        const missing = Object.entries(settings_defaults_1.DEFAULT_SETTINGS).filter(([field]) => !existing.has(`${PREFIX}${field}`));
        for (const [field, value] of missing) {
            await this.db.companySetting.create({
                data: { key: `${PREFIX}${field}`, value: JSON.stringify(value) },
            });
        }
        this.cache = null;
        return missing.length;
    }
    async getRaw(key) {
        return (await this.db.companySetting.findUnique({ where: { key } }))?.value ?? null;
    }
    async setRaw(key, value) {
        await this.db.companySetting.upsert({
            where: { key },
            create: { key, value },
            update: { value },
        });
    }
    async thresholds() {
        const s = await this.get();
        return { warningDays: s.authorizationWarningDays, criticalDays: s.authorizationCriticalDays };
    }
    async networkRules() {
        const s = await this.get();
        return {
            codeRules: s.networkCodeRules,
            defaultNetworkForNamedStores: s.defaultNetworkForNamedStores,
        };
    }
};
exports.SettingsService = SettingsService;
exports.SettingsService = SettingsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_module_1.DB)),
    __metadata("design:paramtypes", [Object])
], SettingsService);
//# sourceMappingURL=settings.service.js.map