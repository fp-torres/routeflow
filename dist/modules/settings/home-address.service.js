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
exports.HomeAddressService = void 0;
const common_1 = require("@nestjs/common");
const database_module_1 = require("../../database/database.module");
const geocoding_service_1 = require("../geocoding/geocoding.service");
/** Endereço residencial do funcionário: origem e destino final das rotas (Casa -> lojas -> Casa). */
let HomeAddressService = class HomeAddressService {
    constructor(db, geocoding) {
        this.db = db;
        this.geocoding = geocoding;
    }
    async getActive(employeeId) {
        const row = await this.db.homeAddress.findFirst({
            where: { employeeId, active: true },
            orderBy: { createdAt: 'desc' },
        });
        return row
            ? {
                id: row.id,
                address: row.address,
                label: row.label,
                latitude: row.latitude,
                longitude: row.longitude,
                active: row.active,
            }
            : null;
    }
    /** Mantém o histórico: desativa o endereço anterior e cria o novo como ativo. */
    async set(employeeId, input) {
        let latitude = input.latitude ?? null;
        let longitude = input.longitude ?? null;
        if (latitude == null || longitude == null) {
            const result = await this.geocoding.geocode({ address: input.address });
            if (result)
                ({ latitude, longitude } = result);
        }
        const created = await this.db.$transaction(async (tx) => {
            await tx.homeAddress.updateMany({
                where: { employeeId, active: true },
                data: { active: false },
            });
            return tx.homeAddress.create({
                data: {
                    employeeId,
                    address: input.address,
                    label: input.label ?? 'Casa',
                    latitude,
                    longitude,
                    active: true,
                },
            });
        });
        // Rotas futuras ainda não iniciadas passam a sair do novo endereço
        await this.db.route.updateMany({
            where: {
                employeeId,
                status: 'PLANNED',
                date: { gte: new Date(new Date().toISOString().slice(0, 10)) },
            },
            data: {
                startAddress: created.address,
                startLatitude: latitude,
                startLongitude: longitude,
                legsComputedAt: null,
            },
        });
        return {
            id: created.id,
            address: created.address,
            label: created.label,
            latitude,
            longitude,
            active: true,
        };
    }
};
exports.HomeAddressService = HomeAddressService;
exports.HomeAddressService = HomeAddressService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_module_1.DB)),
    __metadata("design:paramtypes", [Object, geocoding_service_1.GeocodingService])
], HomeAddressService);
//# sourceMappingURL=home-address.service.js.map