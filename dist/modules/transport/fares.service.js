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
exports.FaresService = void 0;
exports.toFareDto = toFareDto;
const common_1 = require("@nestjs/common");
const types_1 = require("@routeflow/types");
const database_module_1 = require("../../database/database.module");
const serialize_1 = require("../../common/serialize");
const types_2 = require("@routeflow/types");
function toFareDto(row) {
    return {
        id: row.id,
        type: row.type,
        operator: row.operator,
        description: row.description,
        value: (0, serialize_1.money)(row.value),
        effectiveFrom: (0, serialize_1.isoDate)(row.effectiveFrom),
        effectiveUntil: (0, serialize_1.isoDateOrNull)(row.effectiveUntil),
        active: row.active,
        verified: row.verified,
    };
}
let FaresService = class FaresService {
    constructor(db) {
        this.db = db;
    }
    async list() {
        const rows = await this.db.transportFare.findMany({
            orderBy: [{ active: 'desc' }, { type: 'asc' }, { effectiveFrom: 'desc' }],
        });
        return rows.map(toFareDto);
    }
    /** Tarifa vigente de um tipo de transporte em determinada data. */
    async activeFare(type, date) {
        const d = (0, types_1.isoToUtcDate)(date);
        const row = await this.db.transportFare.findFirst({
            where: {
                type,
                active: true,
                effectiveFrom: { lte: d },
                OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: d } }],
            },
            orderBy: { effectiveFrom: 'desc' },
        });
        return row ? toFareDto(row) : null;
    }
    async needsReview() {
        return (await this.db.transportFare.count({ where: { active: true, verified: false } })) > 0;
    }
    async create(input) {
        const data = types_2.fareSchema.parse(input);
        const row = await this.db.transportFare.create({
            data: {
                type: data.type,
                operator: data.operator,
                description: data.description ?? null,
                value: data.value,
                effectiveFrom: (0, types_1.isoToUtcDate)(data.effectiveFrom),
                effectiveUntil: data.effectiveUntil ? (0, types_1.isoToUtcDate)(data.effectiveUntil) : null,
                active: data.active,
                verified: data.verified,
            },
        });
        return toFareDto(row);
    }
    async update(id, input) {
        const data = types_2.fareSchema.parse(input);
        const exists = await this.db.transportFare.findUnique({ where: { id } });
        if (!exists)
            throw new common_1.NotFoundException('Tarifa não encontrada.');
        const row = await this.db.transportFare.update({
            where: { id },
            data: {
                type: data.type,
                operator: data.operator,
                description: data.description ?? null,
                value: data.value,
                effectiveFrom: (0, types_1.isoToUtcDate)(data.effectiveFrom),
                effectiveUntil: data.effectiveUntil ? (0, types_1.isoToUtcDate)(data.effectiveUntil) : null,
                active: data.active,
                verified: data.verified,
            },
        });
        return toFareDto(row);
    }
    async remove(id) {
        await this.db.transportFare.delete({ where: { id } });
    }
};
exports.FaresService = FaresService;
exports.FaresService = FaresService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_module_1.DB)),
    __metadata("design:paramtypes", [Object])
], FaresService);
//# sourceMappingURL=fares.service.js.map