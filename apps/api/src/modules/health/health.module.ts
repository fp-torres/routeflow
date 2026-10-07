import { Controller, Get, Inject, Module } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { APP_CONFIG, type AppConfig } from '../../config/env';
import { DB } from '../../database/database.module';
import type { Db } from '../../database/prisma.types';
import { Public } from '../../common/decorators';

@Controller()
@SkipThrottle()
export class HealthController {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /** GET /health -> { "status": "ok" } (monitoramento simples / Hostinger) */
  @Public()
  @Get('health')
  health() {
    return { status: 'ok' };
  }

  /** GET /api/health/details -> inclui verificação do banco */
  @Public()
  @Get('health/details')
  async details() {
    let database: 'up' | 'down' = 'up';
    try {
      await this.db.$queryRawUnsafe('SELECT 1');
    } catch {
      database = 'down';
    }
    return {
      status: database === 'up' ? 'ok' : 'degraded',
      database,
      provider: this.config.database.provider,
      version: process.env.npm_package_version ?? '1.0.0',
      uptimeSeconds: Math.round(process.uptime()),
      time: new Date().toISOString(),
    };
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
