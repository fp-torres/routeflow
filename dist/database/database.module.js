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
exports.DatabaseModule = exports.DatabaseLifecycle = exports.DB = void 0;
const common_1 = require("@nestjs/common");
const env_1 = require("../config/env");
const database_factory_1 = require("./database.factory");
exports.DB = Symbol('DB');
let DatabaseLifecycle = class DatabaseLifecycle {
    constructor(db) {
        this.db = db;
        this.logger = new common_1.Logger('Database');
    }
    async onApplicationShutdown() {
        await this.db.$disconnect().catch((error) => this.logger.warn(String(error)));
    }
};
exports.DatabaseLifecycle = DatabaseLifecycle;
exports.DatabaseLifecycle = DatabaseLifecycle = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(exports.DB)),
    __metadata("design:paramtypes", [Object])
], DatabaseLifecycle);
let DatabaseModule = class DatabaseModule {
};
exports.DatabaseModule = DatabaseModule;
exports.DatabaseModule = DatabaseModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [
            {
                provide: exports.DB,
                inject: [env_1.APP_CONFIG],
                useFactory: (config) => (0, database_factory_1.createDatabaseClient)(config.database),
            },
            DatabaseLifecycle,
        ],
        exports: [exports.DB],
    })
], DatabaseModule);
//# sourceMappingURL=database.module.js.map