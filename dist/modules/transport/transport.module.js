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
exports.TransportModule = exports.TransportController = exports.TransportService = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("@routeflow/types");
const env_1 = require("../../config/env");
const database_module_1 = require("../../database/database.module");
const decorators_1 = require("../../common/decorators");
const zod_pipe_1 = require("../../common/zod.pipe");
const audit_service_1 = require("../audit/audit.service");
const geocoding_module_1 = require("../geocoding/geocoding.module");
const geocoding_service_1 = require("../geocoding/geocoding.service");
const fares_service_1 = require("./fares.service");
const providers_1 = require("./providers");
let TransportService = class TransportService {
    constructor(config, fares) {
        this.config = config;
        this.fares = fares;
        const estimate = new providers_1.EstimateRouteProvider(fares);
        this.provider =
            config.routing.provider === 'google'
                ? new providers_1.GoogleRoutesProvider(config.routing.googleApiKey, fares, estimate, config.timeZone)
                : estimate;
    }
    describe() {
        if (this.config.routing.provider === 'google') {
            return this.provider.isConfigured()
                ? {
                    provider: 'google',
                    configured: true,
                    description: 'Google Routes API — itinerários reais de transporte público (ônibus, metrô, trem, VLT e caminhada), com linhas, tempos e otimização por tempo de viagem.',
                }
                : {
                    provider: 'google',
                    configured: false,
                    description: 'Google selecionado, mas GOOGLE_MAPS_API_KEY não foi informada. Usando estimativa local.',
                };
        }
        return {
            provider: 'estimate',
            configured: true,
            description: 'Modelo local de transporte público (caminhada até ~1,2 km; acima disso, caminhada + espera + viagem a 17 km/h). Os botões abrem o trajeto real de transporte público no Google Maps. Para itinerários com linhas e tempos reais no app, configure ROUTE_PROVIDER=google e GOOGLE_MAPS_API_KEY (Routes API).',
        };
    }
    computeLeg(from, to, date) {
        return this.provider.computeLeg(from, to, date);
    }
    computeMatrix(points, date) {
        return this.provider.computeMatrix(points, date);
    }
};
exports.TransportService = TransportService;
exports.TransportService = TransportService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(env_1.APP_CONFIG)),
    __metadata("design:paramtypes", [Object, fares_service_1.FaresService])
], TransportService);
let TransportController = class TransportController {
    constructor(fares, transport, geocoding, audit, db, config) {
        this.fares = fares;
        this.transport = transport;
        this.geocoding = geocoding;
        this.audit = audit;
        this.db = db;
        this.config = config;
    }
    list() {
        return this.fares.list();
    }
    async create(body, user) {
        const fare = await this.fares.create(body);
        void this.audit.log({
            userId: user.id,
            entity: 'transport_fare',
            entityId: fare.id,
            action: 'fare.create',
            metadata: body,
        });
        return fare;
    }
    async update(id, body, user) {
        const fare = await this.fares.update(id, body);
        void this.audit.log({
            userId: user.id,
            entity: 'transport_fare',
            entityId: id,
            action: 'fare.update',
            metadata: body,
        });
        return fare;
    }
    async remove(id, user) {
        await this.fares.remove(id);
        void this.audit.log({
            userId: user.id,
            entity: 'transport_fare',
            entityId: id,
            action: 'fare.delete',
        });
    }
    async providers(user) {
        const [storesWithoutCoordinates, home] = await Promise.all([
            this.db.store.count({
                where: { active: true, OR: [{ latitude: null }, { longitude: null }] },
            }),
            this.db.homeAddress.findFirst({ where: { employeeId: user.id, active: true } }),
        ]);
        return {
            route: this.transport.describe(),
            geocoding: this.geocoding.describe(),
            storage: { driver: this.config.storage.driver },
            storesWithoutCoordinates,
            homeHasCoordinates: home?.latitude != null && home?.longitude != null,
        };
    }
};
exports.TransportController = TransportController;
__decorate([
    (0, common_1.Get)('fares'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], TransportController.prototype, "list", null);
__decorate([
    (0, common_1.Post)('fares'),
    (0, decorators_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Body)(new zod_pipe_1.ZodPipe(types_1.fareSchema))),
    __param(1, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], TransportController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)('fares/:id'),
    (0, decorators_1.Roles)('ADMIN'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)(new zod_pipe_1.ZodPipe(types_1.fareSchema))),
    __param(2, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], TransportController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)('fares/:id'),
    (0, decorators_1.Roles)('ADMIN'),
    (0, common_1.HttpCode)(204),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TransportController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)('providers'),
    __param(0, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TransportController.prototype, "providers", null);
exports.TransportController = TransportController = __decorate([
    (0, common_1.Controller)('transport'),
    __param(4, (0, common_1.Inject)(database_module_1.DB)),
    __param(5, (0, common_1.Inject)(env_1.APP_CONFIG)),
    __metadata("design:paramtypes", [fares_service_1.FaresService,
        TransportService,
        geocoding_service_1.GeocodingService,
        audit_service_1.AuditService, Object, Object])
], TransportController);
let TransportModule = class TransportModule {
};
exports.TransportModule = TransportModule;
exports.TransportModule = TransportModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [geocoding_module_1.GeocodingModule],
        providers: [fares_service_1.FaresService, TransportService],
        controllers: [TransportController],
        exports: [fares_service_1.FaresService, TransportService],
    })
], TransportModule);
//# sourceMappingURL=transport.module.js.map