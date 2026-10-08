import { createHmac, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import type { Readable } from 'node:stream';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../config/env';

/** Contrato de armazenamento. Hoje: disco local. Futuro: S3 / Cloudflare R2 (mesma interface). */
export interface StorageDriver {
  readonly name: string;
  put(key: string, data: Buffer): Promise<void>;
  read(key: string): Promise<Buffer>;
  stream(key: string): Readable;
  stat(key: string): Promise<{ size: number } | null>;
  delete(key: string): Promise<void>;
}

const KEY_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9/_.-]{0,480}$/;

export function assertValidKey(key: string): void {
  if (
    !KEY_REGEX.test(key) ||
    key.split('/').some((segment) => segment === '..' || segment === '.' || segment === '')
  ) {
    throw new BadRequestException('Chave de arquivo inválida.');
  }
}

export class LocalStorageDriver implements StorageDriver {
  readonly name = 'local';
  constructor(private readonly root: string) {}

  private resolve(key: string): string {
    assertValidKey(key);
    const full = path.resolve(this.root, key);
    if (!full.startsWith(path.resolve(this.root) + path.sep))
      throw new BadRequestException('Chave de arquivo inválida.');
    return full;
  }

  async put(key: string, data: Buffer): Promise<void> {
    const full = this.resolve(key);
    await fsp.mkdir(path.dirname(full), { recursive: true });
    const tmp = `${full}.${process.pid}.${Date.now()}.tmp`;
    await fsp.writeFile(tmp, data);
    await fsp.rename(tmp, full);
  }

  read(key: string): Promise<Buffer> {
    return fsp.readFile(this.resolve(key));
  }

  stream(key: string): Readable {
    return fs.createReadStream(this.resolve(key));
  }

  async stat(key: string): Promise<{ size: number } | null> {
    try {
      const info = await fsp.stat(this.resolve(key));
      return info.isFile() ? { size: info.size } : null;
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    await fsp.rm(this.resolve(key), { force: true });
  }
}

const MIME_BY_EXT: Record<string, string> = {
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.pdf': 'application/pdf',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.json': 'application/json',
};

export interface SignedUrlOptions {
  ttlSeconds?: number;
  download?: boolean;
  fileName?: string;
}

/**
 * Serviço de arquivos desacoplado da regra de negócio: a aplicação guarda
 * apenas CHAVES (ex.: photos/2026/10/<uuid>.webp) e entrega URLs assinadas
 * e temporárias (HMAC-SHA256) — funcionam em <img>, abrem PDFs no celular e
 * não exigem cabeçalho de autenticação.
 */
@Injectable()
export class StorageService {
  readonly driver: StorageDriver;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    this.driver = new LocalStorageDriver(config.storage.path);
  }

  put(key: string, data: Buffer) {
    return this.driver.put(key, data);
  }
  read(key: string) {
    return this.driver.read(key);
  }
  stream(key: string) {
    return this.driver.stream(key);
  }
  stat(key: string) {
    return this.driver.stat(key);
  }
  delete(key: string) {
    return this.driver.delete(key);
  }

  mimeType(key: string): string {
    return MIME_BY_EXT[path.extname(key).toLowerCase()] ?? 'application/octet-stream';
  }

  private signature(key: string, expires: number, download: boolean, fileName: string): string {
    return createHmac('sha256', this.config.files.signingSecret)
      .update(`${key}|${expires}|${download ? 1 : 0}|${fileName}`)
      .digest('base64url');
  }

  /** URL relativa assinada. A expiração é arredondada à hora cheia para permitir cache no navegador. */
  signedUrl(key: string, options: SignedUrlOptions = {}): string {
    const ttl = options.ttlSeconds ?? 6 * 3600;
    const expires = Math.ceil((Date.now() / 1000 + ttl) / 3600) * 3600;
    const download = options.download ?? false;
    const fileName = options.fileName ?? '';
    const params = new URLSearchParams({
      e: String(expires),
      s: this.signature(key, expires, download, fileName),
    });
    if (download) params.set('d', '1');
    if (fileName) params.set('n', fileName);
    return `/api/files/${Buffer.from(key).toString('base64url')}?${params.toString()}`;
  }

  verify(
    encodedKey: string,
    query: Record<string, unknown>,
  ): { key: string; download: boolean; fileName: string; expires: number } | null {
    let key: string;
    try {
      key = Buffer.from(encodedKey, 'base64url').toString('utf8');
      assertValidKey(key);
    } catch {
      return null;
    }
    const expires = Number(query.e);
    const signature = typeof query.s === 'string' ? query.s : '';
    const download = query.d === '1';
    const fileName = typeof query.n === 'string' ? query.n : '';
    if (!Number.isFinite(expires) || expires < Date.now() / 1000) return null;
    const expected = Buffer.from(this.signature(key, expires, download, fileName));
    const received = Buffer.from(signature);
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
    return { key, download, fileName, expires };
  }
}
