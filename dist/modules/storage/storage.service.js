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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = exports.LocalStorageDriver = void 0;
exports.assertValidKey = assertValidKey;
const node_crypto_1 = require("node:crypto");
const node_fs_1 = __importDefault(require("node:fs"));
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const common_1 = require("@nestjs/common");
const env_1 = require("../../config/env");
const KEY_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9/_.-]{0,480}$/;
function assertValidKey(key) {
    if (!KEY_REGEX.test(key) ||
        key.split('/').some((segment) => segment === '..' || segment === '.' || segment === '')) {
        throw new common_1.BadRequestException('Chave de arquivo inválida.');
    }
}
class LocalStorageDriver {
    constructor(root) {
        this.root = root;
        this.name = 'local';
    }
    resolve(key) {
        assertValidKey(key);
        const full = node_path_1.default.resolve(this.root, key);
        if (!full.startsWith(node_path_1.default.resolve(this.root) + node_path_1.default.sep))
            throw new common_1.BadRequestException('Chave de arquivo inválida.');
        return full;
    }
    async put(key, data) {
        const full = this.resolve(key);
        await promises_1.default.mkdir(node_path_1.default.dirname(full), { recursive: true });
        const tmp = `${full}.${process.pid}.${Date.now()}.tmp`;
        await promises_1.default.writeFile(tmp, data);
        await promises_1.default.rename(tmp, full);
    }
    read(key) {
        return promises_1.default.readFile(this.resolve(key));
    }
    stream(key) {
        return node_fs_1.default.createReadStream(this.resolve(key));
    }
    async stat(key) {
        try {
            const info = await promises_1.default.stat(this.resolve(key));
            return info.isFile() ? { size: info.size } : null;
        }
        catch {
            return null;
        }
    }
    async delete(key) {
        await promises_1.default.rm(this.resolve(key), { force: true });
    }
}
exports.LocalStorageDriver = LocalStorageDriver;
const MIME_BY_EXT = {
    '.webp': 'image/webp',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.pdf': 'application/pdf',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.json': 'application/json',
};
/**
 * Serviço de arquivos desacoplado da regra de negócio: a aplicação guarda
 * apenas CHAVES (ex.: photos/2026/10/<uuid>.webp) e entrega URLs assinadas
 * e temporárias (HMAC-SHA256) — funcionam em <img>, abrem PDFs no celular e
 * não exigem cabeçalho de autenticação.
 */
let StorageService = class StorageService {
    constructor(config) {
        this.config = config;
        this.driver = new LocalStorageDriver(config.storage.path);
    }
    put(key, data) {
        return this.driver.put(key, data);
    }
    read(key) {
        return this.driver.read(key);
    }
    stream(key) {
        return this.driver.stream(key);
    }
    stat(key) {
        return this.driver.stat(key);
    }
    delete(key) {
        return this.driver.delete(key);
    }
    mimeType(key) {
        return MIME_BY_EXT[node_path_1.default.extname(key).toLowerCase()] ?? 'application/octet-stream';
    }
    signature(key, expires, download, fileName) {
        return (0, node_crypto_1.createHmac)('sha256', this.config.files.signingSecret)
            .update(`${key}|${expires}|${download ? 1 : 0}|${fileName}`)
            .digest('base64url');
    }
    /** URL relativa assinada. A expiração é arredondada à hora cheia para permitir cache no navegador. */
    signedUrl(key, options = {}) {
        const ttl = options.ttlSeconds ?? 6 * 3600;
        const expires = Math.ceil((Date.now() / 1000 + ttl) / 3600) * 3600;
        const download = options.download ?? false;
        const fileName = options.fileName ?? '';
        const params = new URLSearchParams({
            e: String(expires),
            s: this.signature(key, expires, download, fileName),
        });
        if (download)
            params.set('d', '1');
        if (fileName)
            params.set('n', fileName);
        return `/api/files/${Buffer.from(key).toString('base64url')}?${params.toString()}`;
    }
    verify(encodedKey, query) {
        let key;
        try {
            key = Buffer.from(encodedKey, 'base64url').toString('utf8');
            assertValidKey(key);
        }
        catch {
            return null;
        }
        const expires = Number(query.e);
        const signature = typeof query.s === 'string' ? query.s : '';
        const download = query.d === '1';
        const fileName = typeof query.n === 'string' ? query.n : '';
        if (!Number.isFinite(expires) || expires < Date.now() / 1000)
            return null;
        const expected = Buffer.from(this.signature(key, expires, download, fileName));
        const received = Buffer.from(signature);
        if (expected.length !== received.length || !(0, node_crypto_1.timingSafeEqual)(expected, received))
            return null;
        return { key, download, fileName, expires };
    }
};
exports.StorageService = StorageService;
exports.StorageService = StorageService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(env_1.APP_CONFIG)),
    __metadata("design:paramtypes", [Object])
], StorageService);
//# sourceMappingURL=storage.service.js.map