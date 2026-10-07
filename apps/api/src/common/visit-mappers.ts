import type { PhotoDto, StoreAuthorizationInfo, VisitSummaryDto } from '@routeflow/types';
import type { Prisma } from '../database/prisma.types';
import type { StorageService } from '../modules/storage/storage.service';
import { toStoreRef } from './mappers';
import { isoDate, isoInstant } from './serialize';

export const visitSummaryInclude = {
  store: true,
  employee: { select: { id: true, name: true } },
  _count: { select: { photos: true } },
} satisfies Prisma.VisitInclude;

export type VisitSummaryRow = Prisma.VisitGetPayload<{ include: typeof visitSummaryInclude }>;

export function toVisitSummary(
  visit: VisitSummaryRow,
  authorization: StoreAuthorizationInfo | null,
): VisitSummaryDto {
  return {
    id: visit.id,
    scheduledDate: isoDate(visit.scheduledDate),
    order: visit.order,
    status: visit.status,
    startedAt: visit.startedAt ? isoInstant(visit.startedAt) : null,
    finishedAt: visit.finishedAt ? isoInstant(visit.finishedAt) : null,
    notes: visit.notes,
    routeId: visit.routeId,
    photoCount: visit._count.photos,
    store: toStoreRef(visit.store),
    employee: visit.employee,
    authorization,
  };
}

type PhotoRow = {
  id: string;
  fileUrl: string;
  thumbnailUrl: string | null;
  fileName: string;
  mimeType: string;
  originalSize: number;
  optimizedSize: number;
  width: number;
  height: number;
  category: PhotoDto['category'];
  caption: string | null;
  createdAt: Date;
};

export function toPhotoDto(photo: PhotoRow, storage: StorageService): PhotoDto {
  return {
    id: photo.id,
    url: storage.signedUrl(photo.fileUrl),
    thumbnailUrl: photo.thumbnailUrl ? storage.signedUrl(photo.thumbnailUrl) : null,
    fileName: photo.fileName,
    mimeType: photo.mimeType,
    originalSize: photo.originalSize,
    optimizedSize: photo.optimizedSize,
    width: photo.width,
    height: photo.height,
    category: photo.category,
    caption: photo.caption,
    createdAt: isoInstant(photo.createdAt),
  };
}
