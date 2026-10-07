import {
  Global,
  Inject,
  Injectable,
  Logger,
  Module,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../config/env';
import { createDatabaseClient } from './database.factory';
import type { Db } from './prisma.types';

export const DB = Symbol('DB');

@Injectable()
export class DatabaseLifecycle implements OnApplicationShutdown {
  private readonly logger = new Logger('Database');
  constructor(@Inject(DB) private readonly db: Db) {}

  async onApplicationShutdown(): Promise<void> {
    await this.db.$disconnect().catch((error: unknown) => this.logger.warn(String(error)));
  }
}

@Global()
@Module({
  providers: [
    {
      provide: DB,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => createDatabaseClient(config.database),
    },
    DatabaseLifecycle,
  ],
  exports: [DB],
})
export class DatabaseModule {}
