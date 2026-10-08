"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.APP_CONFIG = void 0;
exports.findProjectRoot = findProjectRoot;
exports.loadEnvFiles = loadEnvFiles;
exports.parseDurationSeconds = parseDurationSeconds;
exports.loadConfig = loadConfig;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
const bool = zod_1.z.preprocess((v) => typeof v === 'string' ? ['1', 'true', 'yes', 'sim', 'on'].includes(v.trim().toLowerCase()) : v, zod_1.z.boolean());
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'test', 'production']).default('development'),
    PORT: zod_1.z.coerce.number().int().positive().default(3000),
    HOST: zod_1.z.string().default('0.0.0.0'),
    APP_URL: zod_1.z.url().default('http://localhost:5173'),
    APP_TIMEZONE: zod_1.z.string().default('America/Sao_Paulo'),
    TRUST_PROXY: bool.default(false),
    CORS_ORIGINS: zod_1.z.string().default(''),
    DATABASE_PROVIDER: zod_1.z.enum(['postgresql', 'mysql']).default('postgresql'),
    DATABASE_URL: zod_1.z
        .string({ error: 'DATABASE_URL é obrigatória.' })
        .min(1, 'DATABASE_URL é obrigatória.'),
    DB_POOL_SIZE: zod_1.z.coerce.number().int().min(1).max(50).default(5),
    JWT_SECRET: zod_1.z
        .string({ error: 'JWT_SECRET é obrigatória.' })
        .min(16, 'JWT_SECRET precisa ter ao menos 16 caracteres.'),
    JWT_ACCESS_TTL: zod_1.z.string().default('15m'),
    REFRESH_TOKEN_TTL_DAYS: zod_1.z.coerce.number().int().min(1).max(365).default(30),
    FILES_SIGNING_SECRET: zod_1.z.string().optional(),
    STORAGE_DRIVER: zod_1.z.enum(['local']).default('local'),
    STORAGE_PATH: zod_1.z.string().default('./storage'),
    MAX_PHOTO_SIZE_MB: zod_1.z.coerce.number().positive().max(100).default(15),
    MAX_PDF_SIZE_MB: zod_1.z.coerce.number().positive().max(50).default(10),
    MAX_SPREADSHEET_SIZE_MB: zod_1.z.coerce.number().positive().max(50).default(5),
    PHOTO_MAX_DIMENSION: zod_1.z.coerce.number().int().min(640).max(8000).default(2048),
    PHOTO_QUALITY: zod_1.z.coerce.number().int().min(40).max(100).default(82),
    THUMBNAIL_SIZE: zod_1.z.coerce.number().int().min(120).max(1200).default(480),
    ROUTE_PROVIDER: zod_1.z.enum(['estimate', 'google']).default('estimate'),
    GOOGLE_MAPS_API_KEY: zod_1.z.string().optional(),
    // Coordenadas obtidas automaticamente (OpenStreetMap por padrão; "google" usa GOOGLE_MAPS_API_KEY)
    GEOCODING_PROVIDER: zod_1.z.enum(['none', 'nominatim', 'google']).default('nominatim'),
    // Área de busca (oeste,norte,leste,sul). Padrão: município do Rio de Janeiro. Vazio = sem limite.
    GEOCODING_VIEWBOX: zod_1.z.string().default('-43.80,-22.74,-43.08,-23.09'),
    NOMINATIM_BASE_URL: zod_1.z.url().default('https://nominatim.openstreetmap.org'),
    NOMINATIM_EMAIL: zod_1.z.string().optional(),
    WEB_DIST_PATH: zod_1.z.string().optional(),
    RATE_LIMIT_PER_MINUTE: zod_1.z.coerce.number().int().min(30).max(100000).default(600),
    LOG_LEVEL: zod_1.z.enum(['error', 'warn', 'log', 'debug', 'verbose']).default('log'),
});
exports.APP_CONFIG = Symbol('APP_CONFIG');
/** Raiz do projeto (monorepo ou pacote de release), usada para resolver caminhos relativos. */
function findProjectRoot(start = __dirname) {
    let dir = start;
    for (let i = 0; i < 8; i += 1) {
        const pkg = node_path_1.default.join(dir, 'package.json');
        if (node_fs_1.default.existsSync(pkg)) {
            try {
                const json = JSON.parse(node_fs_1.default.readFileSync(pkg, 'utf8'));
                if (json.workspaces || json.routeflowRelease)
                    return dir;
            }
            catch {
                // ignora package.json inválido
            }
        }
        const parent = node_path_1.default.dirname(dir);
        if (parent === dir)
            break;
        dir = parent;
    }
    return process.cwd();
}
let envLoaded = false;
function loadEnvFiles() {
    if (envLoaded)
        return;
    envLoaded = true;
    const root = findProjectRoot();
    dotenv_1.default.config({ path: [node_path_1.default.join(process.cwd(), '.env'), node_path_1.default.join(root, '.env')], quiet: true });
}
/** "15m" | "1h" | "900" -> segundos */
function parseDurationSeconds(value) {
    const match = /^(\d+)\s*([smhd]?)$/.exec(value.trim());
    if (!match)
        throw new Error(`Duração inválida: ${value} (use 15m, 1h, 3600...)`);
    const unit = match[2] || 's';
    return Number(match[1]) * { s: 1, m: 60, h: 3600, d: 86400 }[unit];
}
function loadConfig(overrides = {}) {
    loadEnvFiles();
    const raw = Object.fromEntries(Object.entries({ ...process.env, ...overrides }).map(([k, v]) => [k, v === '' ? undefined : v]));
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
    const scheme = env.DATABASE_URL.split(':')[0].toLowerCase();
    const expected = env.DATABASE_PROVIDER === 'postgresql' ? ['postgresql', 'postgres'] : ['mysql', 'mariadb'];
    if (!expected.includes(scheme)) {
        throw new Error(`DATABASE_URL (${scheme}://) não corresponde a DATABASE_PROVIDER=${env.DATABASE_PROVIDER}.`);
    }
    const projectRoot = findProjectRoot();
    const resolvePath = (p) => (node_path_1.default.isAbsolute(p) ? p : node_path_1.default.resolve(projectRoot, p));
    const appUrl = env.APP_URL.replace(/\/+$/, '');
    const corsOrigins = Array.from(new Set([
        new URL(appUrl).origin,
        ...env.CORS_ORIGINS.split(',')
            .map((o) => o.trim())
            .filter(Boolean),
    ]));
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
            viewbox: env.GEOCODING_VIEWBOX.trim() || null,
            googleApiKey: env.GOOGLE_MAPS_API_KEY ?? null,
        },
        webDistPath: env.WEB_DIST_PATH ? resolvePath(env.WEB_DIST_PATH) : null,
        logLevel: env.LOG_LEVEL,
        rateLimitPerMinute: env.RATE_LIMIT_PER_MINUTE,
    };
}
//# sourceMappingURL=env.js.map