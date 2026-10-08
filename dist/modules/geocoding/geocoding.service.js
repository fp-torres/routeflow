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
exports.GeocodingService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const types_1 = require("@routeflow/types");
const env_1 = require("../../config/env");
const database_module_1 = require("../../database/database.module");
const RETRY_FAILED_AFTER_MS = 7 * 24 * 3600 * 1000;
function parseViewbox(value) {
    if (!value)
        return null;
    const parts = value.split(',').map(Number);
    if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n)))
        return null;
    const [x1, y1, x2, y2] = parts;
    return {
        west: Math.min(x1, x2),
        east: Math.max(x1, x2),
        north: Math.max(y1, y2),
        south: Math.min(y1, y2),
    };
}
/**
 * Geocodificação AUTOMÁTICA de lojas e endereços de casa (latitude/longitude):
 *  - nominatim (padrão): OpenStreetMap, gratuito, 1 consulta por segundo (política de uso);
 *  - google: Geocoding API (GOOGLE_MAPS_API_KEY);
 *  - none: desativado.
 * Roda sozinha alguns segundos após a API iniciar e a cada 6 horas, só para o que está sem
 * coordenadas (endereços não localizados são tentados de novo após 7 dias). A busca fica
 * restrita à área configurada (padrão: município do Rio). Nunca inventa coordenadas.
 */
let GeocodingService = class GeocodingService {
    constructor(config, db) {
        this.config = config;
        this.db = db;
        this.logger = new common_1.Logger('Geocoding');
        this.lastNominatimCall = 0;
        this.running = false;
        this.viewbox = parseViewbox(config.geocoding.viewbox);
    }
    onApplicationBootstrap() {
        if (this.config.env === 'test' || !this.isConfigured())
            return;
        setTimeout(() => void this.autoGeocode(), 15_000).unref();
    }
    async scheduled() {
        if (this.config.env !== 'test' && this.isConfigured())
            await this.autoGeocode();
    }
    isConfigured() {
        const { provider, googleApiKey } = this.config.geocoding;
        return provider === 'nominatim' || (provider === 'google' && !!googleApiKey);
    }
    describe() {
        const configured = this.isConfigured();
        const area = this.viewbox
            ? ' Busca limitada à área configurada (padrão: município do Rio).'
            : '';
        const descriptions = {
            none: 'Desativada. Configure GEOCODING_PROVIDER=nominatim (gratuito) ou google.',
            nominatim: `Automática via OpenStreetMap (gratuito, 1 consulta por segundo).${area}`,
            google: configured
                ? `Automática via Google Geocoding API.${area}`
                : 'Google selecionado, mas GOOGLE_MAPS_API_KEY não foi informada.',
        };
        return {
            provider: this.config.geocoding.provider,
            configured,
            description: descriptions[this.config.geocoding.provider],
        };
    }
    get isRunning() {
        return this.running;
    }
    inside(lat, lng) {
        const v = this.viewbox;
        return !v || (lat <= v.north && lat >= v.south && lng >= v.west && lng <= v.east);
    }
    /** Lança erro em falhas do serviço; retorna null quando o endereço não é encontrado. */
    async lookup(input) {
        const result = this.config.geocoding.provider === 'google'
            ? await this.google(input)
            : await this.nominatim(input);
        if (result && !this.inside(result.latitude, result.longitude))
            return null;
        return result;
    }
    async geocode(input) {
        if (!this.isConfigured())
            return null;
        try {
            return await this.lookup(input);
        }
        catch (error) {
            this.logger.warn(`Falha ao geocodificar "${input.address}": ${String(error)}`);
            return null;
        }
    }
    async nominatimThrottle() {
        const wait = this.lastNominatimCall + 1100 - Date.now();
        if (wait > 0)
            await new Promise((resolve) => setTimeout(resolve, wait));
        this.lastNominatimCall = Date.now();
    }
    async nominatim(input) {
        const base = this.config.geocoding.nominatimBaseUrl;
        const headers = {
            'User-Agent': `RouteFlow/1.0 (${this.config.appUrl}${this.config.geocoding.nominatimEmail ? `; ${this.config.geocoding.nominatimEmail}` : ''})`,
            'Accept-Language': 'pt-BR',
        };
        const street = (0, types_1.normalizeAddressForGeocoding)(input.address);
        const city = input.city || types_1.DEFAULT_CITY;
        const state = input.state || types_1.DEFAULT_STATE;
        const common = { format: 'jsonv2', limit: '1', countrycodes: 'br' };
        const attempts = [
            new URLSearchParams({ ...common, street, city, state, country: 'Brasil' }),
            new URLSearchParams({
                ...common,
                q: (0, types_1.fullAddressForMaps)({ ...input, address: street }, true),
            }),
            // último recurso: só o logradouro (endereços sem número — localização aproximada da rua)
            new URLSearchParams({
                ...common,
                street: street.replace(/,?\s*\d+.*$/, ''),
                city,
                state,
                country: 'Brasil',
            }),
        ];
        for (const params of attempts) {
            if (this.viewbox) {
                const v = this.viewbox;
                params.set('viewbox', `${v.west},${v.north},${v.east},${v.south}`);
                params.set('bounded', '1');
            }
            if (this.config.geocoding.nominatimEmail)
                params.set('email', this.config.geocoding.nominatimEmail);
            await this.nominatimThrottle();
            const response = await fetch(`${base}/search?${params.toString()}`, {
                headers,
                signal: AbortSignal.timeout(10_000),
            });
            if (!response.ok)
                throw new Error(`Nominatim HTTP ${response.status}`);
            const body = (await response.json());
            if (body[0])
                return {
                    latitude: Number(body[0].lat),
                    longitude: Number(body[0].lon),
                    source: 'nominatim',
                };
        }
        return null;
    }
    async google(input) {
        const params = new URLSearchParams({
            address: (0, types_1.fullAddressForMaps)(input, true),
            region: 'br',
            language: 'pt-BR',
            key: this.config.geocoding.googleApiKey,
        });
        if (this.viewbox) {
            const v = this.viewbox;
            params.set('bounds', `${v.south},${v.west}|${v.north},${v.east}`);
        }
        const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`, {
            signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok)
            throw new Error(`Google Geocoding HTTP ${response.status}`);
        const body = (await response.json());
        if (body.status !== 'OK' && body.status !== 'ZERO_RESULTS')
            throw new Error(`Google Geocoding ${body.status}`);
        const location = body.results?.[0]?.geometry.location;
        return location ? { latitude: location.lat, longitude: location.lng, source: 'google' } : null;
    }
    /** Rotas de hoje em diante com a loja voltam a calcular os trechos com a nova localização. */
    async invalidateRoutesForStore(storeId) {
        await this.db.route.updateMany({
            where: {
                date: { gte: (0, types_1.isoToUtcDate)((0, types_1.todayIso)(this.config.timeZone)) },
                stops: { some: { storeId } },
            },
            data: { legsComputedAt: null },
        });
    }
    async geocodeStore(storeId) {
        const store = await this.db.store.findUnique({ where: { id: storeId } });
        if (!store || !this.isConfigured())
            return false;
        let result = null;
        let status = 'NOT_FOUND';
        try {
            result = await this.lookup(store);
            status = result ? 'OK' : 'NOT_FOUND';
        }
        catch (error) {
            status = 'ERROR';
            this.logger.warn(`Falha ao geocodificar ${store.code}: ${String(error)}`);
        }
        const now = new Date();
        await this.db.store.update({
            where: { id: storeId },
            data: result
                ? {
                    latitude: result.latitude,
                    longitude: result.longitude,
                    geocodeSource: result.source,
                    geocodedAt: now,
                    geocodeStatus: 'OK',
                    geocodeAttemptedAt: now,
                }
                : { geocodeStatus: status, geocodeAttemptedAt: now },
        });
        if (result)
            await this.invalidateRoutesForStore(storeId);
        return !!result;
    }
    /** Endereços de casa sem coordenadas (origem/destino das rotas). */
    async geocodeMissingHomes() {
        const homes = await this.db.homeAddress.findMany({ where: { active: true, latitude: null } });
        let updated = 0;
        for (const home of homes) {
            const result = await this.geocode({ address: home.address });
            if (!result)
                continue;
            await this.db.homeAddress.update({
                where: { id: home.id },
                data: { latitude: result.latitude, longitude: result.longitude },
            });
            await this.db.route.updateMany({
                where: {
                    employeeId: home.employeeId,
                    date: { gte: (0, types_1.isoToUtcDate)((0, types_1.todayIso)(this.config.timeZone)) },
                    startAddress: home.address,
                },
                data: {
                    startLatitude: result.latitude,
                    startLongitude: result.longitude,
                    legsComputedAt: null,
                },
            });
            updated += 1;
        }
        return updated;
    }
    /**
     * Geocodifica lojas sem coordenadas (sequencial, respeitando o limite do provedor).
     * No modo automático, endereços que falharam recentemente só são tentados após 7 dias.
     */
    async geocodeMissingStores(onProgress, options = {}) {
        if (this.running || !this.isConfigured())
            return { processed: 0, updated: 0, failed: [] };
        this.running = true;
        const failed = [];
        let updated = 0;
        try {
            const retryBefore = new Date(Date.now() - RETRY_FAILED_AFTER_MS);
            const stores = await this.db.store.findMany({
                where: {
                    active: true,
                    OR: [{ latitude: null }, { longitude: null }],
                    ...(options.auto
                        ? {
                            AND: [
                                {
                                    OR: [{ geocodeAttemptedAt: null }, { geocodeAttemptedAt: { lt: retryBefore } }],
                                },
                            ],
                        }
                        : {}),
                },
                orderBy: { code: 'asc' },
            });
            for (const store of stores) {
                const ok = await this.geocodeStore(store.id);
                if (ok)
                    updated += 1;
                else
                    failed.push(`${store.code} — ${store.address}`);
                onProgress?.(`${ok ? '✔' : '✖'} ${store.code} ${store.address}`);
            }
            return { processed: stores.length, updated, failed };
        }
        finally {
            this.running = false;
        }
    }
    async autoGeocode() {
        try {
            const homes = await this.geocodeMissingHomes();
            const result = await this.geocodeMissingStores(undefined, { auto: true });
            if (result.processed || homes) {
                this.logger.log(`Geocodificação automática: ${result.updated}/${result.processed} loja(s) e ${homes} endereço(s) de casa localizados.`);
            }
        }
        catch (error) {
            this.logger.warn(`Geocodificação automática interrompida: ${String(error)}`);
        }
    }
    startBackgroundGeocoding() {
        if (this.running || !this.isConfigured())
            return { started: false };
        void this.geocodeMissingHomes()
            .then(() => this.geocodeMissingStores())
            .then((result) => this.logger.log(`Geocodificação concluída: ${result.updated}/${result.processed} lojas atualizadas.`));
        return { started: true };
    }
};
exports.GeocodingService = GeocodingService;
__decorate([
    (0, schedule_1.Cron)('0 */6 * * *', { name: 'routeflow-geocoding' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], GeocodingService.prototype, "scheduled", null);
exports.GeocodingService = GeocodingService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(env_1.APP_CONFIG)),
    __param(1, (0, common_1.Inject)(database_module_1.DB)),
    __metadata("design:paramtypes", [Object, Object])
], GeocodingService);
//# sourceMappingURL=geocoding.service.js.map