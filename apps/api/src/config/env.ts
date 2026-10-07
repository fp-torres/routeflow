import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

const bool = z.preprocess(
  (v) =>
    typeof v === 'string' ? ['1', 'true', 'yes', 'sim', 'on'].includes(v.trim().toLowerCase()) : v,
  z.boolean(),
);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  APP_URL: z.url().default('http://localhost:5173'),
  APP_TIMEZONE: z.string().default('America/Sao_Paulo'),
  TRUST_PROXY: bool.default(false),
  CORS_ORIGINS: z.string().default(''),
  DATABASE_PROVIDER: z.enum(['postgresql', 'mysql']).default('postgresql'),
  DATABASE_URL: z
    .string({ error: 'DATABASE_URL é obrigatória.' })
    .min(1, 'DATABASE_URL é obrigatória.'),
  DB_POOL_SIZE: z.coerce.number().int().min(1).max(50).default(5),
  JWT_SECRET: z
    .string({ error: 'JWT_SECRET é obrigatória.' })
    .min(16, 'JWT_SECRET precisa ter ao menos 16 caracteres.'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  FILES_SIGNING_SECRET: z.string().optional(),
  STORAGE_DRIVER: z.enum(['local']).default('local'),
  STORAGE_PATH: z.string().default('./storage'),
  MAX_PHOTO_SIZE_MB: z.coerce.number().positive().max(100).default(15),
  MAX_PDF_SIZE_MB: z.coerce.number().positive().max(50).default(10),
  MAX_SPREADSHEET_SIZE_MB: z.coerce.number().positive().max(50).default(5),
  PHOTO_MAX_DIMENSION: z.coerce.number().int().min(640).max(8000).default(2048),
  PHOTO_QUALITY: z.coerce.number().int().min(40).max(100).default(82),
  THUMBNAIL_SIZE: z.coerce.number().int().min(120).max(1200).default(480),
  ROUTE_PROVIDER: z.enum(['estimate', 'google']).default('estimate'),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  GEOCODING_PROVIDER: z.enum(['none', 'nominatim', 'google']).default('none'),
  NOMINATIM_BASE_URL: z.url().default('https://nominatim.openstreetmap.org'),
  NOMINATIM_EMAIL: z.string().optional(),
  WEB_DIST_PATH: z.string().optional(),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().min(30).max(100000).default(600),
  LOG_LEVEL: z.enum(['error', 'warn', 'log', 'debug', 'verbose']).default('log'),
});

export type DatabaseProvider = 'postgresql' | 'mysql';

export interface AppConfig {
  env: 'development' | 'test' | 'production';
  isProduction: boolean;
  projectRoot: string;
  port: number;
  host: string;
  appUrl: string;
  timeZone: string;
  trustProxy: boolean;
  corsOrigins: string[];
  database: { provider: DatabaseProvider; url: string; poolSize: number };
  auth: { jwtSecret: string; accessTtlSeconds: number; refreshTtlDays: number };
  files: {
    signingSecret: string;
    maxPhotoBytes: number;
    maxPdfBytes: number;
    maxSpreadsheetBytes: number;
    photoMaxDimension: number;
    photoQuality: number;
    thumbnailSize: number;
  };
  storage: { driver: 'local'; path: string };
  routing: { provider: 'estimate' | 'google'; googleApiKey: string | null };
  geocoding: {
    provider: 'none' | 'nominatim' | 'google';
    nominatimBaseUrl: string;
    nominatimEmail: string | null;
    googleApiKey: string | null;
  };
  webDistPath: string | null;
  logLevel: 'error' | 'warn' | 'log' | 'debug' | 'verbose';
  rateLimitPerMinute: number;
}

export const APP_CONFIG = Symbol('APP_CONFIG');

/** Raiz do projeto (monorepo ou pacote de release), usada para resolver caminhos relativos. */
export function findProjectRoot(start: string = __dirname): string {
  let dir = start;
  for (let i = 0; i < 8; i += 1) {
    const pkg = path.join(dir, 'package.json');
    if (fs.existsSync(pkg)) {
      try {
        const json = JSON.parse(fs.readFileSync(pkg, 'utf8')) as {
          workspaces?: unknown;
          routeflowRelease?: boolean;
        };
        if (json.workspaces || json.routeflowRelease) return dir;
      } catch {
        // ignora package.json inválido
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

let envLoaded = false;
export function loadEnvFiles(): void {
  if (envLoaded) return;
  envLoaded = true;
  const root = findProjectRoot();
  dotenv.config({ path: [path.join(process.cwd(), '.env'), path.join(root, '.env')], quiet: true });
}

/** "15m" | "1h" | "900" -> segundos */
export function parseDurationSeconds(value: string): number {
  const match = /^(\d+)\s*([smhd]?)$/.exec(value.trim());
  if (!match) throw new Error(`Duração inválida: ${value} (use 15m, 1h, 3600...)`);
  const unit = match[2] || 's';
  return Number(match[1]) * ({ s: 1, m: 60, h: 3600, d: 86400 } as Record<string, number>)[unit]!;
}

export function loadConfig(overrides: Record<string, string | undefined> = {}): AppConfig {
  loadEnvFiles();
  const raw = Object.fromEntries(
    Object.entries({ ...process.env, ...overrides }).map(([k, v]) => [k, v === '' ? undefined : v]),
  );
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Configuração inválida. Verifique as variáveis de ambiente:\n${details}`);
  }
  const env = parsed.data;
  const isProduction = env.NODE_ENV === 'production';
  if (isProduction && (env.JWT_SECRET.length < 32 || env.JWT_SECRET.startsWith('troque'))) {
    throw new Error('JWT_SECRET de produção precisa ser aleatória e ter ao menos 32 caracteres.');
  }
  const scheme = env.DATABASE_URL.split(':')[0]!.toLowerCase();
  const expected =
    env.DATABASE_PROVIDER === 'postgresql' ? ['postgresql', 'postgres'] : ['mysql', 'mariadb'];
  if (!expected.includes(scheme)) {
    throw new Error(
      `DATABASE_URL (${scheme}://) não corresponde a DATABASE_PROVIDER=${env.DATABASE_PROVIDER}.`,
    );
  }
  const projectRoot = findProjectRoot();
  const resolvePath = (p: string) => (path.isAbsolute(p) ? p : path.resolve(projectRoot, p));
  const appUrl = env.APP_URL.replace(/\/+$/, '');
  const corsOrigins = Array.from(
    new Set([
      new URL(appUrl).origin,
      ...env.CORS_ORIGINS.split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    ]),
  );
  return {
    env: env.NODE_ENV,
    isProduction,
    projectRoot,
    port: env.PORT,
    host: env.HOST,
    appUrl,
    timeZone: env.APP_TIMEZONE,
    trustProxy: env.TRUST_PROXY,
    corsOrigins,
    database: {
      provider: env.DATABASE_PROVIDER,
      url: env.DATABASE_URL,
      poolSize: env.DB_POOL_SIZE,
    },
    auth: {
      jwtSecret: env.JWT_SECRET,
      accessTtlSeconds: parseDurationSeconds(env.JWT_ACCESS_TTL),
      refreshTtlDays: env.REFRESH_TOKEN_TTL_DAYS,
    },
    files: {
      signingSecret: env.FILES_SIGNING_SECRET ?? `${env.JWT_SECRET}:files`,
      maxPhotoBytes: Math.round(env.MAX_PHOTO_SIZE_MB * 1024 * 1024),
      maxPdfBytes: Math.round(env.MAX_PDF_SIZE_MB * 1024 * 1024),
      maxSpreadsheetBytes: Math.round(env.MAX_SPREADSHEET_SIZE_MB * 1024 * 1024),
      photoMaxDimension: env.PHOTO_MAX_DIMENSION,
      photoQuality: env.PHOTO_QUALITY,
      thumbnailSize: env.THUMBNAIL_SIZE,
    },
    storage: { driver: env.STORAGE_DRIVER, path: resolvePath(env.STORAGE_PATH) },
    routing: { provider: env.ROUTE_PROVIDER, googleApiKey: env.GOOGLE_MAPS_API_KEY ?? null },
    geocoding: {
      provider: env.GEOCODING_PROVIDER,
      nominatimBaseUrl: env.NOMINATIM_BASE_URL.replace(/\/+$/, ''),
      nominatimEmail: env.NOMINATIM_EMAIL ?? null,
      googleApiKey: env.GOOGLE_MAPS_API_KEY ?? null,
    },
    webDistPath: env.WEB_DIST_PATH ? resolvePath(env.WEB_DIST_PATH) : null,
    logLevel: env.LOG_LEVEL,
    rateLimitPerMinute: env.RATE_LIMIT_PER_MINUTE,
  };
}
