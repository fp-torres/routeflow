import {
  Controller,
  Get,
  Global,
  Module,
  NotFoundException,
  Param,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { Public } from '../../common/decorators';
import { StorageService } from './storage.service';

@Controller('files')
export class FilesController {
  constructor(private readonly storage: StorageService) {}

  /** Entrega um arquivo mediante URL assinada (fotos, cartas de autorização). */
  @Public()
  @Get(':encoded')
  async get(
    @Param('encoded') encoded: string,
    @Query() query: Record<string, unknown>,
    @Res() res: Response,
  ): Promise<void> {
    const verified = this.storage.verify(encoded, query);
    if (!verified) throw new NotFoundException('Link expirado ou inválido. Atualize a página.');
    const stat = await this.storage.stat(verified.key);
    if (!stat) throw new NotFoundException('Arquivo não encontrado.');
    const name = verified.fileName || verified.key.split('/').pop() || 'arquivo';
    res.setHeader('Content-Type', this.storage.mimeType(verified.key));
    res.setHeader('Content-Length', String(stat.size));
    res.setHeader(
      'Cache-Control',
      `private, max-age=${Math.max(0, Math.floor(verified.expires - Date.now() / 1000))}`,
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader(
      'Content-Disposition',
      `${verified.download ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(name)}`,
    );
    this.storage
      .stream(verified.key)
      .on('error', () => res.destroy())
      .pipe(res);
  }
}

@Global()
@Module({ providers: [StorageService], controllers: [FilesController], exports: [StorageService] })
export class StorageModule {}
