"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectImageKind = detectImageKind;
exports.isPdf = isPdf;
exports.isXlsx = isXlsx;
exports.assertPdf = assertPdf;
exports.safeFileName = safeFileName;
const common_1 = require("@nestjs/common");
/** Identifica o tipo real do arquivo pelos "magic bytes" (não confia no MIME enviado). */
function detectImageKind(buffer) {
    if (buffer.length < 12)
        return null;
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff)
        return 'jpeg';
    if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
        return 'png';
    if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP')
        return 'webp';
    if (buffer.toString('ascii', 4, 8) === 'ftyp') {
        const brand = buffer.toString('ascii', 8, 12);
        if (['avif', 'avis'].includes(brand))
            return 'avif';
        if (['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1', 'heim', 'heis'].includes(brand))
            return 'heic';
    }
    return null;
}
function isPdf(buffer) {
    return buffer.subarray(0, 1024).includes('%PDF-');
}
function isXlsx(buffer) {
    return (buffer.length > 4 &&
        buffer[0] === 0x50 &&
        buffer[1] === 0x4b &&
        buffer[2] === 0x03 &&
        buffer[3] === 0x04);
}
function assertPdf(file) {
    if (!file)
        throw new common_1.UnsupportedMediaTypeException('Selecione um arquivo PDF.');
    if (!isPdf(file.buffer))
        throw new common_1.UnsupportedMediaTypeException('O arquivo enviado não é um PDF válido.');
}
/** Nome de arquivo seguro para exibição/download (remove caracteres de controle). */
/* eslint-disable no-control-regex */
function safeFileName(name, fallback) {
    const cleaned = Buffer.from(name, 'latin1')
        .toString('utf8')
        .normalize('NFC')
        .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-')
        .trim();
    return (cleaned || fallback).slice(0, 200);
}
/* eslint-enable no-control-regex */
//# sourceMappingURL=uploads.js.map