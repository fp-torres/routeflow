import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import sharp from 'sharp';
import { PHOTO_CATEGORY_LABEL, type PhotoDto, type PhotoUploadMeta } from '@routeflow/types';
import { APP_CONFIG, type AppConfig } from '../../config/env';
import { DB } from '../../database/database.module';
import type { Db } from '../../database/prisma.types';
import { canSeeAll, type AuthUser } from '../../common/auth-user';
import { detectImageKind, safeFileName, type UploadedFile } from '../../common/uploads';
import { toPhotoDto } from '../../common/visit-mappers';
import { AuditService } from '../audit/audit.service';
import { StorageService } from '../storage/storage.service';

export interface OptimizedImage {
  data: Buffer;
  width: number;
  height: number;
  thumbnail: Buffer;
}

/**
 * Pipeline de fotos: valida tipo real (magic bytes) e tamanho, corrige rotação
 * EXIF, redimensiona, comprime em WebP, gera miniatura e remove metadados
 * (incluindo GPS do EXIF, por privacidade).
 */
export async function optimizePhoto(
  input: Buffer,
  config: AppConfig['files'],
): Promise<OptimizedImage> {
  const pipeline = sharp(input, { failOn: 'error', limitInputPixels: 268_402_689 }).rotate();
  const { data, info } = await pipeline
    .resize({
      width: config.photoMaxDimension,
      height: config.photoMaxDimension,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: config.photoQuality, effort: 4 })
    .toBuffer({ resolveWithObject: true });
  const thumbnail = await sharp(data)
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

@Injectable()
export class PhotosService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  async upload(
    visitId: string,
    files: UploadedFile[],
    meta: PhotoUploadMeta,
    user: AuthUser,
  ): Promise<PhotoDto[]> {
    const visit = await this.db.visit.findUnique({ where: { id: visitId } });
    if (!visit) throw new NotFoundException('Visita não encontrada.');
    if (visit.employeeId !== user.id && !canSeeAll(user))
      throw new NotFoundException('Visita não encontrada.');
    if (visit.status === 'CANCELLED' || visit.status === 'RESCHEDULED')
      throw new ConflictException(
        'Não é possível adicionar fotos a uma visita cancelada ou reagendada.',
      );
    if (!files?.length) throw new BadRequestException('Selecione ao menos uma foto.');
    const originalSizes = (meta.originalSizes ?? '').split(',').map((v) => Number(v));
    const ym = new Date().toISOString().slice(0, 7).replace('-', '/');
    const created: PhotoDto[] = [];
    for (const [index, file] of files.entries()) {
      if (file.size > this.config.files.maxPhotoBytes)
        throw new PayloadTooLargeException('Foto muito grande.');
      const kind = detectImageKind(file.buffer);
      if (!kind)
        throw new UnsupportedMediaTypeException(
          'Formato de imagem não suportado. Envie JPEG, PNG, WebP ou HEIC.',
        );
      let optimized: OptimizedImage;
      try {
        optimized = await optimizePhoto(file.buffer, this.config.files);
      } catch {
        throw new UnsupportedMediaTypeException(
          kind === 'heic'
            ? 'Não foi possível processar a foto HEIC. No iPhone, use Ajustes > Câmera > Formatos > "Mais compatível".'
            : 'Não foi possível processar esta imagem. Tente outra foto.',
        );
      }
      const id = randomUUID();
      const key = `photos/${ym}/${visitId}/${id}.webp`;
      const thumbKey = `photos/${ym}/${visitId}/${id}_thumb.webp`;
      await this.storage.put(key, optimized.data);
      await this.storage.put(thumbKey, optimized.thumbnail);
      const claimed = originalSizes[index];
      const originalSize = Number.isFinite(claimed) && claimed! >= file.size ? claimed! : file.size;
      const photo = await this.db.visitPhoto.create({
        data: {
          id,
          visitId,
          fileUrl: key,
          thumbnailUrl: thumbKey,
          fileName:
            safeFileName(file.originalname, `foto-${id}.webp`).replace(/\.[a-z0-9]+$/i, '') +
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
      created.push(toPhotoDto(photo, this.storage));
    }
    await this.db.visitActivity.create({
      data: {
        visitId,
        userId: user.id,
        type: 'PHOTO',
        description: `${created.length} foto${created.length === 1 ? '' : 's'} adicionada${created.length === 1 ? '' : 's'} (${PHOTO_CATEGORY_LABEL[meta.category]})`,
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

  async remove(visitId: string, photoId: string, user: AuthUser): Promise<void> {
    const photo = await this.db.visitPhoto.findFirst({
      where: { id: photoId, visitId },
      include: { visit: { select: { employeeId: true } } },
    });
    if (!photo || (photo.visit.employeeId !== user.id && !canSeeAll(user)))
      throw new NotFoundException('Foto não encontrada.');
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
}
