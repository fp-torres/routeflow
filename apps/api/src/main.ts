import 'reflect-metadata';
import { Logger, type LogLevel } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { loadConfig, type AppConfig } from './config/env';
import { runStartupTasks } from './startup-tasks';

const LEVELS: Record<AppConfig['logLevel'], LogLevel[]> = {
  error: ['error', 'fatal'],
  warn: ['error', 'fatal', 'warn'],
  log: ['error', 'fatal', 'warn', 'log'],
  debug: ['error', 'fatal', 'warn', 'log', 'debug'],
  verbose: ['error', 'fatal', 'warn', 'log', 'debug', 'verbose'],
};

async function bootstrap(): Promise<void> {
  const config = loadConfig();
  runStartupTasks(config);
  const app = await NestFactory.create<NestExpressApplication>(AppModule.forRoot(config), {
    logger: LEVELS[config.logLevel],
  });
  configureApp(app, config);
  await app.listen(config.port, config.host);
  Logger.log(
    `RouteFlow pronto em ${config.appUrl} (porta ${config.port}, banco ${config.database.provider}, ${config.env})`,
    'Bootstrap',
  );
}

bootstrap().catch((error: unknown) => {
  console.error('Falha ao iniciar o RouteFlow:', error instanceof Error ? error.message : error);
  process.exit(1);
});
