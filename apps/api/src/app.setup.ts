import fs from 'node:fs';
import path from 'node:path';
import { Logger, RequestMethod } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/exceptions.filter';
import { requestIdMiddleware } from './common/request-id.middleware';
import type { AppConfig } from './config/env';

/** Localiza o build do frontend: WEB_DIST_PATH, monorepo (apps/web/dist) ou release (public/). */
export function resolveWebDist(config: AppConfig): string | null {
  const candidates = [
    config.webDistPath,
    path.resolve(__dirname, '../../web/dist'),
    path.resolve(__dirname, '../public'),
    path.resolve(config.projectRoot, 'apps/web/dist'),
    path.resolve(config.projectRoot, 'public'),
  ].filter((p): p is string => !!p);
  return candidates.find((dir) => fs.existsSync(path.join(dir, 'index.html'))) ?? null;
}

export function configureApp(app: NestExpressApplication, config: AppConfig): void {
  app.set('trust proxy', config.trustProxy ? 1 : false);
  app.disable('x-powered-by');
  app.use(requestIdMiddleware);
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'default-src': ["'self'"],
          'script-src': ["'self'"],
          'style-src': ["'self'", "'unsafe-inline'"],
          'img-src': ["'self'", 'data:', 'blob:'],
          'font-src': ["'self'", 'data:'],
          'connect-src': ["'self'"],
          'frame-src': ["'self'", 'https://www.openstreetmap.org'],
          'worker-src': ["'self'", 'blob:'],
          'manifest-src': ["'self'"],
          'object-src': ["'none'"],
          'frame-ancestors': ["'self'"],
          'upgrade-insecure-requests': config.isProduction ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'same-origin' },
    }),
  );
  app.use(compression());
  app.use(cookieParser());
  app.enableCors({ origin: config.corsOrigins, credentials: true });
  app.setGlobalPrefix('api', { exclude: [{ path: 'health', method: RequestMethod.GET }] });
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  const webDist = resolveWebDist(config);
  if (!webDist) {
    new Logger('Web').warn(
      'Build do frontend não encontrado: servindo apenas a API (rode npm run build).',
    );
    return;
  }
  const indexHtml = path.join(webDist, 'index.html');
  app.useStaticAssets(webDist, {
    index: false,
    setHeaders: (res, filePath) => {
      const immutable = filePath.includes(`${path.sep}assets${path.sep}`);
      res.setHeader(
        'Cache-Control',
        immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
      );
    },
  });
  // Fallback da SPA: rotas do React (ex.: /visitas/123) recebem o index.html
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (
      (req.method !== 'GET' && req.method !== 'HEAD') ||
      req.path.startsWith('/api') ||
      req.path === '/health' ||
      path.extname(req.path)
    ) {
      next();
      return;
    }
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(indexHtml);
  });
  new Logger('Web').log(`Servindo frontend de ${webDist}`);
}
