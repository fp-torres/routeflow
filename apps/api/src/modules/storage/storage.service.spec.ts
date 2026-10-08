import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { loadConfig } from '../../config/env';
import { optimizePhoto } from '../visits/photos.service';
import { StorageService } from './storage.service';

describe('StorageService e otimização de fotos', () => {
  const config = loadConfig({
    DATABASE_URL: 'postgresql://x:y@localhost/z',
    JWT_SECRET: 'unit-test-secret-unit-test-secret',
    STORAGE_PATH: path.join(os.tmpdir(), 'rf-unit'),
  });
  const storage = new StorageService(config);

  it('assina e valida URLs temporárias', async () => {
    await storage.put('photos/test/a.webp', Buffer.from('x'));
    const url = storage.signedUrl('photos/test/a.webp', { download: true, fileName: 'foto.webp' });
    const [pathname, search] = url.split('?');
    const query = Object.fromEntries(new URLSearchParams(search));
    expect(storage.verify(pathname!.split('/').pop()!, query)).toMatchObject({
      key: 'photos/test/a.webp',
      download: true,
    });
    expect(storage.verify(pathname!.split('/').pop()!, { ...query, s: 'adulterada' })).toBeNull();
    expect(() => storage.signedUrl('../etc/passwd')).not.toThrow();
    await expect(storage.put('../fora.txt', Buffer.from('x'))).rejects.toThrow();
  });

  it('redimensiona, comprime em WebP e gera miniatura', async () => {
    const original = await sharp({
      create: { width: 4000, height: 3000, channels: 3, background: '#3a6ea5' },
    })
      .jpeg({ quality: 95 })
      .toBuffer();
    const result = await optimizePhoto(original, config.files);
    expect(Math.max(result.width, result.height)).toBe(config.files.photoMaxDimension);
    expect(result.thumbnail.length).toBeLessThan(result.data.length);
    expect((await sharp(result.data).metadata()).format).toBe('webp');
  });
});
