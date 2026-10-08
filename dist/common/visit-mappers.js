"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.visitSummaryInclude = void 0;
exports.toVisitSummary = toVisitSummary;
exports.toPhotoDto = toPhotoDto;
const mappers_1 = require("./mappers");
const serialize_1 = require("./serialize");
exports.visitSummaryInclude = {
    store: true,
    employee: { select: { id: true, name: true } },
    _count: { select: { photos: true } },
};
function toVisitSummary(visit, authorization) {
    return {
        id: visit.id,
        scheduledDate: (0, serialize_1.isoDate)(visit.scheduledDate),
        order: visit.order,
        status: visit.status,
        startedAt: visit.startedAt ? (0, serialize_1.isoInstant)(visit.startedAt) : null,
        finishedAt: visit.finishedAt ? (0, serialize_1.isoInstant)(visit.finishedAt) : null,
        notes: visit.notes,
        routeId: visit.routeId,
        photoCount: visit._count.photos,
        store: (0, mappers_1.toStoreRef)(visit.store),
        employee: visit.employee,
        authorization,
    };
}
function toPhotoDto(photo, storage) {
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
        createdAt: (0, serialize_1.isoInstant)(photo.createdAt),
    };
}
//# sourceMappingURL=visit-mappers.js.map