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
exports.PhotosService = void 0;
exports.optimizePhoto = optimizePhoto;
const node_crypto_1 = require("node:crypto");
const common_1 = require("@nestjs/common");
const sharp_1 = __importDefault(require("sharp"));
const types_1 = require("@routeflow/types");
const env_1 = require("../../config/env");
const database_module_1 = require("../../database/database.module");
const auth_user_1 = require("../../common/auth-user");
const uploads_1 = require("../../common/uploads");
const visit_mappers_1 = require("../../common/visit-mappers");
const audit_service_1 = require("../audit/audit.service");
const storage_service_1 = require("../storage/storage.service");
/**
 * Pipeline de fotos: valida tipo real (magic bytes) e tamanho, corrige rotação
 * EXIF, redimensiona, comprime em WebP, gera miniatura e remove metadados
 * (incluindo GPS do EXIF, por privacidade).
 */
async function optimizePhoto(input, config) {
    const pipeline = (0, sharp_1.default)(input, { failOn: 'error', limitInputPixels: 268_402_689 }).rotate();
    const { data, info } = await pipeline
        .resize({
        width: config.photoMaxDimension,
        height: config.photoMaxDimension,
        fit: 'inside',
        withoutEnlargement: true,
    })
        .webp({ quality: config.photoQuality, effort: 4 })
        .toBuffer({ resolveWithObject: true });
    const thumbnail = await (0, sharp_1.default)(data)
        .resize({
        width: config.thumbnailSize,
        height: config.thumbnailSize,
        fit: 'inside',
        withoutEnlargement: true,
    })
        .webp({ quality: 70 })
        .toBuffer();
    return { data, width: info.width, height: info.height, thumbnail };
}
let PhotosService = class PhotosService {
    constructor(db, config, storage, audit) {
        this.db = db;
        this.config = config;
        this.storage = storage;
        this.audit = audit;
    }
    async upload(visitId, files, meta, user) {
        const visit = await this.db.visit.findUnique({ where: { id: visitId } });
        if (!visit)
            throw new common_1.NotFoundException('Visita não encontrada.');
        if (visit.employeeId !== user.id && !(0, auth_user_1.canSeeAll)(user))
            throw new common_1.NotFoundException('Visita não encontrada.');
        if (visit.status === 'CANCELLED' || visit.status === 'RESCHEDULED')
            throw new common_1.ConflictException('Não é possível adicionar fotos a uma visita cancelada ou reagendada.');
        if (!files?.length)
            throw new common_1.BadRequestException('Selecione ao menos uma foto.');
        const originalSizes = (meta.originalSizes ?? '').split(',').map((v) => Number(v));
        const ym = new Date().toISOString().slice(0, 7).replace('-', '/');
        const created = [];
        for (const [index, file] of files.entries()) {
            if (file.size > this.config.files.maxPhotoBytes)
                throw new common_1.PayloadTooLargeException('Foto muito grande.');
            const kind = (0, uploads_1.detectImageKind)(file.buffer);
            if (!kind)
                throw new common_1.UnsupportedMediaTypeException('Formato de imagem não suportado. Envie JPEG, PNG, WebP ou HEIC.');
            let optimized;
            try {
                optimized = await optimizePhoto(file.buffer, this.config.files);
            }
            catch {
                throw new common_1.UnsupportedMediaTypeException(kind === 'heic'
                    ? 'Não foi possível processar a foto HEIC. No iPhone, use Ajustes > Câmera > Formatos > "Mais compatível".'
                    : 'Não foi possível processar esta imagem. Tente outra foto.');
            }
            const id = (0, node_crypto_1.randomUUID)();
            const key = `photos/${ym}/${visitId}/${id}.webp`;
            const thumbKey = `photos/${ym}/${visitId}/${id}_thumb.webp`;
            await this.storage.put(key, optimized.data);
            await this.storage.put(thumbKey, optimized.thumbnail);
            const claimed = originalSizes[index];
            const originalSize = Number.isFinite(claimed) && claimed >= file.size ? claimed : file.size;
            const photo = await this.db.visitPhoto.create({
                data: {
                    id,
                    visitId,
                    fileUrl: key,
                    thumbnailUrl: thumbKey,
                    fileName: (0, uploads_1.safeFileName)(file.originalname, `foto-${id}.webp`).replace(/\.[a-z0-9]+$/i, '') +
                        '.webp',
                    mimeType: 'image/webp',
                    originalSize,
                    optimizedSize: optimized.data.length,
                    width: optimized.width,
                    height: optimized.height,
                    category: meta.category,
                    caption: meta.caption ?? null,
                },
            });
            created.push((0, visit_mappers_1.toPhotoDto)(photo, this.storage));
        }
        await this.db.visitActivity.create({
            data: {
                visitId,
                userId: user.id,
                type: 'PHOTO',
                description: `${created.length} foto${created.length === 1 ? '' : 's'} adicionada${created.length === 1 ? '' : 's'} (${types_1.PHOTO_CATEGORY_LABEL[meta.category]})`,
            },
        });
        void this.audit.log({
            userId: user.id,
            entity: 'visit_photo',
            entityId: visitId,
            action: 'photo.upload',
            metadata: {
                count: created.length,
                original: created.reduce((a, p) => a + p.originalSize, 0),
                optimized: created.reduce((a, p) => a + p.optimizedSize, 0),
            },
        });
        return created;
    }
    async remove(visitId, photoId, user) {
        const photo = await this.db.visitPhoto.findFirst({
            where: { id: photoId, visitId },
            include: { visit: { select: { employeeId: true } } },
        });
        if (!photo || (photo.visit.employeeId !== user.id && !(0, auth_user_1.canSeeAll)(user)))
            throw new common_1.NotFoundException('Foto não encontrada.');
        await this.db.visitPhoto.delete({ where: { id: photoId } });
        await Promise.all([
            this.storage.delete(photo.fileUrl),
            photo.thumbnailUrl ? this.storage.delete(photo.thumbnailUrl) : Promise.resolve(),
        ]);
        await this.db.visitActivity.create({
            data: { visitId, userId: user.id, type: 'PHOTO', description: 'Foto removida' },
        });
        void this.audit.log({
            userId: user.id,
            entity: 'visit_photo',
            entityId: photoId,
            action: 'photo.delete',
            metadata: { visitId },
        });
    }
};
exports.PhotosService = PhotosService;
exports.PhotosService = PhotosService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(database_module_1.DB)),
    __param(1, (0, common_1.Inject)(env_1.APP_CONFIG)),
    __metadata("design:paramtypes", [Object, Object, storage_service_1.StorageService,
        audit_service_1.AuditService])
], PhotosService);
//# sourceMappingURL=photos.service.js.map